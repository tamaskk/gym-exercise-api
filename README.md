# Gym Exercise & Workout-Task API (Next.js)

A **Next.js (App Router) + MongoDB** REST API that mirrors and extends the
[ExerciseDB v1 dataset](https://oss.exercisedb.dev/api/v1) (by **AscendAPI**). It
syncs the upstream catalogue into MongoDB, exposes rich filter/search/CRUD
endpoints over it, and adds a **Workout-Task** domain so users can build and work
through tracked workouts (search → create → complete).

Built as Next.js Route Handlers so it **deploys to Vercel with zero config**.

> **Attribution:** Exercise data © **AscendAPI** (ExerciseDB) — <https://ascendapi.com>.
> Surfaced in `GET /api/v1/liveness`, the Swagger description, and every sync result.

---

## Stack & decisions

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | API as Route Handlers under `app/api/v1/*`; one-click Vercel deploy. |
| Persistence | **MongoDB + Mongoose** | Document model fits the data; one connection cached across serverless invocations (`lib/db.ts`). |
| Validation | **Zod** | Schema validation for request bodies; errors map to the 400 envelope. |
| Fuzzy search | **Fuse.js** | `search` + `threshold` (0 = exact, 1 = loose), same as the source. |
| Pagination | Reusable keyset cursor helper | One implementation in `lib/http/pagination.ts`; opaque exerciseId / task-id cursors, same `meta` as the source. |
| Errors | Central `handle()` wrapper | Every route maps thrown errors to `{ success:false, error:{...} }` across 400/404/409/500. |

## Project structure

```
src/
  app/
    page.tsx                          Landing page (endpoint list)
    docs/page.tsx                     Swagger UI (reads /api/v1/openapi.json)
    api/v1/
      liveness/route.ts               GET  health check
      exercises/route.ts              GET  filter   | POST create
      exercises/search/route.ts       GET  fuzzy search
      exercises/bodyparts|muscles|equipments/route.ts
      exercises/[exerciseId]/route.ts GET | PATCH | DELETE
      bodyparts|muscles|equipments/route.ts   GET metadata lists
      sync/route.ts                   POST sync (chunkable)
      sync/status/route.ts            GET  progress
      workout-tasks/route.ts          GET list | POST create
      workout-tasks/[id]/route.ts     GET | PATCH | DELETE
      workout-tasks/[id]/start|complete/route.ts          PATCH
      workout-tasks/[id]/items/[itemId]/complete/route.ts PATCH
      openapi.json/route.ts           GET  OpenAPI spec
  lib/
    db.ts                 serverless Mongoose connection cache + ATTRIBUTION
    models/               Mongoose schemas (exercise, metadata, workout-task)
    http/                 errors, respond (envelopes + handle), pagination
    validation/           Zod schemas
    services/             exercises, metadata, workout-tasks, sync logic
    exercisedb-client.ts  upstream fetch + retry/backoff
    openapi.ts            OpenAPI 3 spec
scripts/sync.ts           local full-sync runner (npm run sync:local)
tests/services.test.ts    service tests (in-memory MongoDB)
```

## Getting started

> Requires **Node.js ≥ 18** and a **MongoDB** database (Atlas or local `mongod`).

```bash
npm install
cp .env.example .env          # then set MONGODB_URI
npm run dev                   # http://localhost:3000
```

- Landing page: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/docs`
- API base: `http://localhost:3000/api/v1`

> **Tip:** include a database name in the URI path (`.../exercise-api`), otherwise
> MongoDB defaults to the `test` database.

## Environment variables

See [`.env.example`](.env.example):

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/exercise-api` | MongoDB connection string. |
| `SOURCE_API_BASE_URL` | `https://oss.exercisedb.dev/api/v1` | Upstream base URL. |
| `SOURCE_API_TIMEOUT_MS` | `15000` | Per-request timeout. |
| `SYNC_PAGE_SIZE` | `25` | Source page size (max 25). |
| `SYNC_REQUEST_DELAY_MS` | `250` | Throttle between source page requests. |
| `SYNC_MAX_RETRIES` | `5` | Retry attempts (429/5xx/network). |

> Don't set `PORT` on Vercel — the platform handles it.

## Syncing the dataset

Pull the ~1,500 upstream exercises + metadata into MongoDB. Two ways:

**A) Locally (recommended for the initial load — no time limit):**
```bash
npm run sync:local
```

