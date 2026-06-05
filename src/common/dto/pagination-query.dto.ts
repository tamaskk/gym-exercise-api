import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const PAGINATION_DEFAULT_LIMIT = 10;
export const PAGINATION_MAX_LIMIT = 25;
export const PAGINATION_MIN_LIMIT = 1;

/**
 * Cursor-pagination query parameters shared by every list endpoint. Mirrors the
 * source API: `limit` (1–25, default 10) plus opaque `after` / `before`
 * cursors which are exerciseId values.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: `Maximum number of results to return (min: ${PAGINATION_MIN_LIMIT}, max: ${PAGINATION_MAX_LIMIT}).`,
    minimum: PAGINATION_MIN_LIMIT,
    maximum: PAGINATION_MAX_LIMIT,
    default: PAGINATION_DEFAULT_LIMIT,
    example: 10,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number.parseInt(value, 10)))
  @IsInt()
  @Min(PAGINATION_MIN_LIMIT)
  @Max(PAGINATION_MAX_LIMIT)
  limit: number = PAGINATION_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description: 'Exercise ID to paginate after (forward pagination).',
    example: 'EIeI8Vf',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  after?: string;

  @ApiPropertyOptional({
    description: 'Exercise ID to paginate before (backward pagination).',
    example: 'trmaT4d',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  before?: string;
}
