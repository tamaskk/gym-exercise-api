import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { handle, itemResponse, noContent } from '@/lib/http/respond';
import { updateExerciseSchema } from '@/lib/validation/exercise';
import * as exercises from '@/lib/services/exercises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: { exerciseId: string } };

/** GET /api/v1/exercises/:exerciseId. */
export function GET(req: NextRequest, { params }: Ctx) {
  return handle(req, async () => {
    await connectDB();
    const doc = await exercises.findOne(params.exerciseId);
    return itemResponse(exercises.toExerciseDto(doc));
  });
}

/** PATCH /api/v1/exercises/:exerciseId. */
export function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(req, async () => {
    await connectDB();
    const body = updateExerciseSchema.parse(await req.json());
    const doc = await exercises.update(params.exerciseId, body);
    return itemResponse(exercises.toExerciseDto(doc));
  });
}

/** DELETE /api/v1/exercises/:exerciseId. */
export function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(req, async () => {
    await connectDB();
    await exercises.remove(params.exerciseId);
    return noContent();
  });
}
