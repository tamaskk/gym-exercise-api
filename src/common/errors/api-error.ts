import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Shape of the error body returned by the source ExerciseDB API and mirrored
 * here so consumers get a consistent contract regardless of which layer the
 * error originated in. Matches the documented `ErrBadRequest`… models.
 */
export class ApiErrorBody {
  @ApiProperty({ example: 400, description: 'HTTP status code.' })
  code!: number;

  @ApiProperty({
    example: 'Bad Request',
    description: 'Short, machine-friendly error name.',
  })
  message!: string;

  @ApiProperty({
    example: 'limit must not be greater than 25',
    description: 'Human-readable detail about what went wrong.',
    required: false,
  })
  detail?: string | string[];

  @ApiProperty({
    example: '2026-06-05T10:00:00.000Z',
    description: 'When the error occurred (ISO-8601).',
  })
  timestamp!: string;

  @ApiProperty({
    example: '/api/v1/exercises',
    description: 'Request path that produced the error.',
  })
  path!: string;
}

/**
 * Standard error envelope: `{ success: false, error: {...} }`.
 */
export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ type: ApiErrorBody })
  error!: ApiErrorBody;
}

/**
 * Canonical mapping of the HTTP status codes documented by the source API to a
 * short name. Used by the exception filter to populate `error.message`.
 */
export const ERROR_NAMES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'Method Not Allowed',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.PRECONDITION_FAILED]: 'Precondition Failed',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};
