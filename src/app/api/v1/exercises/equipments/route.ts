import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { handle, listResponse } from '@/lib/http/respond';
import { parseCsvLower, parsePagination } from '@/lib/http/pagination';
import * as exercises from '@/lib/services/exercises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/v1/exercises/equipments — filter by equipment. */
export function GET(req: NextRequest) {
  return handle(req, async () => {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const page = await exercises.findByEquipments(
      parseCsvLower(sp.get('equipments')),
      parsePagination(sp),
    );
    return listResponse(page.data.map(exercises.toExerciseDto), page.meta);
  });
}
