import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../../src/common/enums/app.enums';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { UsersController } from '../../../src/users/users.controller';
import { UsersService } from '../../../src/users/users.service';
import { createIntegrationHttpApp, IntegrationHttpContext, makeUser } from '../../helpers';

const makeUsersServiceMock = () => ({
  getAll: vi.fn(),
  getStats: vi.fn(),
  getByRole: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('UsersController Integration', () => {
  let ctx: IntegrationHttpContext;
  let adminCtx: IntegrationHttpContext;
  const usersService = makeUsersServiceMock();

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    });

    adminCtx = await createIntegrationHttpApp({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
      guardOverrides: [{ guard: JwtAuthGuard, useValue: { canActivate: () => true } }],
      currentUser: { userId: 'admin-1', role: UserRole.Admin },
    });
  }, 60000);

  afterAll(async () => {
    await ctx.app.close();
    await adminCtx.app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/users/stats returns admin overview data', async () => {
    usersService.getStats.mockResolvedValue({
      users: { totalCount: 30, last7DaysCount: 2 },
      hostels: { totalCount: 12, last7DaysCount: 1 },
      reviews: { totalCount: 90, last7DaysCount: 7 },
    });

    const response = await ctx.client.get('/api/users/stats').expect(200);

    expect(usersService.getStats).toHaveBeenCalledOnce();
    expect(response.body.users.totalCount).toBe(30);
    expect(response.body.hostels.totalCount).toBe(12);
  });

  it('GET /api/users/role/:role maps through to service', async () => {
    usersService.getByRole.mockResolvedValue([makeUser({ role: UserRole.Owner })]);

    const response = await ctx.client.get('/api/users/role/Owner').expect(200);

    expect(usersService.getByRole).toHaveBeenCalledWith('Owner');
    expect(response.body).toHaveLength(1);
    expect(response.body[0].role).toBe(UserRole.Owner);
  });

  it('GET /api/users/:id returns RFC7807 for invalid UUID', async () => {
    const response = await ctx.client.get('/api/users/not-a-uuid').expect(400);

    expect(usersService.getById).not.toHaveBeenCalled();
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 400,
        title: 'Bad Request',
      }),
    );
    expect(String(response.body.detail)).toContain('uuid');
  });

  it('POST /api/users creates user and returns payload', async () => {
    usersService.create.mockResolvedValue(makeUser({ fullName: 'Alice Test', role: UserRole.Student }));

    const response = await adminCtx.client
      .post('/api/users')
      .send({
        fullName: 'Alice Test',
        email: 'alice@test.com',
        phoneNumber: '0711111111',
        role: UserRole.Student,
      })
      .expect(201);

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Alice Test',
        email: 'alice@test.com',
      }),
    );
    expect(response.body.fullName).toBe('Alice Test');
  });

  it('POST /api/users rejects non-admin callers', async () => {
    const studentCtx = await createIntegrationHttpApp({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
      guardOverrides: [{ guard: JwtAuthGuard, useValue: { canActivate: () => true } }],
      currentUser: { userId: 'user-1', role: UserRole.Student },
    });

    try {
      const response = await studentCtx.client
        .post('/api/users')
        .send({
          fullName: 'Blocked User',
          email: 'blocked@test.com',
          phoneNumber: '0711111111',
          role: UserRole.Owner,
        })
        .expect(403);

      expect(usersService.create).not.toHaveBeenCalled();
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 403,
          errorCode: 'admin_only',
        }),
      );
    } finally {
      await studentCtx.app.close();
    }
  });

  it('PUT /api/users/:id allows a user to update own profile but not escalate role', async () => {
    usersService.update.mockResolvedValue(
      makeUser({
        id: '550e8400-e29b-41d4-a716-446655440000',
        fullName: 'Owner One',
        phoneNumber: '0771234567',
        role: UserRole.Owner,
      }),
    );

    const ownerCtx = await createIntegrationHttpApp({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
      guardOverrides: [{ guard: JwtAuthGuard, useValue: { canActivate: () => true } }],
      currentUser: { userId: '550e8400-e29b-41d4-a716-446655440000', role: UserRole.Owner },
    });

    try {
      const response = await ownerCtx.client
        .put('/api/users/550e8400-e29b-41d4-a716-446655440000')
        .send({
          fullName: 'Owner One',
          phoneNumber: '0771234567',
          role: UserRole.Admin,
        })
        .expect(200);

      expect(usersService.update).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        expect.objectContaining({
          fullName: 'Owner One',
          phoneNumber: '0771234567',
          role: UserRole.Owner,
        }),
      );
      expect(response.body.role).toBe(UserRole.Owner);
    } finally {
      await ownerCtx.app.close();
    }
  });

  it('PUT /api/users/:id rejects non-admin updates to other users', async () => {
    const ownerCtx = await createIntegrationHttpApp({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
      guardOverrides: [{ guard: JwtAuthGuard, useValue: { canActivate: () => true } }],
      currentUser: { userId: '550e8400-e29b-41d4-a716-446655440000', role: UserRole.Owner },
    });

    try {
      const response = await ownerCtx.client
        .put('/api/users/550e8400-e29b-41d4-a716-446655440001')
        .send({
          fullName: 'Owner One',
          phoneNumber: '0771234567',
          role: UserRole.Owner,
        })
        .expect(403);

      expect(usersService.update).not.toHaveBeenCalled();
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 403,
          errorCode: 'profile_owner_only',
        }),
      );
    } finally {
      await ownerCtx.app.close();
    }
  });
});
