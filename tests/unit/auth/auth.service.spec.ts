import { describe, it, expect, vi, beforeEach } from 'vitest';
import argon2 from 'argon2';

import { AuthService } from '../../../src/auth/auth.service';
import {
  AppBadRequestException,
  AppConflictException,
  AppUnauthorizedException,
} from '../../../src/common/exceptions/app-exception';
import { UserRole } from '../../../src/common/enums/app.enums';
import { makeUser, makeJwtService, makeAuthConfigService } from '../../helpers';

vi.mock('argon2', () => ({
  default: {
    verify: vi.fn(),
    hash: vi.fn(),
  },
}));

const makePrisma = () => ({
  user: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  refreshToken: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
});

const makeRefreshToken = (overrides: Partial<any> = {}) => ({
  id: 'token-1',
  tokenHash: 'hashed',
  userId: 'user-1',
  revoked: false,
  rememberMe: false,
  expiresAt: new Date(Date.now() + 86400_000),
  createdAt: new Date(),
  user: makeUser(),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrisma>;
  let jwtService: ReturnType<typeof makeJwtService>;
  let configService: ReturnType<typeof makeAuthConfigService>;

  beforeEach(() => {
    prisma = makePrisma();
    jwtService = makeJwtService();
    configService = makeAuthConfigService();
    service = new AuthService(prisma as any, jwtService as any, configService as any);

    vi.mocked(argon2.verify).mockResolvedValue(true);
    vi.mocked(argon2.hash).mockResolvedValue('new-hash');
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens for a valid student login', async () => {
      const user = makeUser();
      prisma.user.findFirst.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'test@example.com', password: 'password' });
      expect(result.response.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('throws AppUnauthorizedException when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.login({ email: 'missing@test.com', password: 'x' })).rejects.toThrow(
        AppUnauthorizedException,
      );
    });

    it('throws AppUnauthorizedException when password is wrong', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser());
      vi.mocked(argon2.verify).mockResolvedValue(false);
      await expect(service.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
        AppUnauthorizedException,
      );
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('returns new tokens for a valid refresh token', async () => {
      const tokenEntity = makeRefreshToken();
      prisma.refreshToken.findFirst.mockResolvedValue(tokenEntity);
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('valid-refresh-token');
      expect(result.response.accessToken).toBeTruthy();
    });

    it('returns new tokens for an active admin session within idle timeout', async () => {
      const adminUser = makeUser({
        role: UserRole.Admin,
        lastActivityAt: new Date(Date.now() - 5 * 60_000),
      });
      const tokenEntity = makeRefreshToken({ user: adminUser });
      prisma.refreshToken.findFirst.mockResolvedValue(tokenEntity);
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('active-admin-token');

      expect(result.response.accessToken).toBeTruthy();
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { revoked: true },
      });
    });

    it('throws AppUnauthorizedException when token is missing', async () => {
      await expect(service.refresh('')).rejects.toThrow(AppUnauthorizedException);
      await expect(service.refresh('   ')).rejects.toThrow(AppUnauthorizedException);
    });

    it('throws AppUnauthorizedException when token not found', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(null);
      await expect(service.refresh('unknown-token')).rejects.toThrow(AppUnauthorizedException);
    });

    it('throws AppUnauthorizedException when token is revoked', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(makeRefreshToken({ revoked: true }));
      await expect(service.refresh('revoked-token')).rejects.toThrow(AppUnauthorizedException);
    });

    it('throws AppUnauthorizedException when token is expired', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(
        makeRefreshToken({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.refresh('expired-token')).rejects.toThrow(AppUnauthorizedException);
    });

    it('throws AppUnauthorizedException when admin idle timeout exceeded', async () => {
      const adminUser = makeUser({
        role: UserRole.Admin,
        lastActivityAt: new Date(Date.now() - 40 * 60_000), // 40 min ago > 30 min threshold
      });
      const tokenEntity = makeRefreshToken({ user: adminUser });
      prisma.refreshToken.findFirst.mockResolvedValue(tokenEntity);
      prisma.refreshToken.update.mockResolvedValue({});

      await expect(service.refresh('admin-idle-token')).rejects.toThrow(AppUnauthorizedException);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('revokes a valid refresh token', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      await service.logout('valid-refresh-token');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledOnce();
    });

    it('is a no-op when token is null', async () => {
      await service.logout(null);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('is a no-op when token is empty string', async () => {
      await service.logout('   ');
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a new user and returns tokens', async () => {
      const user = makeUser();
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(user);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '1234567890',
      });

      expect(result.response.userId).toBe('user-1');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: UserRole.Student }),
        }),
      );
    });

    it('creates an owner when role Owner is requested', async () => {
      const user = makeUser({ role: UserRole.Owner });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(user);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        fullName: 'Owner User',
        email: 'owner@example.com',
        password: 'password123',
        phoneNumber: '1234567890',
        role: 'Owner',
      });

      expect(result.response.role).toBe(UserRole.Owner);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: UserRole.Owner }),
        }),
      );
    });

    it('rejects admin self-registration', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.register({
          fullName: 'Admin User',
          email: 'admin@example.com',
          password: 'password123',
          phoneNumber: '1234567890',
          role: 'Admin',
        }),
      ).rejects.toThrow(AppBadRequestException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('throws AppConflictException when email already exists', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser());
      await expect(
        service.register({
          fullName: 'Test User',
          email: 'existing@example.com',
          password: 'password123',
          phoneNumber: '1234567890',
        }),
      ).rejects.toThrow(AppConflictException);
    });
  });
});
