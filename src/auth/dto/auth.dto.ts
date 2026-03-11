import { UserRole } from '../../common/enums/app.enums';

export class LoginRequestDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthTokensResponseDto {
  accessToken: string;
  accessTokenExpiresAt: Date;
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthTokenIssueResult {
  response: AuthTokensResponseDto;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}
