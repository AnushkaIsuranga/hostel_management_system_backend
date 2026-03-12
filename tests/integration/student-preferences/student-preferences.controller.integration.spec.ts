import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../../src/common/enums/app.enums';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { StudentPreferencesController } from '../../../src/student-preferences/student-preferences.controller';
import { StudentPreferencesService } from '../../../src/student-preferences/student-preferences.service';
import { createIntegrationHttpApp, IntegrationHttpContext, makeStudentPreference } from '../../helpers';

describe('StudentPreferencesController Integration', () => {
  let ctx: IntegrationHttpContext;
  const studentPreferencesService = {
    getMine: vi.fn(),
    upsertMine: vi.fn(),
  };

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [StudentPreferencesController],
      providers: [
        { provide: StudentPreferencesService, useValue: studentPreferencesService },
      ],
      guardOverrides: [{ guard: JwtAuthGuard, useValue: { canActivate: () => true } }],
      currentUser: { userId: 'user-1', role: UserRole.Student },
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/student-preferences/me returns current user preferences', async () => {
    studentPreferencesService.getMine.mockResolvedValue(makeStudentPreference());

    const response = await ctx.client.get('/api/student-preferences/me').expect(200);

    expect(studentPreferencesService.getMine).toHaveBeenCalledWith('user-1');
    expect(response.body.userId).toBe('user-1');
  });

  it('PUT /api/student-preferences/me upserts preferences for current user', async () => {
    studentPreferencesService.upsertMine.mockResolvedValue(makeStudentPreference({ minBudget: 12000 }));

    const response = await ctx.client
      .put('/api/student-preferences/me')
      .send({ universityId: 'university-1', minBudget: 12000, maxBudget: 30000 })
      .expect(200);

    expect(studentPreferencesService.upsertMine).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ universityId: 'university-1', minBudget: 12000 }),
    );
    expect(response.body.minBudget).toBe(12000);
  });
});
