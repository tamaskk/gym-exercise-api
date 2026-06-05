import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Provenance of an exercise record. `exercisedb` rows are synced from the
 * upstream AscendAPI dataset; `custom` rows are created locally.
 */
export enum ExerciseSource {
  EXERCISEDB = 'exercisedb',
  CUSTOM = 'custom',
}

export type ExerciseDocument = HydratedDocument<Exercise>;

/**
 * MongoDB persistence model for an exercise.
 *
 * Taxonomy fields are stored as plain string arrays (lower-cased on ingestion),
 * which lets us filter case-insensitively with Mongo's native array operators
 * (`$all`) — no search-mirror columns needed. `timestamps: true` adds
 * `createdAt` / `updatedAt`.
 */
@Schema({ collection: 'exercises', timestamps: true })
export class Exercise {
  @Prop({ required: true, unique: true, index: true })
  exerciseId!: string;

  @Prop({ required: true, index: true })
  name!: string;

  @Prop({ required: true })
  gifUrl!: string;

  @Prop({ type: [String], default: [], index: true })
  targetMuscles!: string[];

  @Prop({ type: [String], default: [], index: true })
  bodyParts!: string[];

  @Prop({ type: [String], default: [], index: true })
  equipments!: string[];

  @Prop({ type: [String], default: [] })
  secondaryMuscles!: string[];

  @Prop({ type: [String], default: [] })
  instructions!: string[];

  @Prop({
    type: String,
    enum: ExerciseSource,
    default: ExerciseSource.EXERCISEDB,
  })
  source!: ExerciseSource;

  @Prop({ type: Date, default: null })
  lastSyncedAt!: Date | null;

  // Added by `timestamps: true`; declared for typing.
  createdAt!: Date;
  updatedAt!: Date;
}

export const ExerciseSchema = SchemaFactory.createForClass(Exercise);
