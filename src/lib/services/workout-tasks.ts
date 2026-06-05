import { Conflict, NotFound } from '../http/errors';
import {
  CursorPage,
  PaginationParams,
  paginateWithCursor,
} from '../http/pagination';
import {
  WorkoutTask,
  WorkoutTaskDoc,
  WorkoutTaskStatus,
} from '../models/workout-task';
import {
  CreateWorkoutTaskInput,
  UpdateWorkoutTaskInput,
  WorkoutItemInput,
} from '../validation/workout-task';
import { findOne as findExercise } from './exercises';

export interface WorkoutTaskItemDto {
  id: string;
  exerciseId: string;
  exerciseName: string | null;
  gifUrl: string | null;
  sets: number;
  reps: number;
  weight: number;
  rest: number;
  position: number;
  done: boolean;
}

export interface WorkoutTaskDto {
  id: string;
  title: string;
  status: string;
  items: WorkoutTaskItemDto[];
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export function toWorkoutTaskDto(t: any): WorkoutTaskDto {
  return {
    id: String(t._id),
    title: t.title,
    status: t.status,
    items: (t.items ?? [])
      .slice()
      .sort((a: any, b: any) => a.position - b.position)
      .map(
        (i: any): WorkoutTaskItemDto => ({
          id: String(i._id),
          exerciseId: i.exerciseId,
          exerciseName: i.exerciseName ?? null,
          gifUrl: i.gifUrl ?? null,
          sets: i.sets,
          reps: i.reps,
          weight: i.weight,
          rest: i.rest,
          position: i.position,
          done: i.done,
        }),
      ),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    startedAt: t.startedAt ?? null,
    completedAt: t.completedAt ?? null,
  };
}

/** Validates referenced exercises and builds positioned item subdocuments. */
async function buildItems(inputs: WorkoutItemInput[]) {
  const items = [];
  for (let i = 0; i < inputs.length; i += 1) {
    const input = inputs[i];
    const exercise = await findExercise(input.exerciseId); // throws 404 if missing
    items.push({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.name,
      gifUrl: exercise.gifUrl,
      sets: input.sets ?? 3,
      reps: input.reps ?? 10,
      weight: input.weight ?? 0,
      rest: input.rest ?? 60,
      position: i,
      done: false,
    });
  }
  return items;
}

/** `POST /workout-tasks`. */
export async function create(input: CreateWorkoutTaskInput): Promise<WorkoutTaskDoc> {
  const inputs: WorkoutItemInput[] = [
    ...(input.items ?? []),
    ...(input.seedExerciseIds ?? []).map((exerciseId) => ({ exerciseId })),
  ];
  const items = await buildItems(inputs);
  const created = await WorkoutTask.create({
    title: input.title,
    status: WorkoutTaskStatus.DRAFT,
    items,
    startedAt: null,
    completedAt: null,
  });
  return created.toObject();
}

/** `GET /workout-tasks`. */
export function findMany(
  status: WorkoutTaskStatus | undefined,
  params: PaginationParams,
): Promise<CursorPage<WorkoutTaskDoc>> {
  const filter = status ? { status } : {};
  return paginateWithCursor<WorkoutTaskDoc>({
    model: WorkoutTask,
    filter,
    cursorField: '_id',
    params,
  });
}

async function loadDoc(id: string) {
  const doc = await WorkoutTask.findById(id).exec();
  if (!doc) throw NotFound(`Workout task '${id}' not found.`);
  return doc;
}

/** `GET /workout-tasks/:id`. */
export async function findOne(id: string): Promise<WorkoutTaskDoc> {
  return (await loadDoc(id)).toObject();
}

/** `PATCH /workout-tasks/:id`. */
export async function update(
  id: string,
  input: UpdateWorkoutTaskInput,
): Promise<WorkoutTaskDoc> {
  const task = await loadDoc(id);
  if (task.status === WorkoutTaskStatus.COMPLETED) {
    throw Conflict('A completed workout task cannot be edited.');
  }
  if (input.title !== undefined) task.title = input.title;
  if (input.items !== undefined) {
    task.set('items', await buildItems(input.items));
  }
  await task.save();
  return task.toObject();
}

/** `PATCH /workout-tasks/:id/items/:itemId/complete`. */
export async function completeItem(id: string, itemId: string): Promise<WorkoutTaskDoc> {
  const task = await loadDoc(id);
  if (task.status === WorkoutTaskStatus.COMPLETED) {
    throw Conflict('Workout task is already completed.');
  }
  const item = (task.items as any).id(itemId);
  if (!item) throw NotFound(`Item '${itemId}' not found on task '${id}'.`);
  item.done = true;
  if (task.status === WorkoutTaskStatus.DRAFT) {
    task.status = WorkoutTaskStatus.IN_PROGRESS;
    task.startedAt = new Date();
  }
  await task.save();
  return task.toObject();
}

/** `PATCH /workout-tasks/:id/start`. */
export async function start(id: string): Promise<WorkoutTaskDoc> {
  const task = await loadDoc(id);
  if (task.status !== WorkoutTaskStatus.DRAFT) {
    throw Conflict(
      `Only draft tasks can be started (current status: ${task.status}).`,
    );
  }
  if (!task.items?.length) {
    throw Conflict('Cannot start a workout task with no items.');
  }
  task.status = WorkoutTaskStatus.IN_PROGRESS;
  task.startedAt = new Date();
  await task.save();
  return task.toObject();
}

/** `PATCH /workout-tasks/:id/complete`. */
export async function complete(id: string): Promise<WorkoutTaskDoc> {
  const task = await loadDoc(id);
  if (task.status === WorkoutTaskStatus.COMPLETED) {
    throw Conflict('Workout task is already completed.');
  }
  if (task.status === WorkoutTaskStatus.DRAFT) {
    throw Conflict('Start the workout before completing it.');
  }
  task.status = WorkoutTaskStatus.COMPLETED;
  task.completedAt = new Date();
  (task.items as any).forEach((i: any) => (i.done = true));
  await task.save();
  return task.toObject();
}

/** `DELETE /workout-tasks/:id`. */
export async function remove(id: string): Promise<void> {
  const res = await WorkoutTask.deleteOne({ _id: id }).exec();
  if (!res.deletedCount) throw NotFound(`Workout task '${id}' not found.`);
}
