import { vi } from 'vitest';

export const makeJwtService = () => ({
  signAsync: vi.fn().mockResolvedValue('signed-token'),
});

export const makeAuthConfigService = (overrides: Partial<any> = {}) => ({
  jwtSecret: 'secret',
  jwtIssuer: 'hostel-api',
  adminAccessExpiryMinutes: 15,
  userAccessExpiryMinutes: 15,
  adminRefreshExpiryHours: 12,
  userRefreshExpiryDays: 7,
  adminIdleTimeoutMinutes: 30,
  ...overrides,
});
