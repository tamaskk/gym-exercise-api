import { ApiProperty } from '@nestjs/swagger';
import { Exercise, ExerciseSource } from '../schemas/exercise.schema';
import { PageMeta } from '../../common/dto/response-envelope.dto';

/**
 * Public representation of an exercise. Excludes internal search-mirror columns
 * so the API contract stays clean and matches the source dataset shape (plus
 * provenance & timestamps for extensibility).
 */
export class ExerciseDto {
  @ApiProperty({ example: 'EIeI8Vf' })
  exerciseId!: string;

  @ApiProperty({ example: 'barbell bench press' })
  name!: string;

  @ApiProperty({ example: 'https://static.exercisedb.dev/media/EIeI8Vf.gif' })
  gifUrl!: string;

  @ApiProperty({ type: [String], example: ['pectorals'] })
  targetMuscles!: string[];

  @ApiProperty({ type: [String], example: ['chest'] })
  bodyParts!: string[];

  @ApiProperty({ type: [String], example: ['barbell'] })
  equipments!: string[];

  @ApiProperty({ type: [String], example: ['triceps', 'shoulders'] })
  secondaryMuscles!: string[];

  @ApiProperty({ type: [String], example: ['Step:1 Lie flat on a bench...'] })
  instructions!: string[];

  @ApiProperty({ enum: ExerciseSource, example: ExerciseSource.EXERCISEDB })
  source!: ExerciseSource;

  @ApiProperty({ example: '2026-06-05T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-05T10:00:00.000Z' })
  updatedAt!: Date;

  /** Maps an entity to its public DTO, dropping internal columns. */
  static fromEntity(e: Exercise): ExerciseDto {
    return {
      exerciseId: e.exerciseId,
      name: e.name,
      gifUrl: e.gifUrl,
      targetMuscles: e.targetMuscles,
      bodyParts: e.bodyParts,
      equipments: e.equipments,
      secondaryMuscles: e.secondaryMuscles,
      instructions: e.instructions,
      source: e.source,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}

/** Lightweight projection used by the fuzzy-search endpoint (source parity). */
export class ExerciseSearchHitDto {
  @ApiProperty({ example: 'EIeI8Vf' })
  exerciseId!: string;

  @ApiProperty({ example: 'barbell bench press' })
  name!: string;

  @ApiProperty({ example: 'https://static.exercisedb.dev/media/EIeI8Vf.gif' })
  gifUrl!: string;
}

/** `{ success, data }` for a single exercise. */
export class ExerciseItemResponse {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: ExerciseDto })
  data!: ExerciseDto;
}

/** `{ success, meta, data }` for a list of exercises. */
export class ExerciseListResponse {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: PageMeta })
  meta!: PageMeta;

  @ApiProperty({ type: [ExerciseDto] })
  data!: ExerciseDto[];
}

/** `{ success, data }` for fuzzy search (no pagination meta — source parity). */
export class ExerciseSearchResponse {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [ExerciseSearchHitDto] })
  data!: ExerciseSearchHitDto[];
}
