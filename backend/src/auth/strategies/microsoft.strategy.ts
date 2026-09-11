import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
// @ts-expect-error — passport-microsoft ships no first-party types.
import { Strategy } from 'passport-microsoft';
import { OAuthProfile } from './google.strategy';

// Covers schools on Microsoft 365 for Education — same UserIdentity linking
// path as GoogleStrategy, one provider column apart.
@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(config: ConfigService) {
    // See GoogleStrategy's constructor comment — same fallback, same reason.
    super({
      clientID: config.get<string>('auth.microsoft.clientId') || 'not-configured',
      clientSecret: config.get<string>('auth.microsoft.clientSecret') || 'not-configured',
      callbackURL: config.get<string>('auth.microsoft.callbackUrl'),
      scope: ['user.read'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: any, done: (err: unknown, profile?: OAuthProfile) => void) {
    const oauthProfile: OAuthProfile = {
      provider: 'MICROSOFT',
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? profile._json?.mail,
      fullName: profile.displayName,
    };
    done(null, oauthProfile);
  }
}
