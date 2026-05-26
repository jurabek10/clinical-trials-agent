import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@ct-agent/shared';

export class AppError extends HttpException {
  constructor(code: ErrorCode, message: string, status: HttpStatus, details?: unknown) {
    super({ error: { code, message, details } }, status);
  }
}

export const invalidInput = (message: string, details?: unknown): AppError =>
  new AppError('INVALID_INPUT', message, HttpStatus.BAD_REQUEST, details);

export const planValidationFailed = (message: string, details?: unknown): AppError =>
  new AppError('PLAN_VALIDATION_FAILED', message, HttpStatus.UNPROCESSABLE_ENTITY, details);

export const upstreamFailure = (message: string, details?: unknown): AppError =>
  new AppError('UPSTREAM_FAILURE', message, HttpStatus.BAD_GATEWAY, details);

export const noData = (message: string, details?: unknown): AppError =>
  new AppError('NO_DATA', message, HttpStatus.NOT_FOUND, details);

export const internalError = (message: string, details?: unknown): AppError =>
  new AppError('INTERNAL', message, HttpStatus.INTERNAL_SERVER_ERROR, details);
