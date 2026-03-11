import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';

import { roleNameToValue } from '../../common/enums/app.enums';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class ActivityTrackingMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
  ) {}

  async use(req: Request, _res: Response, next: () => void) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      next();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.jwtSecret,
        issuer: this.configService.jwtIssuer,
        audience: this.configService.jwtAudience,
      });

      req.user = {
        userId: payload.sub,
        email: payload.email,
        role: roleNameToValue(payload.role),
        roleName: payload.role,
      };

      await this.prisma.user.updateMany({
        where: {
          id: payload.sub,
          isDeleted: false,
        },
        data: {
          lastActivityAt: new Date(),
        },
      });
    } catch {
      // Invalid tokens on public routes should not block the request.
    }

    next();
  }
}
