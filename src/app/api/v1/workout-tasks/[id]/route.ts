import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { handle, itemResponse, noContent } from '@/lib/http/respond';
import { updateWorkoutTaskSchema } from '@/lib/validation/workout-task';
import * as tasks from '@/lib/services/workout-tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** GET /api/v1/workout-tasks/:id. */
export function GET(req: NextRequest, { params }: Ctx) {
  return handle(req, async () => {
    await connectDB();
    return itemResponse(tasks.toWorkoutTaskDto(await tasks.findOne(params.id)));
  });
}

/** PATCH /api/v1/workout-tasks/:id — rename / replace & reorder items. */
export function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(req, async () => {
    await connectDB();
    const body = updateWorkoutTaskSchema.parse(await req.json());
    return itemResponse(tasks.toWorkoutTaskDto(await tasks.update(params.id, body)));
  });
}

/** DELETE /api/v1/workout-tasks/:id. */
export function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(req, async () => {
    await connectDB();
    await tasks.remove(params.id);
    return noContent();
  });
}
