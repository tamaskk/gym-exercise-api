import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ERROR_NAMES, ApiErrorResponse } from '../errors/api-error';

/**
 * Global exception filter that converts every thrown error — whether a Nest
 * `HttpException`, a class-validator failure, or an unexpected runtime error —
 * into the documented error envelope:
 *
 *   { success: false, error: { code, message, detail, timestamp, path } }
 *
 * This keeps the contract identical to the documented `ErrBadRequest`… models
 * across all of 400/401/403/404/405/409/412/429/500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const detail = this.extractDetail(exception, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Log full stack for server-side faults; never leak internals to clients.
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: status,
        message: ERROR_NAMES[status] ?? 'Error',
        detail,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    response.status(status).json(body);
  }

  /**
   * Pulls a useful human-readable detail out of the exception while hiding
   * internal error messages for 5xx responses.
   */
  private extractDetail(
    exception: unknown,
    status: number,
  ): string | string[] | undefined {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') return res;
      if (res && typeof res === 'object') {
        const message = (res as Record<string, unknown>).message;
        if (message !== undefined) return message as string | string[];
      }
      return exception.message;
    }
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'An unexpected error occurred.';
    }
    return exception instanceof Error ? exception.message : undefined;
  }
}
