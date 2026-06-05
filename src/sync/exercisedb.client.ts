import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/configuration';

/** A page from the source `/exercises` family of endpoints. */
export interface SourcePageMeta {
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
}

export interface SourceExercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

interface SourceListResponse {
  success: boolean;
  meta: SourcePageMeta;
  data: SourceExercise[];
}

interface SourceNamedResponse {
  success: boolean;
  data: Array<{ name: string }>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Thin, resilient HTTP client for the upstream ExerciseDB v1 API (AscendAPI).
 *
 * Responsibilities:
 *  - Build correct URLs against the configured base URL.
 *  - Retry transient failures (network errors, 429, 5xx) with exponential
 *    backoff, honouring a `Retry-After` header when present.
 *  - Throttle between calls to respect the source's strict rate limits.
 *
 * Attribution: data served via this client originates from AscendAPI's
 * ExerciseDB dataset and must be credited accordingly.
 */
@Injectable()
export class ExerciseDbClient {
  private readonly logger = new Logger(ExerciseDbClient.name);
  private readonly source: AppConfig['source'];

  constructor(
    private readonly http: HttpService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.source = config.get('source', { infer: true });
  }

  /** Fetch one page of exercises using cursor pagination. */
  fetchExercisesPage(params: {
    limit: number;
    after?: string;
  }): Promise<SourceListResponse> {
    const query: Record<string, string> = { limit: String(params.limit) };
    if (params.after) query.after = params.after;
    return this.get<SourceListResponse>('/exercises', { params: query });
  }

  fetchBodyParts(): Promise<string[]> {
    return this.fetchNamed('/bodyparts');
  }

  fetchMuscles(): Promise<string[]> {
    return this.fetchNamed('/muscles');
  }

  fetchEquipments(): Promise<string[]> {
    return this.fetchNamed('/equipments');
  }

  /** Source health check. */
  async liveness(): Promise<{ status: string }> {
    return this.get<{ status: string }>('/liveness', {});
  }

  private async fetchNamed(path: string): Promise<string[]> {
    const res = await this.get<SourceNamedResponse>(path, {});
    return (res.data ?? []).map((d) => d.name);
  }

  /**
   * Performs a GET with retry + exponential backoff. Retries on network errors,
   * HTTP 429, and 5xx. Non-retryable 4xx errors propagate immediately.
   */
  private async get<T>(path: string, config: AxiosRequestConfig): Promise<T> {
    const url = `${this.source.baseUrl}${path}`;
    const maxRetries = this.source.syncMaxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const response = await firstValueFrom(
          this.http.get<T>(url, {
            timeout: this.source.timeoutMs,
            ...config,
          }),
        );
        return response.data;
      } catch (error) {
        const axiosErr = error as AxiosError;
        const status = axiosErr.response?.status;
        const retryable =
          status === undefined || status === 429 || (status >= 500 && status < 600);

        if (!retryable || attempt === maxRetries) {
          this.logger.error(
            `GET ${url} failed (status=${status ?? 'network'}, attempt=${attempt + 1}): ${axiosErr.message}`,
          );
          throw error;
        }

        const retryAfterHeader = axiosErr.response?.headers?.['retry-after'];
        const backoff = this.computeBackoff(attempt, retryAfterHeader);
        this.logger.warn(
          `GET ${url} transient failure (status=${status ?? 'network'}); retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await sleep(backoff);
      }
    }

    // Unreachable, but satisfies the type checker.
    throw new Error(`Exhausted retries for ${url}`);
  }

  /** Exponential backoff with jitter; respects a numeric `Retry-After`. */
  private computeBackoff(attempt: number, retryAfter?: unknown): number {
    if (typeof retryAfter === 'string') {
      const seconds = Number.parseInt(retryAfter, 10);
      if (!Number.isNaN(seconds)) return seconds * 1000;
    }
    const base = this.source.syncRequestDelayMs;
    const exp = base * 2 ** attempt;
    const jitter = exp * 0.25 * Math.random();
    return Math.min(exp + jitter, 30_000);
  }
}
