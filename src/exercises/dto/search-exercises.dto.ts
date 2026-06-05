import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Query parameters for `GET /exercises/search` — fuzzy matching via Fuse.js.
 * `threshold` follows the source/Fuse semantics: 0 = exact match, 1 = match
 * anything.
 */
export class SearchExercisesDto {
  @ApiPropertyOptional({
    description: 'Search term. Supports fuzzy matching against exercise names.',
    example: 'bench press',
    default: '',
  })
  @IsOptional()
  @IsString()
  search = '';

  @ApiPropertyOptional({
    description: 'Fuzzy threshold (0 = exact, 1 = very loose).',
    minimum: 0,
    maximum: 1,
    default: 0.3,
    example: 0.3,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? undefined : Number(value),
  )
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold = 0.3;

  @ApiPropertyOptional({
    description: 'Maximum number of hits to return.',
    minimum: 1,
    maximum: 50,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? undefined : Number.parseInt(value, 10),
  )
  @IsNumber()
  @Min(1)
  @Max(50)
  limit = 10;
}