**B) Over HTTP** (`POST /api/v1/sync`). The full walk takes ~80s, which can
exceed serverless limits, so the endpoint is **chunkable**:
```bash
# one shot (fine locally / on a long-timeout host)
curl -X POST http://localhost:3000/api/v1/sync

# chunked: 20 pages per call, then continue from the returned nextCursor
curl -X POST "http://localhost:3000/api/v1/sync?maxPages=20"
# -> { "done": false, "nextCursor": "abc123", ... }
curl -X POST "http://localhost:3000/api/v1/sync?maxPages=20&after=abc123"
# repeat until { "done": true }
```
Progress: `GET /api/v1/sync/status`. Upserts are idempotent (safe to re-run).

## API reference

All under `/api/v1`. Interactive docs at **`/docs`**.

| Method | Path | Description |
|---|---|---|
| `GET` | `/exercises` | Filter by name, target/secondary muscles, body parts, equipment + cursor pagination. |
| `GET` | `/exercises/search` | Fuzzy search (`search`, `threshold`, `limit`). |
| `GET` | `/exercises/bodyparts` · `/muscles` · `/equipments` | Filtered, paginated. |
| `GET` | `/exercises/:exerciseId` | Single exercise. |
| `POST` | `/exercises` | Create custom exercise. |
| `PATCH` | `/exercises/:exerciseId` | Update. |
| `DELETE` | `/exercises/:exerciseId` | Delete (`204`). |
| `GET` | `/bodyparts` · `/muscles` · `/equipments` | List metadata. |
| `POST` | `/sync` · `GET /sync/status` | Trigger / monitor sync. |
| `POST` | `/workout-tasks` | Create (optionally `seedExerciseIds`). |
| `GET` | `/workout-tasks` | List (filter `status`, paginated). |
| `GET/PATCH/DELETE` | `/workout-tasks/:id` | Detail / update / delete. |
| `PATCH` | `/workout-tasks/:id/start` · `/complete` | Lifecycle. |
| `PATCH` | `/workout-tasks/:id/items/:itemId/complete` | Mark item done. |
| `GET` | `/liveness` | Health + attribution. |

List responses use `{ success, meta, data }`; single responses `{ success, data }`;
errors `{ success:false, error:{ code, message, detail, timestamp, path } }`.

### Example: search → build a workout

```bash
curl "http://localhost:3000/api/v1/exercises?bodyParts=chest&limit=5"

curl -X POST http://localhost:3000/api/v1/workout-tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Push day","seedExerciseIds":["EIeI8Vf","trmaT4d"]}'

curl -X PATCH http://localhost:3000/api/v1/workout-tasks/<id>/start
curl -X PATCH http://localhost:3000/api/v1/workout-tasks/<id>/items/<itemId>/complete
curl -X PATCH http://localhost:3000/api/v1/workout-tasks/<id>/complete
```

## Deploy to Vercel

1. Push to GitHub (already wired to `tamaskk/gym-exercise-api`).
2. [vercel.com/new](https://vercel.com/new) → import the repo. Next.js is detected
   automatically — no build config needed.
3. **Environment Variables** → add `MONGODB_URI` (your Atlas string, **with** a db
   name like `/exercise-api`).
4. **MongoDB Atlas → Network Access** → add `0.0.0.0/0` so Vercel can connect.
5. Deploy. Then populate the data:
   ```bash
   # easiest: run the local sync once against the same Atlas DB
   npm run sync:local
   # or chunk it over HTTP on the deployment:
   curl -X POST "https://<your-app>.vercel.app/api/v1/sync?maxPages=20"
   ```

Docs live at `https://<your-app>.vercel.app/docs`.

> **Serverless note:** `POST /sync` may exceed the function time limit (Vercel
> Hobby ≤ 60s) for a full walk — use `?maxPages=` to chunk it, or just run
> `npm run sync:local` once against the same database.

## Testing

```bash
npm test
```
Tests spin up a throwaway MongoDB via `mongodb-memory-server` (downloads a `mongod`
binary once), so they need no external database. Coverage: exercise
filtering/pagination/fuzzy-search/upsert/CRUD and the full workout-task lifecycle.

---

Built with Next.js. Exercise data © AscendAPI (ExerciseDB).
