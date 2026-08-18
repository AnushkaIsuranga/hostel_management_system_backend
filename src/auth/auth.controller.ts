import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

import { UserRole } from '../common/enums/app.enums';
import { AppConfigService } from '../config/app-config.service';
import { UserRegisterDto } from '../users/dto/users.dto';
import { AuthTokensResponseDto, LoginRequestDto } from './dto/auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: AppConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokensResponseDto> {
    const result = await this.authService.login(dto);
    this.writeRefreshCookie(response, result.refreshToken, result.refreshTokenExpiresAt, result.response.role === UserRole.Admin);
    return result.response;
  }

  @Post('register')
  async register(
    @Body() dto: UserRegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokensResponseDto> {
    const result = await this.authService.register(dto);
    this.writeRefreshCookie(response, result.refreshToken, result.refreshTokenExpiresAt, false);
    response.status(HttpStatus.CREATED);
    return result.response;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokensResponseDto> {
    const refreshToken = request.cookies?.[this.configService.refreshCookieName];
    const result = await this.authService.refresh(refreshToken);
    this.writeRefreshCookie(response, result.refreshToken, result.refreshTokenExpiresAt, result.response.role === UserRole.Admin);
    return result.response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[this.configService.refreshCookieName];
    await this.authService.logout(refreshToken);
    response.clearCookie(this.configService.refreshCookieName);
    response.status(HttpStatus.NO_CONTENT);
  }

  private writeRefreshCookie(response: Response, token: string, expiresAt: Date, sessionOnly: boolean) {
    response.cookie(this.configService.refreshCookieName, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.configService.nodeEnv === 'production',
      ...(sessionOnly ? {} : { expires: expiresAt }),
    });
  }
}
