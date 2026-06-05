import { BadRequestException } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { PageMeta } from '../dto/response-envelope.dto';

export interface CursorPaginationOptions<T> {
  /** Mongoose model to query. */
  model: Model<T>;
  /** Base filter (all non-cursor criteria already applied). */
  filter: FilterQuery<T>;
  /**
   * Field used both for ordering and as the opaque cursor — must be unique and
   * stable, e.g. `'exerciseId'` for exercises or `'_id'` (a uuid string) for
   * workout tasks. Keyset pagination orders by this field.
   */
  cursorField: string;
  limit: number;
  after?: string;
  before?: string;
  /** Optional projection passed to `.select()`. */
  select?: string;
}

export interface CursorPage<T> {
  data: T[];
  meta: PageMeta;
}

/**
 * Reusable keyset (cursor) pagination over a Mongoose model.
 *
 * Strategy: order by a single unique field (the cursor). Forward pages match
 * `cursorField > after` (ascending); backward pages match `cursorField <
 * before` (descending) then flip the slice so callers always receive ascending
 * order. We fetch `limit + 1` docs to cheaply detect another page, and run a
 * separate `countDocuments` for `total`.
 *
 * Mirrors the source API: cursors are opaque exerciseId / task-id values and
 * `meta` exposes total / hasNextPage / hasPreviousPage / next & previous cursors.
 */
export async function paginateWithCursor<T>(
  opts: CursorPaginationOptions<T>,
): Promise<CursorPage<T>> {
  const { model, filter, cursorField, limit, after, before, select } = opts;

  if (after && before) {
    throw new BadRequestException(
      'Provide only one of `after` or `before`, not both.',
    );
  }

  const total = await model.countDocuments(filter).exec();

  const isBackward = Boolean(before);
  const cursorValue = after ?? before;

  const query: FilterQuery<T> = { ...filter };
  if (cursorValue) {
    (query as Record<string, unknown>)[cursorField] = isBackward
      ? { $lt: cursorValue }
      : { $gt: cursorValue };
  }

  let cursor = model
    .find(query)
    .sort({ [cursorField]: isBackward ? -1 : 1 })
    .limit(limit + 1);
  if (select) cursor = cursor.select(select);

  const rows = (await cursor.lean().exec()) as T[];

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const orderedRows = isBackward ? [...pageRows].reverse() : pageRows;

  const read = (row: T): string =>
    String((row as Record<string, unknown>)[cursorField]);
  const firstCursor = orderedRows.length ? read(orderedRows[0]) : null;
  const lastCursor = orderedRows.length
    ? read(orderedRows[orderedRows.length - 1])
    : null;

  let hasNextPage: boolean;
  let hasPreviousPage: boolean;
  if (isBackward) {
    hasPreviousPage = hasMore;
    hasNextPage = true; // we came from a later page
  } else {
    hasNextPage = hasMore;
    hasPreviousPage = Boolean(after);
  }

  const meta: PageMeta = {
    total,
    hasNextPage,
    hasPreviousPage,
    nextCursor: hasNextPage ? lastCursor : null,
    previousCursor: hasPreviousPage ? firstCursor : null,
  };

  return { data: orderedRows, meta };
}

/**
 * In-memory cursor pagination for already-materialised arrays (e.g. fuzzy
 * search results). Items must be pre-sorted by `getCursor` ascending.
 */
export function paginateArrayWithCursor<T>(
  items: T[],
  getCursor: (item: T) => string,
  limit: number,
  after?: string,
  before?: string,
): CursorPage<T> {
  if (after && before) {
    throw new BadRequestException(
      'Provide only one of `after` or `before`, not both.',
    );
  }

  const total = items.length;
  let startIndex = 0;
  let windowItems = items;

  if (after) {
    const idx = items.findIndex((i) => getCursor(i) === after);
    startIndex = idx === -1 ? 0 : idx + 1;
    windowItems = items.slice(startIndex);
  } else if (before) {
    const idx = items.findIndex((i) => getCursor(i) === before);
    const end = idx === -1 ? items.length : idx;
    const sliceStart = Math.max(0, end - limit);
    windowItems = items.slice(sliceStart, end);
    startIndex = sliceStart;
  }

  const page = windowItems.slice(0, limit);
  const lastIndex = startIndex + page.length;
  const hasNextPage = lastIndex < total;
  const hasPreviousPage = startIndex > 0;

  const meta: PageMeta = {
    total,
    hasNextPage,
    hasPreviousPage,
    nextCursor: hasNextPage && page.length ? getCursor(page[page.length - 1]) : null,
    previousCursor: hasPreviousPage && page.length ? getCursor(page[0]) : null,
  };

  return { data: page, meta };
}
