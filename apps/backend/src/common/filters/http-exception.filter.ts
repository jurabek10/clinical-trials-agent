import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ErrorResponse } from '@ct-agent/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorResponse = {
      error: { code: 'INTERNAL', message: 'Internal server error' },
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();

      if (this.isErrorResponseShape(resp)) {
        body = resp;
      } else if (typeof resp === 'string') {
        body = { error: { code: this.codeFromStatus(status), message: resp } };
      } else if (resp && typeof resp === 'object') {
        const r = resp as Record<string, unknown>;
        const message =
          (Array.isArray(r.message) ? r.message.join('; ') : (r.message as string)) ||
          (r.error as string) ||
          exception.message;
        body = {
          error: {
            code: this.codeFromStatus(status),
            message: typeof message === 'string' ? message : exception.message,
            details: r,
          },
        };
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      body = { error: { code: 'INTERNAL', message: exception.message } };
    }

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} → ${status} ${body.error.message}`);
    } else {
      this.logger.warn(`${req.method} ${req.url} → ${status} ${body.error.message}`);
    }

    res.status(status).json(body);
  }

  private isErrorResponseShape(v: unknown): v is ErrorResponse {
    return (
      !!v &&
      typeof v === 'object' &&
      'error' in v &&
      typeof (v as ErrorResponse).error === 'object' &&
      typeof (v as ErrorResponse).error.code === 'string' &&
      typeof (v as ErrorResponse).error.message === 'string'
    );
  }

  private codeFromStatus(status: number): ErrorResponse['error']['code'] {
    if (status === HttpStatus.BAD_REQUEST) return 'INVALID_INPUT';
    if (status === HttpStatus.UNPROCESSABLE_ENTITY) return 'PLAN_VALIDATION_FAILED';
    if (status === HttpStatus.BAD_GATEWAY) return 'UPSTREAM_FAILURE';
    return 'INTERNAL';
  }
}
