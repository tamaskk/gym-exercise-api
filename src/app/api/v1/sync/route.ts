import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { handle, rawResponse } from '@/lib/http/respond';
import { runSync } from '@/lib/services/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Vercel: allow up to 60s. Use ?maxPages= to chunk if your plan caps lower.
export const maxDuration = 60;

/**
 * POST /api/v1/sync — pull the upstream dataset into MongoDB.
 *
 * Query/body options:
 *   - maxPages: number — walk at most N source pages this call (for serverless
 *     time limits). Omit to walk everything (best run locally).
 *   - after: string — continue from a previous `nextCursor`.
 *
 * Returns `{ done, nextCursor, ... }`; when `done` is false, call again with
 * `?after=<nextCursor>` to continue.
 */
export function POST(req: NextRequest) {
  return handle(req, async () => {
    await connectDB();
    const sp = req.nextUrl.searchParams;

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // no body is fine
    }

    const maxPagesRaw = sp.get('maxPages') ?? (body.maxPages as string | undefined);
    const after = sp.get('after') ?? (body.after as string | undefined) ?? undefined;
    const maxPages =
      maxPagesRaw !== undefined && maxPagesRaw !== null && `${maxPagesRaw}` !== ''
        ? Number.parseInt(`${maxPagesRaw}`, 10)
        : undefined;

    const result = await runSync({ maxPages, after });
    return rawResponse(result);
  });
}
