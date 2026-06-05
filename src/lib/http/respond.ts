import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError, ERROR_NAMES } from './errors';
import { PageMeta } from './pagination';

/** `{ success, data }` — single item. */
export function itemResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

/** `{ success, meta, data }` — paginated list. */
export function listResponse<T>(
  data: T[],
  meta: PageMeta,
  status = 200,
): NextResponse {
  return NextResponse.json({ success: true, meta, data }, { status });
}

/** Arbitrary success body (used by /sync and /sync/status). */
export function rawResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

/** 204 No Content. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Wraps a route handler: ensures every thrown error becomes the documented
 * error envelope with the right status. ZodError → 400 with field details;
 * ApiError → its status; anything else → 500 (details hidden).
 */
export async function handle(
  req: NextRequest,
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    return errorResponse(req, err);
  }
}

export function errorResponse(req: NextRequest, err: unknown): NextResponse {
  let status = 500;
  let detail: string | string[] | undefined;

  if (err instanceof ApiError) {
    status = err.status;
    detail = err.detail ?? err.message;
  } else if (err instanceof ZodError) {
    status = 400;
    detail = err.issues.map(
      (i) => `${i.path.join('.') || '(body)'}: ${i.message}`,
    );
  } else {
    // Unexpected: log server-side, hide internals from the client.
    console.error('Unhandled error:', err);
    detail = 'An unexpected error occurred.';
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: status,
        message: ERROR_NAMES[status] ?? 'Error',
        detail,
        timestamp: new Date().toISOString(),
        path: req.nextUrl.pathname,
      },
    },
    { status },
  );
}
