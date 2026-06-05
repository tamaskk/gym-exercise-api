import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { handle, itemResponse } from '@/lib/http/respond';
import * as tasks from '@/lib/services/workout-tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PATCH /api/v1/workout-tasks/:id/start — draft → in_progress. */
export function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    await connectDB();
    return itemResponse(tasks.toWorkoutTaskDto(await tasks.start(params.id)));
  });
}
