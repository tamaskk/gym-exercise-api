# Gym Exercise & Workout-Task API

A production-quality **NestJS + TypeScript** REST API that mirrors and extends the
[ExerciseDB v1 dataset](https://oss.exercisedb.dev/api/v1) (by **AscendAPI**). It
syncs the upstream catalogue into a local database, exposes rich
filter/search/CRUD endpoints over it, and adds a **Workout-Task** domain so users
can build and work through tracked workouts (search → create → complete).

> **Attribution:** Exercise data © **AscendAPI** (ExerciseDB) — <https://ascendapi.com>.
> Attribution is required by the source dataset's terms and is surfaced in
> `GET /api/v1/liveness`, the Swagger description, and every sync result.

---

## Contents

- [Architecture & decisions](#architecture--decisions)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database & migrations](#database--migrations)
- [Syncing the dataset](#syncing-the-dataset)
- [API reference](#api-reference)
- [Pagination model](#pagination-model)
- [Error model](#error-model)
- [Testing](#testing)

---

## Architecture & decisions

| Concern | Choice | Why |
|---|---|---|
| Framework | NestJS 10 | Modular DI, first-class Swagger & validation. |
| Persistence | **MongoDB + Mongoose** (`@nestjs/mongoose`) | Document model fits the exercise shape (nested string arrays, embedded workout items) with no joins. Mongoose integrates natively with Nest DI and gives schema-level validation & indexes. Works against MongoDB Atlas or a local `mongod`. |
| Array storage | Native string arrays (lower-cased on ingestion) | Mongo filters arrays directly with `$all`, so case-insensitive token filtering needs no extra columns. Taxonomy fields are indexed. |
| Fuzzy search | **Fuse.js** | Matches the source's `search` + `threshold` (0 = exact, 1 = loose) semantics. |
| HTTP client | `@nestjs/axios` (HttpModule) | Sync client with retry + exponential backoff + throttling. |
| Pagination | Reusable keyset (cursor) helper | One implementation (`common/pagination`) shared by every list endpoint; opaque cursors are exerciseId / task-id values, exactly like the source. |
| Validation | Global `ValidationPipe` (`whitelist`, `transform`) | DTOs validated & coerced; unknown props rejected. |
| Errors | Global exception filter | Maps everything to the documented `{ success, error }` model across 400/401/403/404/405/409/412/429/500. |

All routes are served under the `/api/v1` prefix to mirror the upstream surface.

## Project structure

```
exercise-api/
├── src/
│   ├── main.ts                      # Bootstrap: prefix, CORS, Swagger at /docs
│   ├── app.module.ts                # Root module: config, TypeORM, global pipe & filter
│   ├── config/
│   │   ├── configuration.ts         # Typed config from env
│   │   └── env.validation.ts        # Boot-time env validation
│   ├── common/
│   │   ├── dto/                      # PaginationQueryDto, response envelopes (PageMeta)
│   │   ├── decorators/              # @ApiStandardErrors()
│   │   ├── errors/                  # ApiErrorResponse model + status→name map
│   │   ├── filters/                 # AllExceptionsFilter
│   │   ├── pagination/             # Reusable cursor pagination helper (Mongoose)
│   │   └── transformers/           # CSV → lower-cased string[] transform
│   ├── exercises/                   # schema, DTOs, service, controller, unit test
│   ├── metadata/                    # bodyparts / muscles / equipments schemas
│   ├── sync/                        # ExerciseDbClient + SyncService + controller
│   ├── workout-tasks/               # task schema (embedded items), DTOs, service, controller, unit test
│   └── health/                      # GET /liveness
└── test/
    ├── app.e2e-spec.ts              # End-to-end HTTP tests (in-memory SQLite)
    └── jest-e2e.json
```

## Getting started

> Requires **Node.js ≥ 18** and a **MongoDB** instance (MongoDB Atlas or a local
> `mongod`).

```bash
# 1. Install dependencies
npm install

# 2. Create your env file and set MONGODB_URI
cp .env.example .env
#    e.g. MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/exercise-api

# 3. Run in watch mode
npm run start:dev

# 4. Open the docs
open http://localhost:3000/docs
```

The API is now live at `http://localhost:3000/api/v1`. Collections and indexes are
created automatically on first use; the DB will be empty until you run a sync.

> **Tip:** include a database name in the URI path (`.../exercise-api`). If you
> omit it, MongoDB defaults to the `test` database.

## Environment variables

See [`.env.example`](.env.example). Key variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/exercise-api` | MongoDB connection string (Atlas SRV URI or local). Include a DB name in the path. |
| `SOURCE_API_BASE_URL` | `https://oss.exercisedb.dev/api/v1` | Upstream base URL. |
| `SOURCE_API_TIMEOUT_MS` | `15000` | Per-request timeout. |
| `SYNC_PAGE_SIZE` | `25` | Source page size while walking pagination (max 25). |
| `SYNC_REQUEST_DELAY_MS` | `250` | Throttle between source page requests. |
| `SYNC_MAX_RETRIES` | `5` | Retry attempts per source request (429/5xx/network). |

The environment is validated at boot — a bad value fails fast with a clear message.

## Database & schema

Schemas live next to each module under `*/schemas/*.schema.ts` (Mongoose). There
are no migrations to run: Mongoose creates collections on first write and builds
the declared indexes automatically (unique `exerciseId`, indexed taxonomy fields,
indexed workout `status`). Sync upserts are idempotent, so re-running `POST /sync`
never duplicates data.

## Syncing the dataset

Pull the **entire** upstream catalogue (~1,500+ exercises) plus metadata into the
local DB:

```bash
curl -X POST http://localhost:3000/api/v1/sync
```

The sync service:

- Walks the source's **cursor pagination** to completion (`after = nextCursor`
  until `hasNextPage` is false).
- **Throttles** between pages and **retries** transient failures (429/5xx/network)
  with exponential backoff (honouring `Retry-After`).
- **Upserts** idempotently on `exerciseId` — safe to re-run anytime.
- Syncs **body parts / muscles / equipment** from their endpoints, unioned with
  values discovered on exercises.
- Is guarded against concurrent runs (returns `already_running`).

Poll progress while it runs:

```bash
curl http://localhost:3000/api/v1/sync/status
```

## API reference

All under `/api/v1`. Full interactive docs at **`/docs`**.

### Exercises

| Method | Path | Description |
|---|---|---|
| `GET` | `/exercises` | Advanced filtering: `name`, `targetMuscles`, `secondaryMuscles`, `bodyParts`, `equipments` (CSV) + cursor pagination. |
| `GET` | `/exercises/search` | Fuzzy search: `search`, `threshold` (0–1), `limit`. |
| `GET` | `/exercises/bodyparts` | Filter by `bodyParts`, paginated. |
| `GET` | `/exercises/muscles` | Filter by `targetMuscles` / `secondaryMuscles`, paginated. |
| `GET` | `/exercises/equipments` | Filter by `equipments`, paginated. |
| `GET` | `/exercises/:exerciseId` | Single exercise. |
| `POST` | `/exercises` | Create a custom exercise. |
| `PATCH` | `/exercises/:exerciseId` | Update. |
| `DELETE` | `/exercises/:exerciseId` | Delete (`204`). |

### Metadata

| Method | Path | Description |
|---|---|---|
| `GET` | `/bodyparts` | List all body parts. |
| `GET` | `/muscles` | List all muscles. |
| `GET` | `/equipments` | List all equipment. |

### Workout tasks

| Method | Path | Description |
|---|---|---|
| `POST` | `/workout-tasks` | Create a task (optionally seeded from `items` / `seedExerciseIds`). |
| `GET` | `/workout-tasks` | List, filter by `status`, paginated. |
| `GET` | `/workout-tasks/:id` | Detail. |
| `PATCH` | `/workout-tasks/:id` | Rename / replace & reorder items. |
| `PATCH` | `/workout-tasks/:id/items/:itemId/complete` | Mark an item done. |
| `PATCH` | `/workout-tasks/:id/start` | `draft → in_progress`. |
| `PATCH` | `/workout-tasks/:id/complete` | `in_progress → completed`. |
| `DELETE` | `/workout-tasks/:id` | Delete (`204`). |

### Sync & health

| Method | Path | Description |
|---|---|---|
| `POST` | `/sync` | Trigger a full sync; reports counts & timing. |
| `GET` | `/sync/status` | Current/last sync progress. |
| `GET` | `/liveness` | Health check + attribution. |

### Example: search → create a workout

```bash
# 1. Find chest exercises
curl "http://localhost:3000/api/v1/exercises?bodyParts=chest&limit=5"

# 2. Build a workout from two of them
curl -X POST http://localhost:3000/api/v1/workout-tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Push day","seedExerciseIds":["EIeI8Vf","trmaT4d"]}'

# 3. Start it, complete an item, complete the workout
curl -X PATCH http://localhost:3000/api/v1/workout-tasks/<id>/start
curl -X PATCH http://localhost:3000/api/v1/workout-tasks/<id>/items/<itemId>/complete
curl -X PATCH http://localhost:3000/api/v1/workout-tasks/<id>/complete
```

## Deploy to Render

This repo includes a [`render.yaml`](render.yaml) Blueprint that deploys the API
as an always-on Node web service. The database stays on MongoDB Atlas.

1. **Push to GitHub** (Render deploys from a Git repo):
   ```bash
   git init && git add -A && git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/exercise-api.git
   git push -u origin main
   ```
2. **Create the service:** in the [Render dashboard](https://dashboard.render.com)
   → **New → Blueprint**, pick your repo. Render reads `render.yaml`.
3. **Set the secret:** add `MONGODB_URI` (your Atlas SRV string, **with** a db name
   like `/exercise-api`). It's marked `sync: false`, so it must be set in the
   dashboard, never committed.
4. **Allow Render in Atlas:** Atlas → **Network Access** → add `0.0.0.0/0` (or
   Render's egress IPs) so the service can connect.
5. **Deploy.** Render runs `npm ci && npm run build`, then `npm run start:prod`,
   and health-checks `/api/v1/liveness`.
6. **Populate the data once it's live:**
   ```bash
   curl -X POST https://<your-service>.onrender.com/api/v1/sync
   ```

Docs will be at `https://<your-service>.onrender.com/docs`.

> **Free plan caveat:** the service spins down after inactivity, so the first
> request after idle takes ~30s to wake (and a sync started right after a cold
> start counts against that). Upgrade to a paid instance to keep it warm.

> **Don't set `PORT`** — Render injects it and `main.ts` already reads
> `process.env.PORT`.

## Pagination model

Every list endpoint returns the source-compatible envelope:

```json
{
  "success": true,
  "meta": {
    "total": 1789,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "nextCursor": "EIeI8Vf",
    "previousCursor": null
  },
  "data": [ /* ... */ ]
}
```

- `limit`: min `1`, max `25`, default `10`.
- Forward: pass `after = meta.nextCursor`. Backward: pass `before = meta.previousCursor`.
- Cursors are opaque (exerciseId / task id). Keyset pagination is used under the
  hood (`$gt`/`$lt` on the sorted cursor field) for stable, efficient paging — see
  `common/pagination/cursor-pagination.ts`.

## Error model

Errors use a consistent envelope across all documented status codes
(400/401/403/404/405/409/412/429/500):

```json
{
  "success": false,
  "error": {
    "code": 404,
    "message": "Not Found",
    "detail": "Exercise 'xyz' not found.",
    "timestamp": "2026-06-05T10:00:00.000Z",
    "path": "/api/v1/exercises/xyz"
  }
}
```

## Testing

Tests spin up a throwaway MongoDB via `mongodb-memory-server` (a `mongod` binary
is downloaded once on first run), so they need no external database and run fully
offline after that.

```bash
# Unit tests (services, in-memory MongoDB)
npm test

# End-to-end tests (full HTTP stack, in-memory MongoDB, no network)
npm run test:e2e

# Coverage
npm run test:cov
```

Included examples:

- `src/exercises/exercises.service.spec.ts` — filtering, cursor pagination, fuzzy
  search, idempotent upsert, create/update/conflict.
- `src/workout-tasks/workout-tasks.service.spec.ts` — the full task lifecycle and
  guard rails.
- `test/app.e2e-spec.ts` — liveness, exercise CRUD, validation/error envelope, and
  an end-to-end workout flow.

---

Built with NestJS. Exercise data © AscendAPI (ExerciseDB).
