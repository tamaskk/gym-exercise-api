import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponse } from '../errors/api-error';

/**
 * Attaches the full set of documented error responses (matching the source
 * API's `ErrBadRequest`…`ErrInternalServerError` models) to a controller or
 * route so the Swagger docs stay consistent across every endpoint.
 */
export const ApiStandardErrors = () =>
  applyDecorators(
    ApiBadRequestResponse({ description: 'Bad Request', type: ApiErrorResponse }),
    ApiUnauthorizedResponse({ description: 'Unauthorized', type: ApiErrorResponse }),
    ApiForbiddenResponse({ description: 'Forbidden', type: ApiErrorResponse }),
    ApiNotFoundResponse({ description: 'Not Found', type: ApiErrorResponse }),
    ApiResponse({
      status: 405,
      description: 'Method Not Allowed',
      type: ApiErrorResponse,
    }),
    ApiConflictResponse({ description: 'Conflict', type: ApiErrorResponse }),
    ApiResponse({
      status: 412,
      description: 'Precondition Failed',
      type: ApiErrorResponse,
    }),
    ApiTooManyRequestsResponse({
      description: 'Too Many Requests',
      type: ApiErrorResponse,
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal Server Error',
      type: ApiErrorResponse,
    }),
  );
