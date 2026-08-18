import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { AppException } from './app-exception';

@Catch()
@Injectable()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred.';
    let errorCode: string | undefined;

    if (exception instanceof AppException) {
      status = exception.getStatus();
      const payload = exception.getResponse() as Record<string, unknown>;
      title = String(payload.title ?? title);
      detail = String(payload.detail ?? detail);
      errorCode = typeof payload.errorCode === 'string' ? payload.errorCode : undefined;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        detail = payload;
      } else if (payload && typeof payload === 'object') {
        const body = payload as Record<string, unknown>;
        title = typeof body.error === 'string' ? body.error : title;
        if (Array.isArray(body.message)) {
          detail = body.message.join(', ');
        } else if (typeof body.message === 'string') {
          detail = body.message;
        }
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    response
      .status(status)
      .type('application/problem+json')
      .json({
        status,
        title,
        detail,
        instance: request.originalUrl,
        ...(errorCode ? { errorCode } : {}),
      });
  }
}
