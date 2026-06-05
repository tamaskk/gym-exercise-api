import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { randomUUID } from 'crypto';

/** Lifecycle states a workout task moves through. */
export enum WorkoutTaskStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

/**
 * A single line in a workout: a reference to an exercise (by `exerciseId`) plus
 * the prescription and a per-item `done` flag. Stored as an embedded
 * subdocument; Mongoose assigns each item its own `_id`. `exerciseName` /
 * `gifUrl` are denormalised snapshots for convenient display.
 */
@Schema({ _id: true })
export class WorkoutTaskItem {
  @Prop({ required: true, index: true })
  exerciseId!: string;

  @Prop({ type: String, default: null })
  exerciseName!: string | null;

  @Prop({ type: String, default: null })
  gifUrl!: string | null;

  @Prop({ type: Number, default: 3 })
  sets!: number;

  @Prop({ type: Number, default: 10 })
  reps!: number;

  @Prop({ type: Number, default: 0 })
  weight!: number;

  @Prop({ type: Number, default: 60 })
  rest!: number;

  @Prop({ type: Number, default: 0 })
  position!: number;

  @Prop({ type: Boolean, default: false })
  done!: boolean;

  // Present on persisted subdocuments.
  _id?: Types.ObjectId;
}

export const WorkoutTaskItemSchema =
  SchemaFactory.createForClass(WorkoutTaskItem);

export type WorkoutTaskDocument = HydratedDocument<WorkoutTask>;

/**
 * A tracked workout built from one or more exercises. The `_id` is a uuid string
 * — it doubles as the public id and the (stable, sortable) pagination cursor.
 */
@Schema({ collection: 'workout_tasks', timestamps: true })
export class WorkoutTask {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({
    type: String,
    enum: WorkoutTaskStatus,
    default: WorkoutTaskStatus.DRAFT,
    index: true,
  })
  status!: WorkoutTaskStatus;

  @Prop({ type: [WorkoutTaskItemSchema], default: [] })
  items!: WorkoutTaskItem[];

  @Prop({ type: Date, default: null })
  startedAt!: Date | null;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  // Added by `timestamps: true`; declared for typing.
  createdAt!: Date;
  updatedAt!: Date;
}

export const WorkoutTaskSchema = SchemaFactory.createForClass(WorkoutTask);
