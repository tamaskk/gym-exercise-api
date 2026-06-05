import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateExerciseDto } from './create-exercise.dto';

/**
 * Payload for `PATCH /exercises/:exerciseId`. All fields optional; the
 * immutable `exerciseId` cannot be changed via update so it is omitted.
 */
export class UpdateExerciseDto extends PartialType(
  OmitType(CreateExerciseDto, ['exerciseId'] as const),
) {}
