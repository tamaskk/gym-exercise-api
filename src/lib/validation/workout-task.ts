import { z } from 'zod';

const workoutItemInput = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).optional(),
  reps: z.number().int().min(1).optional(),
  weight: z.number().min(0).optional(),
  rest: z.number().int().min(0).optional(),
});

/** Body schema for `POST /workout-tasks`. */
export const createWorkoutTaskSchema = z.object({
  title: z.string().min(1).max(200),
  items: z.array(workoutItemInput).optional(),
  seedExerciseIds: z.array(z.string()).optional(),
});

/** Body schema for `PATCH /workout-tasks/:id`. */
export const updateWorkoutTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  items: z.array(workoutItemInput).optional(),
});

export type WorkoutItemInput = z.infer<typeof workoutItemInput>;
export type CreateWorkoutTaskInput = z.infer<typeof createWorkoutTaskSchema>;
export type UpdateWorkoutTaskInput = z.infer<typeof updateWorkoutTaskSchema>;
