import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(status: HttpStatus, detail: string, public readonly errorCode?: string, title?: string) {
    super(
      {
        status,
        title: title ?? detail,
        detail,
        errorCode,
      },
      status,
    );
  }
}

export class AppBadRequestException extends AppException {
  constructor(detail: string, errorCode?: string) {
    super(HttpStatus.BAD_REQUEST, detail, errorCode, 'Bad Request');
  }
}

export class AppUnauthorizedException extends AppException {
  constructor(detail: string, errorCode?: string) {
    super(HttpStatus.UNAUTHORIZED, detail, errorCode, 'Unauthorized');
  }
}

export class AppForbiddenException extends AppException {
  constructor(detail: string, errorCode?: string) {
    super(HttpStatus.FORBIDDEN, detail, errorCode, 'Forbidden');
  }
}

export class AppNotFoundException extends AppException {
  constructor(detail: string, errorCode?: string) {
    super(HttpStatus.NOT_FOUND, detail, errorCode, 'Not Found');
  }
}

export class AppConflictException extends AppException {
  constructor(detail: string, errorCode?: string) {
    super(HttpStatus.CONFLICT, detail, errorCode, 'Conflict');
  }
}
