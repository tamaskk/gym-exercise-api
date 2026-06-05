/**
 * Centralised, typed configuration loaded from environment variables.
 * Consumed via `ConfigService<AppConfig, true>` everywhere in the app.
 */
export interface AppConfig {
  port: number;
  nodeEnv: string;
  db: {
    /** MongoDB connection string (Atlas or local). */
    uri: string;
  };
  source: {
    baseUrl: string;
    timeoutMs: number;
    syncPageSize: number;
    syncRequestDelayMs: number;
    syncMaxRetries: number;
  };
}

const toInt = (v: string | undefined, fallback: number): number => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isNaN(n) ? fallback : n;
};

export default (): AppConfig => ({
  port: toInt(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  db: {
    uri:
      process.env.MONGODB_URI ??
      'mongodb://127.0.0.1:27017/exercise-api',
  },
  source: {
    baseUrl: process.env.SOURCE_API_BASE_URL ?? 'https://oss.exercisedb.dev/api/v1',
    timeoutMs: toInt(process.env.SOURCE_API_TIMEOUT_MS, 15000),
    syncPageSize: Math.min(toInt(process.env.SYNC_PAGE_SIZE, 25), 25),
    syncRequestDelayMs: toInt(process.env.SYNC_REQUEST_DELAY_MS, 250),
    syncMaxRetries: toInt(process.env.SYNC_MAX_RETRIES, 5),
  },
});
