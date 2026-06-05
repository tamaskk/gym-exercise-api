import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { handle, rawResponse } from '@/lib/http/respond';
import { getStatus } from '@/lib/services/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/v1/sync/status — current/last sync progress + DB total. */
export function GET(req: NextRequest) {
  return handle(req, async () => {
    await connectDB();
    return rawResponse({ success: true, data: await getStatus() });
  });
}
