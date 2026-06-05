import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Input for a single workout item when creating or replacing a task's items.
 * `exerciseId` is required; the prescription fields default to sensible values.
 */
export class WorkoutItemInputDto {
  @ApiProperty({ example: 'EIeI8Vf', description: 'Referenced exercise id.' })
  @IsString()
  @MinLength(1)
  exerciseId!: string;

  @ApiPropertyOptional({ example: 4, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sets?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

  @ApiPropertyOptional({ example: 60, default: 0, description: 'Weight in kg.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: 90, default: 60, description: 'Rest seconds.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  rest?: number;
}
