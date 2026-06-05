import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handle } from '@/lib/http/respond';
import { BadRequest } from '@/lib/http/errors';
import * as exercises from '@/lib/services/exercises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/v1/exercises/search — fuzzy search (search + threshold). */
export function GET(req: NextRequest) {
  return handle(req, async () => {
    await connectDB();
    const sp = req.nextUrl.searchParams;

    const search = sp.get('search') ?? '';
    const thresholdRaw = sp.get('threshold');
    const limitRaw = sp.get('limit');

    let threshold = 0.3;
    if (thresholdRaw !== null && thresholdRaw !== '') {
      threshold = Number(thresholdRaw);
      if (Number.isNaN(threshold) || threshold < 0 || threshold > 1) {
        throw BadRequest('threshold must be a number between 0 and 1.');
      }
    }
    let limit = 10;
    if (limitRaw !== null && limitRaw !== '') {
      limit = Number.parseInt(limitRaw, 10);
      if (Number.isNaN(limit) || limit < 1 || limit > 50) {
        throw BadRequest('limit must be between 1 and 50.');
      }
    }

    const data = await exercises.search(search, threshold, limit);
    return NextResponse.json({ success: true, data });
  });
}
