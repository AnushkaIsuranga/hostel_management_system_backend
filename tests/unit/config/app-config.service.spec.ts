import { describe, expect, it, vi } from 'vitest';

import { AppConfigService } from '../../../src/config/app-config.service';

const makeConfigService = (values: Record<string, string | undefined>) => ({
  get: vi.fn((key: string) => values[key]),
});

describe('AppConfigService', () => {
  it('resolves configured numeric and string values', () => {
    const inner = makeConfigService({
      PORT: '4500',
      NODE_ENV: 'test',
      JwtSettings__Secret: 'secret-x',
      Cors__AllowedOrigins: 'http://a.com, http://b.com',
    });

    const service = new AppConfigService(inner as any);

    expect(service.port).toBe(4500);
    expect(service.nodeEnv).toBe('test');
    expect(service.jwtSecret).toBe('secret-x');
    expect(service.allowedOrigins).toEqual(['http://a.com', 'http://b.com']);
  });

  it('falls back when values are missing/invalid', () => {
    const inner = makeConfigService({
      PORT: 'oops',
      JwtSettings__Issuer: undefined,
      AuthSettings__RefreshCookieName: undefined,
      Cors__AllowedOrigins: 'SET_VIA_ENV',
    });

    const service = new AppConfigService(inner as any);

    expect(service.port).toBe(3000);
    expect(service.jwtIssuer).toBe('HostelSystem');
    expect(service.refreshCookieName).toBe('refreshToken');
    expect(service.allowedOrigins).toEqual([]);
  });

  it('throws when required secret is missing', () => {
    const inner = makeConfigService({ JwtSettings__Secret: 'SET_VIA_ENV' });
    const service = new AppConfigService(inner as any);

    expect(() => service.jwtSecret).toThrow('Missing required configuration value');
  });

  it('reads auth and cleanup settings with key fallbacks', () => {
    const inner = makeConfigService({
      JwtSettings__Secret: 'secret-y',
      JwtSettings__ExpiryMinutes: '22',
      JwtSettings__AdminAccessExpiryMinutes: '30',
      AuthSettings__UserRefreshExpiryDays: '2',
      AuthSettings__UserRefreshExpiryRememberDays: '45',
      AuthSettings__AdminRefreshExpiryHours: '10',
      AuthSettings__AdminIdleTimeoutMinutes: '25',
      JwtSettings__Audience: undefined,
      ImageStorage__CdnBaseUrl: 'https://cdn.example.com',
      DataCleanup__RetentionDays: '75',
      DataCleanup__RunIntervalHours: '12',
    });

    const service = new AppConfigService(inner as any);

    expect(service.userAccessExpiryMinutes).toBe(22);
    expect(service.adminAccessExpiryMinutes).toBe(30);
    expect(service.userRefreshExpiryDays).toBe(2);
    expect(service.userRefreshRememberDays).toBe(45);
    expect(service.adminRefreshExpiryHours).toBe(10);
    expect(service.adminIdleTimeoutMinutes).toBe(25);
    expect(service.jwtAudience).toBe('HostelSystemUsers');
    expect(service.cdnBaseUrl).toBe('https://cdn.example.com');
    expect(service.cleanupRetentionDays).toBe(75);
    expect(service.cleanupIntervalHours).toBe(12);
  });
});
