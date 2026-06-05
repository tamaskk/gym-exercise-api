import { NextResponse } from 'next/server';
import { buildOpenApiSpec } from '@/lib/openapi';

export const runtime = 'nodejs';

/** GET /api/v1/openapi.json — the OpenAPI 3 spec consumed by /docs. */
export function GET() {
  return NextResponse.json(buildOpenApiSpec());
}
