export enum UserRole {
  Student = 0,
  Owner = 1,
  Admin = 2,
}

export enum HostelStatus {
  Pending = 0,
  Active = 1,
  Disabled = 2,
}

export enum HostelVerificationStatus {
  None = 0,
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Expired = 4,
}

export enum InteractionType {
  ViewHostel = 0,
  Search = 1,
  FilterApply = 2,
  Save = 3,
  ContactOwner = 4,
}

export enum ListingStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
}

export const PRIORITY_KEYS = ['price', 'distance', 'rating'] as const;

export function userRoleToName(role: UserRole): string {
  switch (role) {
    case UserRole.Owner:
      return 'Owner';
    case UserRole.Admin:
      return 'Admin';
    case UserRole.Student:
    default:
      return 'Student';
  }
}

export function roleNameToValue(roleName?: string | null): UserRole {
  switch ((roleName ?? '').trim().toLowerCase()) {
    case 'owner':
      return UserRole.Owner;
    case 'admin':
      return UserRole.Admin;
    case 'student':
    default:
      return UserRole.Student;
  }
}
