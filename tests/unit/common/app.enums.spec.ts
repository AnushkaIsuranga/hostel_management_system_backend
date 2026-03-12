import { describe, expect, it } from 'vitest';

import { UserRole, roleNameToValue, userRoleToName } from '../../../src/common/enums/app.enums';

describe('app.enums helpers', () => {
  it('userRoleToName maps all enum cases and default branch', () => {
    expect(userRoleToName(UserRole.Student)).toBe('Student');
    expect(userRoleToName(UserRole.Owner)).toBe('Owner');
    expect(userRoleToName(UserRole.Admin)).toBe('Admin');
    expect(userRoleToName(999 as UserRole)).toBe('Student');
  });

  it('roleNameToValue maps known names and default branch', () => {
    expect(roleNameToValue('owner')).toBe(UserRole.Owner);
    expect(roleNameToValue('ADMIN')).toBe(UserRole.Admin);
    expect(roleNameToValue(' student ')).toBe(UserRole.Student);
    expect(roleNameToValue('unknown')).toBe(UserRole.Student);
    expect(roleNameToValue(null)).toBe(UserRole.Student);
  });
});
