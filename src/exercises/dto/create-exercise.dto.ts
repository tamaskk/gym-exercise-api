import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Payload for creating a custom exercise (`POST /exercises`). Validated by the
 * global ValidationPipe; every field is documented for Swagger.
 */
export class CreateExerciseDto {
  @ApiProperty({
    description:
      'Unique exercise identifier. Optional — a stable id is generated if omitted.',
    example: 'custom-incline-pushup',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  exerciseId?: string;

  @ApiProperty({ example: 'incline push-up' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    example: 'https://static.exercisedb.dev/media/custom.gif',
  })
  @IsUrl({ require_tld: false })
  gifUrl!: string;

  @ApiProperty({ type: [String], example: ['pectorals'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  targetMuscles!: string[];

  @ApiProperty({ type: [String], example: ['chest'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  bodyParts!: string[];

  @ApiProperty({ type: [String], example: ['body weight'] })
  @IsArray()
  @IsString({ each: true })
  equipments!: string[];

  @ApiProperty({ type: [String], example: ['triceps', 'shoulders'] })
  @IsArray()
  @IsString({ each: true })
  secondaryMuscles!: string[];

  @ApiProperty({
    type: [String],
    example: ['Step:1 Start in a push-up position with hands on an elevated surface.'],
  })
  @IsArray()
  @IsString({ each: true })
  instructions!: string[];
}
