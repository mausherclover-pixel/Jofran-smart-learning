import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthContext } from '../../common/types/auth-context';
import { AccessTokenClaims } from '../token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('auth.accessSecret')!,
    });
  }

  // Return value becomes req.user — exactly the AuthContext shape every
  // guard and service reads.
  async validate(claims: AccessTokenClaims): Promise<AuthContext> {
    return {
      userId: claims.sub,
      role: claims.role,
      schoolId: claims.schoolId,
      classIds: claims.classIds ?? [],
      studentIds: claims.studentIds ?? [],
    };
  }
}
