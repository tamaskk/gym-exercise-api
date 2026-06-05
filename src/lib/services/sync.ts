import { ATTRIBUTION } from '../db';
import {
  fetchBodyParts,
  fetchEquipments,
  fetchExercisesPage,
  fetchMuscles,
  SourceExercise,
} from '../exercisedb-client';
import * as exercises from './exercises';
import * as metadata from './metadata';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const pageSize = () =>
  Math.min(Number.parseInt(process.env.SYNC_PAGE_SIZE ?? '25', 10), 25);
const delayMs = () => Number.parseInt(process.env.SYNC_REQUEST_DELAY_MS ?? '250', 10);

export interface SyncProgress {
  running: boolean;
  pagesWalked: number;
  exercisesFetched: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
}

let progress: SyncProgress = {
  running: false,
  pagesWalked: 0,
  exercisesFetched: 0,
  startedAt: null,
  finishedAt: null,
  lastError: null,
};

export async function getStatus() {
  return { ...progress, totalInDb: await exercises.count() };
}

export interface SyncOptions {
  /** Continue forward from this exerciseId cursor. */
  after?: string;
  /**
   * Max source pages to walk in this call. Omit to walk to completion (good
   * locally). On serverless (≤60s), pass a small value and loop on `nextCursor`.
   */
  maxPages?: number;
}

export interface SyncResult {
  success: boolean;
  status: 'completed' | 'partial';
  done: boolean;
  nextCursor: string | null;
  pages: number;
  exercises: { fetched: number; inserted: number; updated: number };
  metadata: { bodyParts: number; muscles: number; equipments: number } | null;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  totalInDb: number;
  attribution: string;
}

function normalise(e: SourceExercise): exercises.SourceRecord {
  const lower = (a: string[]) =>
    (a ?? []).map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  return {
    exerciseId: e.exerciseId,
    name: e.name,
    gifUrl: e.gifUrl,
    targetMuscles: lower(e.targetMuscles),
    bodyParts: lower(e.bodyParts),
    equipments: lower(e.equipments),
    secondaryMuscles: lower(e.secondaryMuscles),
    instructions: e.instructions ?? [],
  };
}

/**
 * Runs a (possibly partial) sync. Walks the source cursor pagination, upserting
 * each page idempotently. When the walk reaches the end (`done`), also syncs the
 * metadata lists. Throttles between pages to respect rate limits.
 */
export async function runSync(opts: SyncOptions = {}): Promise<SyncResult> {
  const startedAt = new Date();
  progress = {
    running: true,
    pagesWalked: 0,
    exercisesFetched: 0,
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    lastError: null,
  };

  const syncedAt = new Date();
  let after = opts.after;
  let pages = 0;
  let fetched = 0;
  let inserted = 0;
  let updated = 0;
  let done = false;
  let nextCursor: string | null = after ?? null;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await fetchExercisesPage({ limit: pageSize(), after });
      pages += 1;
      const batch = (page.data ?? []).map(normalise);
      fetched += batch.length;

      if (batch.length) {
        const res = await exercises.upsertManyFromSource(batch, syncedAt);
        inserted += res.inserted;
        updated += res.updated;
      }

      progress.pagesWalked = pages;
      progress.exercisesFetched = fetched;
      // eslint-disable-next-line no-console
      console.log(
        `[sync] page ${pages}: +${batch.length} (total ${fetched}/${page.meta?.total ?? '?'}) next=${page.meta?.nextCursor ?? 'none'}`,
      );

      nextCursor = page.meta?.nextCursor ?? null;
      if (!page.meta?.hasNextPage || !nextCursor) {
        done = true;
        break;
      }
      after = nextCursor;

      if (opts.maxPages && pages >= opts.maxPages) {
        done = false;
        break;
      }
      await sleep(delayMs());
    }

    let meta: SyncResult['metadata'] = null;
    if (done) {
      // Sync metadata lists once the full walk completes.
      const [bp, mu, eq] = await Promise.all([
        safe(fetchBodyParts),
        safe(fetchMuscles),
        safe(fetchEquipments),
      ]);
      meta = {
        bodyParts: await metadata.upsertBodyParts(bp),
        muscles: await metadata.upsertMuscles(mu),
        equipments: await metadata.upsertEquipments(eq),
      };
    }

    const finishedAt = new Date();
    progress.running = false;
    progress.finishedAt = finishedAt.toISOString();

    return {
      success: true,
      status: done ? 'completed' : 'partial',
      done,
      nextCursor: done ? null : nextCursor,
      pages,
      exercises: { fetched, inserted, updated },
      metadata: meta,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      totalInDb: await exercises.count(),
      attribution: ATTRIBUTION,
    };
  } catch (err) {
    progress.running = false;
    progress.finishedAt = new Date().toISOString();
    progress.lastError = err instanceof Error ? err.message : String(err);
    throw err;
  }
}

async function safe(fn: () => Promise<string[]>): Promise<string[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}
