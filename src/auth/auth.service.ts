import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';

import {
  AppBadRequestException,
  AppConflictException,
  AppUnauthorizedException,
} from '../common/exceptions/app-exception';
import { tryParseUserRole, UserRole, userRoleToName } from '../common/enums/app.enums';
import { AppConfigService } from '../config/app-config.service';
import { DatabaseService } from '../database/database.service';
import { UserRecord } from '../database/database.schemas';
import { UserRegisterDto } from '../users/dto/users.dto';
import { AuthTokenIssueResult, LoginRequestDto } from './dto/auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
  ) {}

  async login(dto: LoginRequestDto): Promise<AuthTokenIssueResult> {
    const user = await this.db.user.findFirst({
      where: {
        email: dto.email,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new AppUnauthorizedException('Invalid email or password.');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new AppUnauthorizedException('Invalid email or password.');
    }

    await this.db.user.update({
      where: { id: user.id },
      data: { lastActivityAt: new Date() },
    });

    const rememberMe = user.role === UserRole.Admin ? false : Boolean(dto.rememberMe);
    return this.issueTokens(user, rememberMe);
  }

  async refresh(refreshToken: string): Promise<AuthTokenIssueResult> {
    if (!refreshToken?.trim()) {
      throw new AppUnauthorizedException('Refresh token is missing.');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);
    const tokenEntity = await this.db.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenEntity || tokenEntity.revoked || tokenEntity.expiresAt <= new Date() || tokenEntity.user.isDeleted) {
      throw new AppUnauthorizedException('Session expired. Please log in again.');
    }

    if (tokenEntity.user.role === UserRole.Admin) {
      const idleTimeoutMs = this.configService.adminIdleTimeoutMinutes * 60_000;
      const idleDuration = Date.now() - tokenEntity.user.lastActivityAt.getTime();
      if (idleDuration > idleTimeoutMs) {
        await this.db.refreshToken.update({
          where: { id: tokenEntity.id },
          data: { revoked: true },
        });
        throw new AppUnauthorizedException('Session expired due to inactivity. Please log in again.');
      }
    }

    await this.db.refreshToken.update({
      where: { id: tokenEntity.id },
      data: { revoked: true },
    });

    return this.issueTokens(tokenEntity.user, tokenEntity.rememberMe);
  }

  async logout(refreshToken?: string | null) {
    if (!refreshToken?.trim()) {
      return;
    }

    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.db.refreshToken.updateMany({
      where: {
        tokenHash,
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });
  }

  async register(dto: UserRegisterDto): Promise<AuthTokenIssueResult> {
    const existingUser = await this.db.user.findFirst({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new AppConflictException('A user with this email already exists.', 'email_conflict');
    }

    let role = UserRole.Student;
    if (dto.role !== undefined && dto.role !== null) {
      const parsedRole = tryParseUserRole(dto.role);
      if (parsedRole === null || parsedRole === UserRole.Admin) {
        throw new AppBadRequestException(
          'Invalid role. Only Student and Owner can self-register.',
          'invalid_role',
        );
      }

      role = parsedRole;
    }

    let user: UserRecord;
    try {
      user = await this.db.user.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          phoneNumber: dto.phoneNumber,
          passwordHash: await argon2.hash(dto.password),
          role,
          lastActivityAt: new Date(),
          createdAt: new Date(),
          isDeleted: false,
        },
      });
    } catch {
      throw new AppConflictException('A user with this email already exists.', 'email_conflict');
    }

    return this.issueTokens(user, false);
  }

  private async issueTokens(user: UserRecord, rememberMe: boolean): Promise<AuthTokenIssueResult> {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const refreshTokenExpiresAt = new Date(Date.now() + this.getRefreshLifetimeMs(user.role, rememberMe));

    await this.db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshTokenExpiresAt,
        rememberMe,
        revoked: false,
        createdAt: new Date(),
      },
    });

    return {
      response: {
        accessToken: accessToken.token,
        accessTokenExpiresAt: accessToken.expiresAt,
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role as UserRole,
      },
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  private async generateAccessToken(user: UserRecord): Promise<{ token: string; expiresAt: Date }> {
    const expiresInMinutes =
      user.role === UserRole.Admin
        ? this.configService.adminAccessExpiryMinutes
        : this.configService.userAccessExpiryMinutes;

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: userRoleToName(user.role as UserRole),
    };

    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.jwtSecret,
      issuer: this.configService.jwtIssuer,
      audience: this.configService.jwtAudience,
      expiresIn: `${expiresInMinutes}m`,
    });

    return { token, expiresAt };
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('base64');
  }

  private hashRefreshToken(refreshToken: string): string {
    let tokenBuffer: Buffer;

    try {
      tokenBuffer = Buffer.from(refreshToken, 'base64');
    } catch {
      tokenBuffer = Buffer.from(refreshToken, 'utf8');
    }

    return createHash('sha256').update(tokenBuffer).digest('hex');
  }

  private getRefreshLifetimeMs(role: number, rememberMe: boolean): number {
    if (role === UserRole.Admin) {
      return this.configService.adminRefreshExpiryHours * 60 * 60 * 1000;
    }

    const days = rememberMe ? this.configService.userRefreshRememberDays : this.configService.userRefreshExpiryDays;
    return days * 24 * 60 * 60 * 1000;
  }
}
