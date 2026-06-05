import mongoose, { InferSchemaType, Model, Schema } from 'mongoose';

export enum ExerciseSource {
  EXERCISEDB = 'exercisedb',
  CUSTOM = 'custom',
}

/**
 * Exercise document. Taxonomy fields are plain string arrays stored lower-cased
 * on ingestion, so Mongo's native `$all` handles case-insensitive filtering with
 * no extra columns. `timestamps` adds createdAt / updatedAt.
 */
const ExerciseSchema = new Schema(
  {
    exerciseId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    gifUrl: { type: String, required: true },
    targetMuscles: { type: [String], default: [], index: true },
    bodyParts: { type: [String], default: [], index: true },
    equipments: { type: [String], default: [], index: true },
    secondaryMuscles: { type: [String], default: [] },
    instructions: { type: [String], default: [] },
    source: {
      type: String,
      enum: Object.values(ExerciseSource),
      default: ExerciseSource.EXERCISEDB,
    },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'exercises' },
);

export type ExerciseDoc = InferSchemaType<typeof ExerciseSchema>;

export const Exercise: Model<ExerciseDoc> =
  (mongoose.models.Exercise as Model<ExerciseDoc>) ||
  mongoose.model<ExerciseDoc>('Exercise', ExerciseSchema);
