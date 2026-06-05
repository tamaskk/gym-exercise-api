import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { ExercisesService } from '../exercises/exercises.service';
import { MetadataService } from '../metadata/metadata.service';
import { ExerciseDbClient, SourceExercise } from './exercisedb.client';
import { SyncResultDto } from './dto/sync-result.dto';

export const ATTRIBUTION =
  'Exercise data © AscendAPI (ExerciseDB). https://ascendapi.com';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Snapshot of an in-progress (or last) sync, surfaced via `GET /sync/status`. */
export interface SyncProgress {
  running: boolean;
  pagesWalked: number;
  exercisesFetched: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
}

/**
 * Orchestrates a full ingestion of the upstream dataset into the local DB.
 *
 *  - Walks the source's cursor pagination to completion (`after = nextCursor`
 *    until `hasNextPage` is false).
 *  - Throttles between pages to respect rate limits.
 *  - Upserts exercises idempotently (safe to re-run).
 *  - Syncs body parts / muscles / equipment from their dedicated endpoints and
 *    also unions any values discovered on exercises (belt-and-braces).
 *  - Guards against concurrent runs with a simple in-process lock.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly source: AppConfig['source'];
  private running = false;
  private progress: SyncProgress = {
    running: false,
    pagesWalked: 0,
    exercisesFetched: 0,
    startedAt: null,
    finishedAt: null,
    lastError: null,
  };

  constructor(
    private readonly client: ExerciseDbClient,
    private readonly exercises: ExercisesService,
    private readonly metadata: MetadataService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.source = config.get('source', { infer: true });
  }

  getProgress(): SyncProgress {
    return { ...this.progress };
  }

  /** Trigger a full sync. Returns `already_running` if one is in flight. */
  async runFullSync(): Promise<SyncResultDto> {
    const startedAt = new Date();
    if (this.running) {
      return this.alreadyRunningResult(startedAt);
    }
    this.running = true;
    this.progress = {
      running: true,
      pagesWalked: 0,
      exercisesFetched: 0,
      startedAt: startedAt.toISOString(),
      finishedAt: null,
      lastError: null,
    };

    try {
      this.logger.log('Starting full sync from ExerciseDB source...');
      const exerciseResult = await this.syncExercises(startedAt);
      const metadataResult = await this.syncMetadata(exerciseResult.discovered);

      const finishedAt = new Date();
      this.progress.running = false;
      this.progress.finishedAt = finishedAt.toISOString();
      this.running = false;

      this.logger.log(
        `Sync complete: ${exerciseResult.fetched} exercises across ${exerciseResult.pages} pages ` +
          `(${exerciseResult.inserted} inserted, ${exerciseResult.updated} updated).`,
      );

      return {
        success: true,
        status: 'completed',
        exercises: {
          fetched: exerciseResult.fetched,
          inserted: exerciseResult.inserted,
          updated: exerciseResult.updated,
        },
        metadata: metadataResult,
        pages: exerciseResult.pages,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        attribution: ATTRIBUTION,
      };
    } catch (error) {
      this.running = false;
      this.progress.running = false;
      this.progress.finishedAt = new Date().toISOString();
      this.progress.lastError =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Sync failed: ${this.progress.lastError}`);
      throw error;
    }
  }

  /** Walks the full source pagination and upserts every exercise. */
  private async syncExercises(syncedAt: Date): Promise<{
    fetched: number;
    inserted: number;
    updated: number;
    pages: number;
    discovered: {
      bodyParts: Set<string>;
      muscles: Set<string>;
      equipments: Set<string>;
    };
  }> {
    let after: string | undefined;
    let pages = 0;
    let fetched = 0;
    let inserted = 0;
    let updated = 0;
    const discovered = {
      bodyParts: new Set<string>(),
      muscles: new Set<string>(),
      equipments: new Set<string>(),
    };

    // Forward-walk until the source reports no further pages.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await this.client.fetchExercisesPage({
        limit: this.source.syncPageSize,
        after,
      });
      pages += 1;
      const batch = (page.data ?? []).map((e) => this.normalise(e));
      fetched += batch.length;

      for (const e of batch) {
        e.bodyParts.forEach((v) => discovered.bodyParts.add(v));
        e.targetMuscles.forEach((v) => discovered.muscles.add(v));
        e.secondaryMuscles.forEach((v) => discovered.muscles.add(v));
        e.equipments.forEach((v) => discovered.equipments.add(v));
      }

      if (batch.length) {
        const res = await this.exercises.upsertManyFromSource(batch, syncedAt);
        inserted += res.inserted;
        updated += res.updated;
      }

      this.progress.pagesWalked = pages;
      this.progress.exercisesFetched = fetched;

      // Live progress so the console shows what the sync is doing right now.
      const total = page.meta?.total ?? '?';
      this.logger.log(
        `Page ${pages}: fetched ${batch.length} (running total ${fetched}/${total}) ` +
          `| +${inserted} new, ~${updated} updated | nextCursor=${page.meta?.nextCursor ?? 'none'}`,
      );

      if (!page.meta?.hasNextPage || !page.meta?.nextCursor) break;
      after = page.meta.nextCursor;

      // Throttle to respect source rate limits.
      await sleep(this.source.syncRequestDelayMs);
    }

    return { fetched, inserted, updated, pages, discovered };
  }

  /** Syncs metadata from dedicated endpoints, unioned with discovered values. */
  private async syncMetadata(discovered: {
    bodyParts: Set<string>;
    muscles: Set<string>;
    equipments: Set<string>;
  }): Promise<{ bodyParts: number; muscles: number; equipments: number }> {
    this.logger.log('Exercises done. Syncing metadata (bodyparts/muscles/equipments)...');
    const [bodyParts, muscles, equipments] = await Promise.all([
      this.safeFetch(() => this.client.fetchBodyParts()),
      this.safeFetch(() => this.client.fetchMuscles()),
      this.safeFetch(() => this.client.fetchEquipments()),
    ]);

    const bodyPartNames = this.union(bodyParts, discovered.bodyParts);
    const muscleNames = this.union(muscles, discovered.muscles);
    const equipmentNames = this.union(equipments, discovered.equipments);

    const [bp, mu, eq] = await Promise.all([
      this.metadata.upsertBodyParts(bodyPartNames),
      this.metadata.upsertMuscles(muscleNames),
      this.metadata.upsertEquipments(equipmentNames),
    ]);

    return { bodyParts: bp, muscles: mu, equipments: eq };
  }

  /** Normalises a source record: trims & lower-cases all taxonomy arrays. */
  private normalise(e: SourceExercise): SourceExercise {
    const lower = (arr: string[]) =>
      (arr ?? []).map((v) => String(v).trim().toLowerCase()).filter(Boolean);
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

  private union(list: string[], set: Set<string>): string[] {
    const out = new Set(set);
    list.forEach((v) => out.add(String(v).trim().toLowerCase()));
    return Array.from(out).filter(Boolean);
  }

  /** Metadata endpoints are best-effort; a failure shouldn't abort the sync. */
  private async safeFetch(fn: () => Promise<string[]>): Promise<string[]> {
    try {
      return await fn();
    } catch (error) {
      this.logger.warn(
        `Metadata fetch failed (continuing): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  private alreadyRunningResult(startedAt: Date): SyncResultDto {
    return {
      success: false,
      status: 'already_running',
      exercises: { fetched: 0, inserted: 0, updated: 0 },
      metadata: { bodyParts: 0, muscles: 0, equipments: 0 },
      pages: 0,
      durationMs: 0,
      startedAt: startedAt.toISOString(),
      finishedAt: startedAt.toISOString(),
      attribution: ATTRIBUTION,
    };
  }
}
