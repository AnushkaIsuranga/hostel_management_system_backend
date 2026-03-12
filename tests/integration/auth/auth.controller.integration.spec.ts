import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../../src/common/enums/app.enums';
import { AppUnauthorizedException } from '../../../src/common/exceptions/app-exception';
import { AppConfigService } from '../../../src/config/app-config.service';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';
import { createIntegrationHttpApp, IntegrationHttpContext } from '../../helpers';

const makeAuthServiceMock = () => ({
  login: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
});

describe('AuthController Integration', () => {
  let ctx: IntegrationHttpContext;
  const authService = makeAuthServiceMock();
  const configService: Pick<AppConfigService, 'refreshCookieName' | 'nodeEnv'> = {
    refreshCookieName: 'refreshToken',
    nodeEnv: 'test',
  };

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AppConfigService, useValue: configService },
      ],
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/auth/login returns token payload and sets refresh cookie', async () => {
    authService.login.mockResolvedValue({
      response: {
        accessToken: 'access-1',
        accessTokenExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
        userId: 'user-1',
        email: 'user@test.com',
        role: UserRole.Student,
      },
      refreshToken: 'refresh-1',
      refreshTokenExpiresAt: new Date('2030-01-02T00:00:00.000Z'),
    });

    const response = await ctx.client
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'pass123', rememberMe: true })
      .expect(200);

    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@test.com', rememberMe: true }),
    );
    expect(response.body).toEqual(expect.objectContaining({ accessToken: 'access-1', userId: 'user-1' }));
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'][0]).toContain('refreshToken=refresh-1');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('POST /api/auth/refresh returns RFC7807 problem details when refresh token is invalid', async () => {
    authService.refresh.mockRejectedValue(new AppUnauthorizedException('Invalid refresh token', 'AUTH_REFRESH_INVALID'));

    const response = await ctx.client.post('/api/auth/refresh').expect(401);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 401,
        title: 'Unauthorized',
        detail: 'Invalid refresh token',
        errorCode: 'AUTH_REFRESH_INVALID',
      }),
    );
  });

  it('POST /api/auth/logout clears refresh cookie and returns 204', async () => {
    authService.logout.mockResolvedValue(undefined);

    const response = await ctx.client
      .post('/api/auth/logout')
      .set('Cookie', ['refreshToken=refresh-1'])
      .expect(204);

    expect(authService.logout).toHaveBeenCalledWith('refresh-1');
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'][0]).toContain('refreshToken=;');
  });
});
