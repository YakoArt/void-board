import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { parseTtlToMs } from '../common/utils/parse-ttl.js';
import { AuthService } from './auth.service.js';
import { Public } from './decorators/public.decorator.js';
import type {
  AuthResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const REFRESH_COOKIE_NAME = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken);

    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.refreshToken);

    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponseDto> {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
    const result = await this.authService.refresh(refreshToken ?? '');
    this.setRefreshCookie(res, result.refreshToken);

    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      path: '/api/auth',
    });
  }

  private setRefreshCookie(res: Response, token: string): void {
    const secure = this.configService.get<string>('COOKIE_SECURE') === 'true';
    const refreshTtl = this.configService.getOrThrow<string>('JWT_REFRESH_TTL');

    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: parseTtlToMs(refreshTtl),
    });
  }
}
