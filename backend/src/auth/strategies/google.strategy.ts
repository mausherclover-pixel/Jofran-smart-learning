import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

export interface OAuthProfile {
  provider: 'GOOGLE' | 'MICROSOFT';
  providerId: string;
  email?: string;
  fullName: string;
}

// Deliberately not `passport-google-oauth20`'s own `VerifyCallback` — that
// type pins its `user` parameter to the global `Express.User`, which this
// app defines as `AuthContext` (architecture §07's JWT claims shape). An
// OAuthProfile is a different, transient shape that only exists for the
// few lines between "Google confirmed this identity" and
// AuthService.loginWithOAuth turning it into real tokens — it never becomes
// `req.user` for a guarded route, so it has no business going through the
// same type.
type OAuthDone = (err: unknown, profile?: OAuthProfile) => void;

// Covers schools already on Google Workspace for Education — the identity
// this resolves to is linked via UserIdentity, never a second User row.
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    // passport-oauth2 throws synchronously in its constructor if clientID is
    // empty, which would crash Nest's bootstrap for any deployment that
    // hasn't configured Google OAuth yet. Falling back to a placeholder lets
    // the app boot; GoogleStrategy.validate() simply never fires until real
    // credentials are set, and /auth/google fails at Google, not at startup.
    super({
      clientID: config.get<string>('auth.google.clientId') || 'not-configured',
      clientSecret: config.get<string>('auth.google.clientSecret') || 'not-configured',
      callbackURL: config.get<string>('auth.google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: OAuthDone) {
    const oauthProfile: OAuthProfile = {
      provider: 'GOOGLE',
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      fullName: profile.displayName,
    };
    done(null, oauthProfile);
  }
}
