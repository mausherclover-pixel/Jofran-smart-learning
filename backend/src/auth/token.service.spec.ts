import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { TokenService } from './token.service';

// Refresh-token rotation with reuse detection is the single most
// security-critical piece of logic in the app (architecture §07): if a
// stolen, already-used refresh token is ever accepted instead of revoking
// the session, an attacker gets a silent, permanent foothold. This suite
// exists to make that regression impossible to ship unnoticed.

const CONFIG_VALUES: Record<string, string> = {
  'auth.accessSecret': 'test-access-secret',
  'auth.accessTtl': '15m',
  'auth.refreshSecret': 'test-refresh-secret',
  'auth.refreshTtl': '30d',
};

function buildJwtMock() {
  // Real signing/verification is @nestjs/jwt's job, already covered by its
  // own test suite — what TokenService owns is the rotation logic around
  // it, so this fake just needs sign()/verify() to round-trip a payload.
  return {
    sign: jest.fn((payload: unknown) => Buffer.from(JSON.stringify(payload)).toString('base64')),
    verify: jest.fn((token: string) => JSON.parse(Buffer.from(token, 'base64').toString())),
  } as unknown as JwtService;
}

function buildConfigMock() {
  return { get: jest.fn((key: string) => CONFIG_VALUES[key]) } as unknown as ConfigService;
}

function buildPrismaMock() {
  return {
    refreshToken: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService;
}

describe('TokenService', () => {
  let jwt: ReturnType<typeof buildJwtMock>;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: TokenService;

  beforeEach(() => {
    jwt = buildJwtMock();
    prisma = buildPrismaMock();
    service = new TokenService(jwt, buildConfigMock(), prisma);
  });

  describe('issueRefreshToken', () => {
    it('starts a fresh rotation family and persists the token hash, not the raw token', async () => {
      const token = await service.issueRefreshToken('user-1', { ip: '1.2.3.4' });

      expect(token).toEqual(expect.any(String));
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      const createArgs = (prisma.refreshToken.create as jest.Mock).mock.calls[0][0];
      expect(createArgs.data.userId).toBe('user-1');
      expect(createArgs.data.tokenHash).not.toBe(token); // never store the raw token
      expect(createArgs.data.ip).toBe('1.2.3.4');
    });
  });

  describe('rotateRefreshToken — the happy path', () => {
    it('rotates: revokes the old token and issues a new one in the same family', async () => {
      const rawToken = jwt.sign({ sub: 'user-1', familyId: 'family-a', jti: 'jti-1' });
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'stored-1',
        userId: 'user-1',
        familyId: 'family-a',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1_000_000),
      });

      const result = await service.rotateRefreshToken(rawToken, {});

      expect(result.userId).toBe('user-1');
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.refreshToken).not.toBe(rawToken); // a genuinely new token, not the same one handed back

      // The presented token is marked revoked and points at its replacement.
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'stored-1' },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
      // The new token was issued into the SAME family, not a new one.
      const createArgs = (prisma.refreshToken.create as jest.Mock).mock.calls[0][0];
      expect(createArgs.data.familyId).toBe('family-a');
    });
  });

  describe('rotateRefreshToken — reuse detection', () => {
    it('revokes the ENTIRE family and throws when an already-revoked token is presented again', async () => {
      const rawToken = jwt.sign({ sub: 'user-1', familyId: 'family-a', jti: 'jti-1' });
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'stored-1',
        userId: 'user-1',
        familyId: 'family-a',
        revokedAt: new Date(), // already used once — this presentation is a replay
        expiresAt: new Date(Date.now() + 1_000_000),
      });

      await expect(service.rotateRefreshToken(rawToken, {})).rejects.toThrow(/reuse detected/i);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-a', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      // Reuse must never issue a new token — no create() call on this path.
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  describe('rotateRefreshToken — invalid or expired', () => {
    it('throws when the token hash has no matching row (never issued, or database was reset)', async () => {
      const rawToken = jwt.sign({ sub: 'user-1', familyId: 'family-a', jti: 'jti-1' });
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.rotateRefreshToken(rawToken, {})).rejects.toThrow(/invalid or expired/i);
    });

    it('throws when the stored token is past its expiresAt, even if never revoked', async () => {
      const rawToken = jwt.sign({ sub: 'user-1', familyId: 'family-a', jti: 'jti-1' });
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'stored-1',
        userId: 'user-1',
        familyId: 'family-a',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1_000), // already expired
      });

      await expect(service.rotateRefreshToken(rawToken, {})).rejects.toThrow(/invalid or expired/i);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  describe('revokeFamily', () => {
    it('revokes every non-revoked token in the family on logout', async () => {
      const rawToken = jwt.sign({ sub: 'user-1', familyId: 'family-a', jti: 'jti-1' });

      await service.revokeFamily(rawToken);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-a', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('swallows a malformed/expired token instead of throwing — logout must never fail because the cookie is already stale', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(service.revokeFamily('not-a-real-token')).resolves.toBeUndefined();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
