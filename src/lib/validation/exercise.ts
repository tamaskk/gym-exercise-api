import { z } from 'zod';

const url = z.string().url('must be a valid URL');

/** Body schema for `POST /exercises`. */
export const createExerciseSchema = z.object({
  exerciseId: z.string().min(1).max(120).optional(),
  name: z.string().min(1).max(200),
  gifUrl: url,
  targetMuscles: z.array(z.string()).min(1, 'at least one target muscle'),
  bodyParts: z.array(z.string()).min(1, 'at least one body part'),
  equipments: z.array(z.string()).default([]),
  secondaryMuscles: z.array(z.string()).default([]),
  instructions: z.array(z.string()).default([]),
});

/** Body schema for `PATCH /exercises/:exerciseId` (all optional, no id change). */
export const updateExerciseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  gifUrl: url.optional(),
  targetMuscles: z.array(z.string()).optional(),
  bodyParts: z.array(z.string()).optional(),
  equipments: z.array(z.string()).optional(),
  secondaryMuscles: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
