import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { handle, itemResponse, listResponse } from '@/lib/http/respond';
import { parseCsvLower, parsePagination } from '@/lib/http/pagination';
import { createExerciseSchema } from '@/lib/validation/exercise';
import * as exercises from '@/lib/services/exercises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/v1/exercises — advanced filtering with cursor pagination. */
export function GET(req: NextRequest) {
  return handle(req, async () => {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const params = parsePagination(sp);
    const page = await exercises.findMany(
      {
        name: sp.get('name') || undefined,
        targetMuscles: parseCsvLower(sp.get('targetMuscles')),
        secondaryMuscles: parseCsvLower(sp.get('secondaryMuscles')),
        bodyParts: parseCsvLower(sp.get('bodyParts')),
        equipments: parseCsvLower(sp.get('equipments')),
      },
      params,
    );
    return listResponse(page.data.map(exercises.toExerciseDto), page.meta);
  });
}

/** POST /api/v1/exercises — create a custom exercise. */
export function POST(req: NextRequest) {
  return handle(req, async () => {
    await connectDB();
    const body = createExerciseSchema.parse(await req.json());
    const created = await exercises.create(body);
    return itemResponse(exercises.toExerciseDto(created), 201);
  });
}
