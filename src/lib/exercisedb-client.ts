/**
 * Resilient client for the upstream ExerciseDB v1 API (AscendAPI). Uses the
 * global `fetch` with retry + exponential backoff (honouring `Retry-After`) and
 * a per-request timeout. Data served through here originates from AscendAPI's
 * dataset and must be credited.
 */

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

const cfg = () => ({
  baseUrl: process.env.SOURCE_API_BASE_URL ?? 'https://oss.exercisedb.dev/api/v1',
  timeoutMs: Number.parseInt(process.env.SOURCE_API_TIMEOUT_MS ?? '15000', 10),
  maxRetries: Number.parseInt(process.env.SYNC_MAX_RETRIES ?? '5', 10),
  delayMs: Number.parseInt(process.env.SYNC_REQUEST_DELAY_MS ?? '250', 10),
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(path: string): Promise<T> {
  const { baseUrl, timeoutMs, maxRetries, delayMs } = cfg();
  const url = `${baseUrl}${path}`;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      clearTimeout(timer);

      if (res.ok) return (await res.json()) as T;

      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === maxRetries) {
        throw new Error(`GET ${url} failed with HTTP ${res.status}`);
      }
      const retryAfter = res.headers.get('retry-after');
      await sleep(backoff(attempt, delayMs, retryAfter));
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const networkRetryable = isAbort || err instanceof TypeError;
      if (!networkRetryable || attempt === maxRetries) throw err;
      await sleep(backoff(attempt, delayMs, null));
    }
  }
  throw new Error(`Exhausted retries for ${url}`);
}

function backoff(attempt: number, base: number, retryAfter: string | null): number {
  if (retryAfter) {
    const secs = Number.parseInt(retryAfter, 10);
    if (!Number.isNaN(secs)) return secs * 1000;
  }
  const exp = base * 2 ** attempt;
  return Math.min(exp + exp * 0.25 * Math.random(), 30_000);
}

export function fetchExercisesPage(params: {
  limit: number;
  after?: string;
}): Promise<SourceListResponse> {
  const q = new URLSearchParams({ limit: String(params.limit) });
  if (params.after) q.set('after', params.after);
  return getJson<SourceListResponse>(`/exercises?${q.toString()}`);
}

async function fetchNamed(path: string): Promise<string[]> {
  const res = await getJson<{ data: Array<{ name: string }> }>(path);
  return (res.data ?? []).map((d) => d.name);
}

export const fetchBodyParts = () => fetchNamed('/bodyparts');
export const fetchMuscles = () => fetchNamed('/muscles');
export const fetchEquipments = () => fetchNamed('/equipments');
