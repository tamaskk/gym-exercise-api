import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { handle, itemResponse } from '@/lib/http/respond';
import * as tasks from '@/lib/services/workout-tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PATCH /api/v1/workout-tasks/:id/items/:itemId/complete — mark item done. */
export function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } },
) {
  return handle(req, async () => {
    await connectDB();
    const task = await tasks.completeItem(params.id, params.itemId);
    return itemResponse(tasks.toWorkoutTaskDto(task));
  });
}
