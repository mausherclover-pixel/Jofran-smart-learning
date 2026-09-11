import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../common/prisma/prisma.service';

export interface AccessTokenClaims {
  sub: string;
  role: Role;
  schoolId: string | null;
  classIds: string[];
  studentIds: string[];
}

interface RefreshClaims {
  sub: string;
  familyId: string;
  jti: string;
}

// Everything about the auth §07 sequence diagram that isn't "call passport"
// lives here: issuing the access/refresh pair, and rotating the refresh
// token with reuse detection on every use.
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(claims: AccessTokenClaims): string {
    return this.jwt.sign(claims, {
      secret: this.config.get<string>('auth.accessSecret'),
      expiresIn: this.config.get<string>('auth.accessTtl'),
    });
  }

  /** Issues a new refresh token, starting a fresh rotation family. */
  async issueRefreshToken(userId: string, meta: { ip?: string; userAgent?: string }): Promise<string> {
    return this.rotateOrIssue(userId, randomUUID(), meta);
  }

  /**
   * Verifies a presented refresh token, detects reuse, and rotates it.
   * Throws if the token is invalid, expired, or already-used (in which case
   * the entire token family is revoked — see architecture §07).
   */
  async rotateRefreshToken(
    rawToken: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ userId: string; refreshToken: string }> {
    const claims = this.jwt.verify<RefreshClaims>(rawToken, {
      secret: this.config.get<string>('auth.refreshSecret'),
    });

    const tokenHash = this.hash(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.expiresAt < new Date()) {
      throw new Error('Refresh token invalid or expired');
    }

    if (stored.revokedAt) {
      // A previously-used token was presented again — the family is
      // compromised (stolen + replayed). Revoke every token in it.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new Error('Refresh token reuse detected — session revoked');
    }

    const newToken = await this.rotateOrIssue(stored.userId, stored.familyId, meta);

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedBy: this.hash(newToken) },
    });

    return { userId: stored.userId, refreshToken: newToken };
  }

  async revokeFamily(rawToken: string): Promise<void> {
    try {
      const claims = this.jwt.verify<RefreshClaims>(rawToken, {
        secret: this.config.get<string>('auth.refreshSecret'),
      });
      await this.prisma.refreshToken.updateMany({
        where: { familyId: claims.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Already invalid/expired — nothing to revoke.
    }
  }

  private async rotateOrIssue(
    userId: string,
    familyId: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<string> {
    const jti = randomUUID();
    const ttl = this.config.get<string>('auth.refreshTtl')!;
    const token = this.jwt.sign(
      { sub: userId, familyId, jti } satisfies RefreshClaims,
      { secret: this.config.get<string>('auth.refreshSecret'), expiresIn: ttl },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: this.hash(token),
        expiresAt: new Date(Date.now() + this.ttlToMs(ttl)),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return token;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private ttlToMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30d
    const value = parseInt(match[1], 10);
    const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]!;
    return value * unit;
  }
}
