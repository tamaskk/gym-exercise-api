import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { WorkoutItemInputDto } from './workout-item.dto';

/**
 * Payload for `POST /workout-tasks`. A task may be created empty (a draft) or
 * seeded with items — e.g. the exercise ids returned from a search/filter call.
 */
export class CreateWorkoutTaskDto {
  @ApiProperty({ example: 'Push day — chest & triceps' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    type: [WorkoutItemInputDto],
    description: 'Initial items. Order is preserved as the item positions.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkoutItemInputDto)
  items?: WorkoutItemInputDto[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Convenience: seed the task from a list of exercise ids (e.g. a search ' +
      'result). Each becomes an item with default sets/reps. Merged after `items`.',
    example: ['EIeI8Vf', 'trmaT4d'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seedExerciseIds?: string[];
}
