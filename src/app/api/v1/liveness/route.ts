import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { ATTRIBUTION, connectDB } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/v1/liveness — health check + attribution. */
export async function GET(_req: NextRequest) {
  let database = 'down';
  try {
    await connectDB();
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.admin().ping();
      database = 'up';
    }
  } catch {
    database = 'down';
  }
  return NextResponse.json({
    status: database === 'up' ? 'ok' : 'degraded',
    services: { database },
    attribution: ATTRIBUTION,
  });
}
