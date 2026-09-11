import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthProvider } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { TokenService } from './token.service';
import { buildAccessClaims } from './scope-claims.util';
import { OAuthProfile } from './strategies/google.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  /** Password login. `identifier` is a username (students) or email (staff/parents). */
  async login(identifier: string, password: string, meta: RequestMeta): Promise<TokenPair> {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }], isActive: true },
    });

    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
      // Same error whether the account doesn't exist or the password is
      // wrong — never let a login form fingerprint valid usernames.
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokenPair(user.id, user.role, user.schoolId, meta);
  }

  /** Finds or creates a user from a verified Google/Microsoft profile, then issues tokens. */
  async loginWithOAuth(profile: OAuthProfile, meta: RequestMeta): Promise<TokenPair> {
    const provider = profile.provider as AuthProvider;

    const identity = await this.prisma.userIdentity.findUnique({
      where: { provider_providerId: { provider, providerId: profile.providerId } },
      include: { user: true },
    });

    let user = identity?.user;

    if (!user && profile.email) {
      // Same email, first time with this provider — link rather than duplicate.
      const existing = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (existing) {
        await this.prisma.userIdentity.create({
          data: { userId: existing.id, provider, providerId: profile.providerId, email: profile.email },
        });
        user = existing;
      }
    }

    if (!user) {
      throw new UnauthorizedException(
        'No Jofran account is linked to this sign-in yet — ask your school administrator to invite you.',
      );
    }

    return this.issueTokenPair(user.id, user.role, user.schoolId, meta);
  }

  async refresh(rawRefreshToken: string, meta: RequestMeta): Promise<TokenPair> {
    const { userId, refreshToken } = await this.tokens.rotateRefreshToken(rawRefreshToken, meta);

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const claims = await buildAccessClaims(this.prisma, user);

    return { accessToken: this.tokens.signAccessToken(claims), refreshToken };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    await this.tokens.revokeFamily(rawRefreshToken);
  }

  private async issueTokenPair(
    userId: string,
    role: string,
    schoolId: string | null,
    meta: RequestMeta,
  ): Promise<TokenPair> {
    const claims = await buildAccessClaims(this.prisma, { id: userId, role, schoolId });
    const accessToken = this.tokens.signAccessToken(claims);
    const refreshToken = await this.tokens.issueRefreshToken(userId, meta);
    return { accessToken, refreshToken };
  }
}
