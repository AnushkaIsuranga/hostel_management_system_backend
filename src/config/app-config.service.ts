import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.getInt(['PORT'], 3000);
  }

  get nodeEnv(): string {
    return this.getString(['NODE_ENV'], 'development');
  }

  get jwtSecret(): string {
    return this.getRequired(['JwtSettings__Secret']);
  }

  get jwtIssuer(): string {
    return this.getString(['JwtSettings__Issuer'], 'HostelSystem');
  }

  get jwtAudience(): string {
    return this.getString(['JwtSettings__Audience'], 'HostelSystemUsers');
  }

  get userAccessExpiryMinutes(): number {
    return this.getInt(['JwtSettings__UserAccessExpiryMinutes', 'JwtSettings__ExpiryMinutes'], 15);
  }

  get adminAccessExpiryMinutes(): number {
    return this.getInt(['JwtSettings__AdminAccessExpiryMinutes'], 15);
  }

  get userRefreshExpiryDays(): number {
    return this.getInt(['AuthSettings__UserRefreshExpiryDays'], 1);
  }

  get userRefreshRememberDays(): number {
    return this.getInt(['AuthSettings__UserRefreshExpiryRememberDays'], 30);
  }

  get adminRefreshExpiryHours(): number {
    return this.getInt(['AuthSettings__AdminRefreshExpiryHours'], 12);
  }

  get adminIdleTimeoutMinutes(): number {
    return this.getInt(['AuthSettings__AdminIdleTimeoutMinutes'], 30);
  }

  get refreshCookieName(): string {
    return this.getString(['AuthSettings__RefreshCookieName'], 'refreshToken');
  }

  get allowedOrigins(): string[] {
    const raw = this.getString(['Cors__AllowedOrigins'], '');
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => Boolean(origin) && origin !== 'SET_VIA_ENV');
  }

  get cdnBaseUrl(): string {
    return this.getString(['ImageStorage__CdnBaseUrl'], '');
  }

  get cleanupRetentionDays(): number {
    return this.getInt(['DataCleanup__RetentionDays'], 60);
  }

  get cleanupIntervalHours(): number {
    return this.getInt(['DataCleanup__RunIntervalHours'], 24);
  }

  private getRequired(keys: string[]): string {
    for (const key of keys) {
      const value = this.configService.get<string>(key);
      if (value && value !== 'SET_VIA_ENV') {
        return value;
      }
    }

    throw new Error(`Missing required configuration value. Checked keys: ${keys.join(', ')}`);
  }

  private getString(keys: string[], fallback = ''): string {
    for (const key of keys) {
      const value = this.configService.get<string>(key);
      if (value && value !== 'SET_VIA_ENV') {
        return value;
      }
    }

    return fallback;
  }

  private getInt(keys: string[], fallback: number): number {
    for (const key of keys) {
      const value = this.configService.get<string>(key);
      if (!value || value === 'SET_VIA_ENV') {
        continue;
      }

      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return fallback;
  }
}
