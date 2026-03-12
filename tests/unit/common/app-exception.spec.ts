import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  AppBadRequestException,
  AppConflictException,
  AppException,
  AppForbiddenException,
  AppNotFoundException,
  AppUnauthorizedException,
} from '../../../src/common/exceptions/app-exception';

describe('AppException', () => {
  it('uses detail as title when title is not provided', () => {
    const error = new AppException(HttpStatus.BAD_REQUEST, 'bad detail', 'E_BAD');
    const response = error.getResponse() as any;

    expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(response.title).toBe('bad detail');
    expect(response.detail).toBe('bad detail');
    expect(response.errorCode).toBe('E_BAD');
  });

  it('uses explicit title when provided', () => {
    const error = new AppException(HttpStatus.CONFLICT, 'conflict detail', 'E_CONFLICT', 'Conflict Title');
    const response = error.getResponse() as any;

    expect(response.title).toBe('Conflict Title');
    expect(response.detail).toBe('conflict detail');
  });

  it('specialized exceptions set their status and default title', () => {
    expect((new AppBadRequestException('x') as any).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect((new AppUnauthorizedException('x') as any).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect((new AppForbiddenException('x') as any).getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect((new AppNotFoundException('x') as any).getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect((new AppConflictException('x') as any).getStatus()).toBe(HttpStatus.CONFLICT);
  });
});
