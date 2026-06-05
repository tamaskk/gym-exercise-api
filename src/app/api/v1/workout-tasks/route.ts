import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { handle, itemResponse, listResponse } from '@/lib/http/respond';
import { BadRequest } from '@/lib/http/errors';
import { parsePagination } from '@/lib/http/pagination';
import { WorkoutTaskStatus } from '@/lib/models/workout-task';
import { createWorkoutTaskSchema } from '@/lib/validation/workout-task';
import * as tasks from '@/lib/services/workout-tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/v1/workout-tasks — list (filter by status), paginated. */
export function GET(req: NextRequest) {
  return handle(req, async () => {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const statusRaw = sp.get('status') || undefined;
    if (statusRaw && !Object.values(WorkoutTaskStatus).includes(statusRaw as WorkoutTaskStatus)) {
      throw BadRequest(
        `status must be one of: ${Object.values(WorkoutTaskStatus).join(', ')}.`,
      );
    }
    const page = await tasks.findMany(
      statusRaw as WorkoutTaskStatus | undefined,
      parsePagination(sp),
    );
    return listResponse(page.data.map(tasks.toWorkoutTaskDto), page.meta);
  });
}

/** POST /api/v1/workout-tasks — create a task (optionally seeded). */
export function POST(req: NextRequest) {
  return handle(req, async () => {
    await connectDB();
    const body = createWorkoutTaskSchema.parse(await req.json());
    const created = await tasks.create(body);
    return itemResponse(tasks.toWorkoutTaskDto(created), 201);
  });
}
