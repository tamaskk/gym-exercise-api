import { FilterQuery, Model } from 'mongoose';
import { BadRequest } from './errors';

export const PAGINATION_DEFAULT_LIMIT = 10;
export const PAGINATION_MAX_LIMIT = 25;
export const PAGINATION_MIN_LIMIT = 1;

export interface PageMeta {
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
}

export interface CursorPage<T> {
  data: T[];
  meta: PageMeta;
}

export interface PaginationParams {
  limit: number;
  after?: string;
  before?: string;
}

/** Parses & validates `limit` (1–25, default 10), `after`, `before`. */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const rawLimit = searchParams.get('limit');
  let limit = PAGINATION_DEFAULT_LIMIT;
  if (rawLimit !== null && rawLimit !== '') {
    const n = Number.parseInt(rawLimit, 10);
    if (Number.isNaN(n)) throw BadRequest('limit must be an integer.');
    if (n < PAGINATION_MIN_LIMIT || n > PAGINATION_MAX_LIMIT) {
      throw BadRequest(
        `limit must be between ${PAGINATION_MIN_LIMIT} and ${PAGINATION_MAX_LIMIT}.`,
      );
    }
    limit = n;
  }
  const after = searchParams.get('after') || undefined;
  const before = searchParams.get('before') || undefined;
  if (after && before) {
    throw BadRequest('Provide only one of `after` or `before`, not both.');
  }
  return { limit, after, before };
}

/** Parses a comma-separated query param into a lower-cased, de-duped array. */
export function parseCsvLower(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const cleaned = value
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return cleaned.length ? Array.from(new Set(cleaned)) : undefined;
}

/**
 * Reusable keyset (cursor) pagination over a Mongoose model. Orders by a single
 * unique field (the cursor). Forward pages match `cursorField > after`
 * ascending; backward pages match `< before` descending then flip. Fetches
 * `limit + 1` to detect another page and counts `total` separately.
 */
export async function paginateWithCursor<T>(opts: {
  model: Model<T>;
  filter: FilterQuery<T>;
  cursorField: string;
  params: PaginationParams;
}): Promise<CursorPage<T>> {
  const { model, filter, cursorField, params } = opts;
  const { limit, after, before } = params;

  const total = await model.countDocuments(filter).exec();

  const isBackward = Boolean(before);
  const cursorValue = after ?? before;
  const query: FilterQuery<T> = { ...filter };
  if (cursorValue) {
    (query as Record<string, unknown>)[cursorField] = isBackward
      ? { $lt: cursorValue }
      : { $gt: cursorValue };
  }

  const rows = (await model
    .find(query)
    .sort({ [cursorField]: isBackward ? -1 : 1 })
    .limit(limit + 1)
    .lean()
    .exec()) as T[];

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const ordered = isBackward ? [...pageRows].reverse() : pageRows;

  const read = (row: T) => String((row as Record<string, unknown>)[cursorField]);
  const firstCursor = ordered.length ? read(ordered[0]) : null;
  const lastCursor = ordered.length ? read(ordered[ordered.length - 1]) : null;

  let hasNextPage: boolean;
  let hasPreviousPage: boolean;
  if (isBackward) {
    hasPreviousPage = hasMore;
    hasNextPage = true;
  } else {
    hasNextPage = hasMore;
    hasPreviousPage = Boolean(after);
  }

  return {
    data: ordered,
    meta: {
      total,
      hasNextPage,
      hasPreviousPage,
      nextCursor: hasNextPage ? lastCursor : null,
      previousCursor: hasPreviousPage ? firstCursor : null,
    },
  };
}
