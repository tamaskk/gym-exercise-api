import { ApiPropertyOptional } from '@nestjs/swagger';
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
 * Payload for `PATCH /workout-tasks/:id`. Supports renaming and fully replacing
 * the item list. Because the incoming `items` array order defines the new
 * `position` of each item, this also serves as the reorder mechanism.
 */
export class UpdateWorkoutTaskDto {
  @ApiPropertyOptional({ example: 'Push day (revised)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    type: [WorkoutItemInputDto],
    description:
      'Replacement item list. When provided, fully replaces existing items; ' +
      'array order becomes the new ordering. Omit to leave items unchanged.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkoutItemInputDto)
  items?: WorkoutItemInputDto[];
}
