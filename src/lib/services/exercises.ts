import Fuse from 'fuse.js';
import { FilterQuery } from 'mongoose';
import { Conflict, NotFound } from '../http/errors';
import {
  CursorPage,
  PaginationParams,
  paginateWithCursor,
} from '../http/pagination';
import { Exercise, ExerciseDoc, ExerciseSource } from '../models/exercise';
import {
  CreateExerciseInput,
  UpdateExerciseInput,
} from '../validation/exercise';

/** Public exercise shape (drops internal fields). */
export interface ExerciseDto {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toExerciseDto(e: any): ExerciseDto {
  return {
    exerciseId: e.exerciseId,
    name: e.name,
    gifUrl: e.gifUrl,
    targetMuscles: e.targetMuscles ?? [],
    bodyParts: e.bodyParts ?? [],
    equipments: e.equipments ?? [],
    secondaryMuscles: e.secondaryMuscles ?? [],
    instructions: e.instructions ?? [],
    source: e.source,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export interface ExerciseFilters {
  name?: string;
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  bodyParts?: string[];
  equipments?: string[];
}

const lower = (values?: string[]) =>
  (values ?? []).map((v) => String(v).trim().toLowerCase()).filter(Boolean);

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildFilter(filters: ExerciseFilters): FilterQuery<ExerciseDoc> {
  const filter: FilterQuery<ExerciseDoc> = {};
  if (filters.name?.trim()) {
    filter.name = { $regex: escapeRegex(filters.name.trim()), $options: 'i' };
  }
  const arr = (field: string, values?: string[]) => {
    if (values?.length)
      (filter as Record<string, unknown>)[field] = {
        $all: values.map((v) => v.toLowerCase()),
      };
  };
  arr('targetMuscles', filters.targetMuscles);
  arr('secondaryMuscles', filters.secondaryMuscles);
  arr('bodyParts', filters.bodyParts);
  arr('equipments', filters.equipments);
  return filter;
}

function paginate(
  filter: FilterQuery<ExerciseDoc>,
  params: PaginationParams,
): Promise<CursorPage<ExerciseDoc>> {
  return paginateWithCursor<ExerciseDoc>({
    model: Exercise,
    filter,
    cursorField: 'exerciseId',
    params,
  });
}

/** `GET /exercises` — advanced filtering. */
export function findMany(filters: ExerciseFilters, params: PaginationParams) {
  return paginate(buildFilter(filters), params);
}

/** `GET /exercises/bodyparts`. */
export function findByBodyParts(bodyParts: string[] | undefined, params: PaginationParams) {
  return paginate(buildFilter({ bodyParts }), params);
}

/** `GET /exercises/muscles`. */
export function findByMuscles(
  targetMuscles: string[] | undefined,
  secondaryMuscles: string[] | undefined,
  params: PaginationParams,
) {
  return paginate(buildFilter({ targetMuscles, secondaryMuscles }), params);
}

/** `GET /exercises/equipments`. */
export function findByEquipments(equipments: string[] | undefined, params: PaginationParams) {
  return paginate(buildFilter({ equipments }), params);
}

export interface SearchHit {
  exerciseId: string;
  name: string;
  gifUrl: string;
}

/** `GET /exercises/search` — fuzzy name search (Fuse.js). */
export async function search(
  term: string,
  threshold: number,
  limit: number,
): Promise<SearchHit[]> {
  const projection = (await Exercise.find(
    {},
    { exerciseId: 1, name: 1, gifUrl: 1, _id: 0 },
  )
    .lean()
    .exec()) as SearchHit[];

  const cleaned = term?.trim();
  if (!cleaned) return projection.slice(0, limit);

  const fuse = new Fuse(projection, {
    keys: ['name'],
    threshold,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });
  return fuse.search(cleaned, { limit }).map(({ item }) => item);
}

/** `GET /exercises/:exerciseId`. */
export async function findOne(exerciseId: string): Promise<ExerciseDoc> {
  const doc = await Exercise.findOne({ exerciseId }).lean().exec();
  if (!doc) throw NotFound(`Exercise '${exerciseId}' not found.`);
  return doc as ExerciseDoc;
}

function slugId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `custom-${slug || 'exercise'}`;
}

/** `POST /exercises`. */
export async function create(input: CreateExerciseInput): Promise<ExerciseDoc> {
  const exerciseId = input.exerciseId ?? slugId(input.name);
  if (await Exercise.exists({ exerciseId })) {
    throw Conflict(`Exercise '${exerciseId}' already exists.`);
  }
  const created = await Exercise.create({
    exerciseId,
    name: input.name,
    gifUrl: input.gifUrl,
    targetMuscles: lower(input.targetMuscles),
    bodyParts: lower(input.bodyParts),
    equipments: lower(input.equipments),
    secondaryMuscles: lower(input.secondaryMuscles),
    instructions: input.instructions,
    source: ExerciseSource.CUSTOM,
    lastSyncedAt: null,
  });
  return created.toObject();
}

/** `PATCH /exercises/:exerciseId`. */
export async function update(
  exerciseId: string,
  input: UpdateExerciseInput,
): Promise<ExerciseDoc> {
  const set: Record<string, unknown> = {};
  if (input.name !== undefined) set.name = input.name;
  if (input.gifUrl !== undefined) set.gifUrl = input.gifUrl;
  if (input.targetMuscles !== undefined) set.targetMuscles = lower(input.targetMuscles);
  if (input.bodyParts !== undefined) set.bodyParts = lower(input.bodyParts);
  if (input.equipments !== undefined) set.equipments = lower(input.equipments);
  if (input.secondaryMuscles !== undefined)
    set.secondaryMuscles = lower(input.secondaryMuscles);
  if (input.instructions !== undefined) set.instructions = input.instructions;

  const updated = await Exercise.findOneAndUpdate(
    { exerciseId },
    { $set: set },
    { new: true },
  )
    .lean()
    .exec();
  if (!updated) throw NotFound(`Exercise '${exerciseId}' not found.`);
  return updated as ExerciseDoc;
}

/** `DELETE /exercises/:exerciseId`. */
export async function remove(exerciseId: string): Promise<void> {
  const res = await Exercise.deleteOne({ exerciseId }).exec();
  if (!res.deletedCount) throw NotFound(`Exercise '${exerciseId}' not found.`);
}

export interface SourceRecord {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

/** Idempotent bulk upsert used by the sync service. */
export async function upsertManyFromSource(
  records: SourceRecord[],
  syncedAt: Date,
): Promise<{ inserted: number; updated: number }> {
  if (!records.length) return { inserted: 0, updated: 0 };
  const ops = records.map((r) => ({
    updateOne: {
      filter: { exerciseId: r.exerciseId },
      update: {
        $set: {
          name: r.name,
          gifUrl: r.gifUrl,
          targetMuscles: lower(r.targetMuscles),
          bodyParts: lower(r.bodyParts),
          equipments: lower(r.equipments),
          secondaryMuscles: lower(r.secondaryMuscles),
          instructions: r.instructions ?? [],
          source: ExerciseSource.EXERCISEDB,
          lastSyncedAt: syncedAt,
        },
      },
      upsert: true,
    },
  }));
  const result = await Exercise.bulkWrite(ops, { ordered: false });
  return {
    inserted: result.upsertedCount ?? 0,
    updated: result.matchedCount ?? 0,
  };
}

export function count(): Promise<number> {
  return Exercise.countDocuments().exec();
}
