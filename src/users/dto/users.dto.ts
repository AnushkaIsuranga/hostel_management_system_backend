import { UserRole } from '../../common/enums/app.enums';

export interface UserReadDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date | null;
}

export class UserCreateDto {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
}

export class UserUpdateDto {
  fullName: string;
  phoneNumber: string;
  role: UserRole;
}

export class UserRegisterDto {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface DashboardMetricDto {
  totalCount: number;
  last7DaysCount: number;
}

export interface AdminOverviewDto {
  hostels: DashboardMetricDto;
  users: DashboardMetricDto;
  reviews: DashboardMetricDto;
}
