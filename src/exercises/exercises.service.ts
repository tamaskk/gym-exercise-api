import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import Fuse from 'fuse.js';
import { FilterQuery, Model } from 'mongoose';
import {
  CursorPage,
  paginateWithCursor,
} from '../common/pagination/cursor-pagination';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import {
  FilterByBodyPartsDto,
  FilterByEquipmentsDto,
  FilterByMusclesDto,
  FilterExercisesDto,
} from './dto/filter-exercises.dto';
import { SearchExercisesDto } from './dto/search-exercises.dto';
import { ExerciseSearchHitDto } from './dto/exercise-response.dto';
import {
  Exercise,
  ExerciseDocument,
  ExerciseSource,
} from './schemas/exercise.schema';

const CURSOR_FIELD = 'exerciseId';

/** Source-record shape accepted by the bulk upsert (no internal fields). */
export type ExerciseSourceRecord = Pick<
  Exercise,
  | 'exerciseId'
  | 'name'
  | 'gifUrl'
  | 'targetMuscles'
  | 'bodyParts'
  | 'equipments'
  | 'secondaryMuscles'
  | 'instructions'
>;

/** Escapes user input before using it inside a RegExp (name filter). */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class ExercisesService {
  constructor(
    @InjectModel(Exercise.name)
    private readonly model: Model<ExerciseDocument>,
  ) {}

  // --------------------------------------------------------------------------
  // Reads
  // --------------------------------------------------------------------------

  /** `GET /exercises` — advanced filtering with cursor pagination. */
  findMany(query: FilterExercisesDto): Promise<CursorPage<Exercise>> {
    const filter: FilterQuery<ExerciseDocument> = {};
    if (query.name?.trim()) {
      filter.name = { $regex: escapeRegex(query.name.trim()), $options: 'i' };
    }
    this.applyArrayFilter(filter, 'targetMuscles', query.targetMuscles);
    this.applyArrayFilter(filter, 'secondaryMuscles', query.secondaryMuscles);
    this.applyArrayFilter(filter, 'bodyParts', query.bodyParts);
    this.applyArrayFilter(filter, 'equipments', query.equipments);
    return this.paginate(filter, query);
  }

  /** `GET /exercises/bodyparts`. */
  findByBodyParts(query: FilterByBodyPartsDto): Promise<CursorPage<Exercise>> {
    const filter: FilterQuery<ExerciseDocument> = {};
    this.applyArrayFilter(filter, 'bodyParts', query.bodyParts);
    return this.paginate(filter, query);
  }

  /** `GET /exercises/muscles` — target and/or secondary muscles. */
  findByMuscles(query: FilterByMusclesDto): Promise<CursorPage<Exercise>> {
    const filter: FilterQuery<ExerciseDocument> = {};
    this.applyArrayFilter(filter, 'targetMuscles', query.targetMuscles);
    this.applyArrayFilter(filter, 'secondaryMuscles', query.secondaryMuscles);
    return this.paginate(filter, query);
  }

  /** `GET /exercises/equipments`. */
  findByEquipments(
    query: FilterByEquipmentsDto,
  ): Promise<CursorPage<Exercise>> {
    const filter: FilterQuery<ExerciseDocument> = {};
    this.applyArrayFilter(filter, 'equipments', query.equipments);
    return this.paginate(filter, query);
  }

  /**
   * `GET /exercises/search` — fuzzy name search via Fuse.js. Returns the
   * lightweight `{ exerciseId, name, gifUrl }` projection (source parity).
   */
  async search(query: SearchExercisesDto): Promise<ExerciseSearchHitDto[]> {
    const term = query.search?.trim();
    const projection = await this.model
      .find({}, { exerciseId: 1, name: 1, gifUrl: 1, _id: 0 })
      .lean()
      .exec();

    if (!term) {
      return projection.slice(0, query.limit).map((e) => ({
        exerciseId: e.exerciseId,
        name: e.name,
        gifUrl: e.gifUrl,
      }));
    }

    const fuse = new Fuse(projection, {
      keys: ['name'],
      threshold: query.threshold,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });

    return fuse.search(term, { limit: query.limit }).map(({ item }) => ({
      exerciseId: item.exerciseId,
      name: item.name,
      gifUrl: item.gifUrl,
    }));
  }

  /** `GET /exercises/:exerciseId`. */
  async findOne(exerciseId: string): Promise<Exercise> {
    const exercise = await this.model.findOne({ exerciseId }).lean().exec();
    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found.`);
    }
    return exercise as Exercise;
  }

  // --------------------------------------------------------------------------
  // Writes
  // --------------------------------------------------------------------------

  /** `POST /exercises` — create a custom exercise. */
  async create(dto: CreateExerciseDto): Promise<Exercise> {
    const exerciseId = dto.exerciseId ?? this.slugId(dto.name);
    const existing = await this.model.exists({ exerciseId });
    if (existing) {
      throw new ConflictException(`Exercise '${exerciseId}' already exists.`);
    }
    const created = await this.model.create({
      exerciseId,
      name: dto.name,
      gifUrl: dto.gifUrl,
      targetMuscles: this.lower(dto.targetMuscles),
      bodyParts: this.lower(dto.bodyParts),
      equipments: this.lower(dto.equipments),
      secondaryMuscles: this.lower(dto.secondaryMuscles),
      instructions: dto.instructions,
      source: ExerciseSource.CUSTOM,
      lastSyncedAt: null,
    });
    return created.toObject();
  }

  /** `PATCH /exercises/:exerciseId`. */
  async update(exerciseId: string, dto: UpdateExerciseDto): Promise<Exercise> {
    const update: Record<string, unknown> = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.gifUrl !== undefined) update.gifUrl = dto.gifUrl;
    if (dto.targetMuscles !== undefined)
      update.targetMuscles = this.lower(dto.targetMuscles);
    if (dto.bodyParts !== undefined) update.bodyParts = this.lower(dto.bodyParts);
    if (dto.equipments !== undefined)
      update.equipments = this.lower(dto.equipments);
    if (dto.secondaryMuscles !== undefined)
      update.secondaryMuscles = this.lower(dto.secondaryMuscles);
    if (dto.instructions !== undefined) update.instructions = dto.instructions;

    const updated = await this.model
      .findOneAndUpdate({ exerciseId }, { $set: update }, { new: true })
      .lean()
      .exec();
    if (!updated) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found.`);
    }
    return updated as Exercise;
  }

  /** `DELETE /exercises/:exerciseId`. */
  async remove(exerciseId: string): Promise<void> {
    const res = await this.model.deleteOne({ exerciseId }).exec();
    if (!res.deletedCount) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found.`);
    }
  }

  /**
   * Idempotent bulk upsert used by the sync service. Matches on `exerciseId`,
   * refreshing all fields plus `lastSyncedAt`. Returns insert/update counts.
   */
  async upsertManyFromSource(
    records: ExerciseSourceRecord[],
    syncedAt: Date,
  ): Promise<{ inserted: number; updated: number }> {
    if (!records.length) return { inserted: 0, updated: 0 };

    const operations = records.map((record) => ({
      updateOne: {
        filter: { exerciseId: record.exerciseId },
        update: {
          $set: {
            name: record.name,
            gifUrl: record.gifUrl,
            targetMuscles: this.lower(record.targetMuscles),
            bodyParts: this.lower(record.bodyParts),
            equipments: this.lower(record.equipments),
            secondaryMuscles: this.lower(record.secondaryMuscles),
            instructions: record.instructions ?? [],
            source: ExerciseSource.EXERCISEDB,
            lastSyncedAt: syncedAt,
          },
        },
        upsert: true,
      },
    }));

    const result = await this.model.bulkWrite(operations, { ordered: false });
    const inserted = result.upsertedCount ?? 0;
    // Everything matched-but-not-inserted counts as an update.
    const updated = (result.matchedCount ?? 0);
    return { inserted, updated };
  }

  /** Total number of exercises stored locally (used by sync reporting). */
  count(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private paginate(
    filter: FilterQuery<ExerciseDocument>,
    query: { limit: number; after?: string; before?: string },
  ): Promise<CursorPage<Exercise>> {
    return paginateWithCursor<Exercise>({
      model: this.model as unknown as Model<Exercise>,
      filter,
      cursorField: CURSOR_FIELD,
      limit: query.limit,
      after: query.after,
      before: query.before,
    });
  }

  /** Adds an `$all` array filter (AND-match every requested token). */
  private applyArrayFilter(
    filter: FilterQuery<ExerciseDocument>,
    field: string,
    values?: string[],
  ): void {
    if (values?.length) {
      (filter as Record<string, unknown>)[field] = {
        $all: values.map((v) => v.toLowerCase()),
      };
    }
  }

  private lower(values: string[] | undefined): string[] {
    return (values ?? [])
      .map((v) => String(v).trim().toLowerCase())
      .filter(Boolean);
  }

  /** Deterministic id for custom exercises created without an explicit id. */
  private slugId(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `custom-${slug || 'exercise'}`;
  }
}
