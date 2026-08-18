import { UserRole } from '../enums/app.enums';

export interface CurrentUser {
  userId: string;
  email: string;
  role: UserRole;
  roleName: string;
}
