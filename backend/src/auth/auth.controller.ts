import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OAuthProfile } from './strategies/google.strategy';

// POST /v1/auth/login and /v1/auth/refresh are the two endpoints the
// architecture §07 sequence diagram walks through; the OAuth routes are the
// same flow with Google/Microsoft standing in for the password check.
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // tighter than the global default — architecture §15
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto.identifier, dto.password, this.requestMeta(req));
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieName = this.config.get<string>('auth.refreshCookieName')!;
    const raw = req.cookies?.[cookieName];
    if (!raw) throw new UnauthorizedException('No refresh session');

    try {
      const tokens = await this.auth.refresh(raw, this.requestMeta(req));
      this.setRefreshCookie(res, tokens.refreshToken);
      return { accessToken: tokens.accessToken };
    } catch (err) {
      res.clearCookie(cookieName);
      throw new UnauthorizedException((err as Error).message);
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieName = this.config.get<string>('auth.refreshCookieName')!;
    const raw = req.cookies?.[cookieName];
    if (raw) await this.auth.logout(raw);
    res.clearCookie(cookieName);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport redirects to Google; nothing to do here.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.loginWithOAuth(req.user as unknown as OAuthProfile, this.requestMeta(req));
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  microsoftLogin() {}

  @Public()
  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.loginWithOAuth(req.user as unknown as OAuthProfile, this.requestMeta(req));
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(this.config.get<string>('auth.refreshCookieName')!, token, {
      httpOnly: true,
      secure: this.config.get<string>('env') === 'production',
      sameSite: 'lax',
      path: '/v1/auth',
    });
  }

  private requestMeta(req: Request) {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }
}
