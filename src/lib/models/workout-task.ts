import { randomUUID } from 'crypto';
import mongoose, { InferSchemaType, Model, Schema } from 'mongoose';

export enum WorkoutTaskStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

/** Embedded workout item; Mongoose assigns each its own `_id`. */
const WorkoutTaskItemSchema = new Schema(
  {
    exerciseId: { type: String, required: true, index: true },
    exerciseName: { type: String, default: null },
    gifUrl: { type: String, default: null },
    sets: { type: Number, default: 3 },
    reps: { type: Number, default: 10 },
    weight: { type: Number, default: 0 },
    rest: { type: Number, default: 60 },
    position: { type: Number, default: 0 },
    done: { type: Boolean, default: false },
  },
  { _id: true },
);

/**
 * Workout task. `_id` is a uuid string — it doubles as the public id and the
 * stable, sortable cursor used by keyset pagination.
 */
const WorkoutTaskSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(WorkoutTaskStatus),
      default: WorkoutTaskStatus.DRAFT,
      index: true,
    },
    items: { type: [WorkoutTaskItemSchema], default: [] },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'workout_tasks', _id: false },
);

export type WorkoutTaskDoc = InferSchemaType<typeof WorkoutTaskSchema>;
export type WorkoutTaskItemDoc = InferSchemaType<typeof WorkoutTaskItemSchema>;

export const WorkoutTask: Model<WorkoutTaskDoc> =
  (mongoose.models.WorkoutTask as Model<WorkoutTaskDoc>) ||
  mongoose.model<WorkoutTaskDoc>('WorkoutTask', WorkoutTaskSchema);
