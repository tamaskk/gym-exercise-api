import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CsvToLowerArray } from '../../common/transformers/csv.transformer';

/**
 * Query parameters for `GET /exercises` — advanced filtering. Comma-separated
 * list params are normalised to lower-cased `string[]`. All filters combine
 * with AND; within a single multi-value filter, matches are ANDed too (a row
 * must contain every requested value), mirroring the source's intent of
 * narrowing results.
 */
export class FilterExercisesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by name (case-insensitive substring match).',
    example: 'bench press',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Primary target muscles (comma-separated).',
    example: 'pectorals,shoulders',
  })
  @IsOptional()
  @CsvToLowerArray()
  targetMuscles?: string[];

  @ApiPropertyOptional({
    description: 'Secondary muscles (comma-separated).',
    example: 'triceps',
  })
  @IsOptional()
  @CsvToLowerArray()
  secondaryMuscles?: string[];

  @ApiPropertyOptional({
    description: 'Body parts (comma-separated).',
    example: 'chest',
  })
  @IsOptional()
  @CsvToLowerArray()
  bodyParts?: string[];

  @ApiPropertyOptional({
    description: 'Required equipment (comma-separated).',
    example: 'barbell,dumbbell',
  })
  @IsOptional()
  @CsvToLowerArray()
  equipments?: string[];
}

/** `GET /exercises/bodyparts` query params. */
export class FilterByBodyPartsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Body parts (comma-separated).',
    example: 'chest,shoulders',
  })
  @IsOptional()
  @CsvToLowerArray()
  bodyParts?: string[];
}

/** `GET /exercises/muscles` query params. */
export class FilterByMusclesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Primary target muscles (comma-separated).',
    example: 'pectorals,shoulders',
  })
  @IsOptional()
  @CsvToLowerArray()
  targetMuscles?: string[];

  @ApiPropertyOptional({
    description: 'Secondary muscles (comma-separated).',
    example: 'triceps,abs',
  })
  @IsOptional()
  @CsvToLowerArray()
  secondaryMuscles?: string[];
}

/** `GET /exercises/equipments` query params. */
export class FilterByEquipmentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Required equipment (comma-separated).',
    example: 'barbell,dumbbell',
  })
  @IsOptional()
  @CsvToLowerArray()
  equipments?: string[];
}
