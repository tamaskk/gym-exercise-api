import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handle } from '@/lib/http/respond';
import { listEquipments } from '@/lib/services/metadata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/v1/equipments — list all equipment. */
export function GET(req: NextRequest) {
  return handle(req, async () => {
    await connectDB();
    return NextResponse.json({ success: true, data: await listEquipments() });
  });
}
