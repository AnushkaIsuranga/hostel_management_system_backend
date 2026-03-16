import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { roleNameToValue } from '../../common/enums/app.enums';
import { CurrentUser } from '../../common/interfaces/current-user.interface';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
      issuer: configService.jwtIssuer,
      audience: configService.jwtAudience,
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUser> {
    await this.prisma.user.updateMany({
      where: {
        id: payload.sub,
        isDeleted: false,
      },
      data: {
        lastActivityAt: new Date(),
      },
    });

    return {
      userId: payload.sub,
      email: payload.email,
      role: roleNameToValue(payload.role),
      roleName: payload.role,
    };
  }
}
