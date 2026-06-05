import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  CursorPage,
  paginateWithCursor,
} from '../common/pagination/cursor-pagination';
import { ExercisesService } from '../exercises/exercises.service';
import { CreateWorkoutTaskDto } from './dto/create-workout-task.dto';
import { UpdateWorkoutTaskDto } from './dto/update-workout-task.dto';
import { QueryWorkoutTasksDto } from './dto/query-workout-tasks.dto';
import { WorkoutItemInputDto } from './dto/workout-item.dto';
import {
  WorkoutTask,
  WorkoutTaskDocument,
  WorkoutTaskItem,
  WorkoutTaskStatus,
} from './schemas/workout-task.schema';

@Injectable()
export class WorkoutTasksService {
  constructor(
    @InjectModel(WorkoutTask.name)
    private readonly model: Model<WorkoutTaskDocument>,
    private readonly exercises: ExercisesService,
  ) {}

  /** `POST /workout-tasks` — create a (optionally seeded) draft task. */
  async create(dto: CreateWorkoutTaskDto): Promise<WorkoutTask> {
    const inputs: WorkoutItemInputDto[] = [
      ...(dto.items ?? []),
      ...(dto.seedExerciseIds ?? []).map((exerciseId) => ({ exerciseId })),
    ];
    const items = await this.buildItems(inputs);

    const created = await this.model.create({
      title: dto.title,
      status: WorkoutTaskStatus.DRAFT,
      items,
      startedAt: null,
      completedAt: null,
    });
    return created.toObject();
  }

  /** `GET /workout-tasks` — list with status filter + cursor pagination. */
  findMany(query: QueryWorkoutTasksDto): Promise<CursorPage<WorkoutTask>> {
    const filter: FilterQuery<WorkoutTaskDocument> = {};
    if (query.status) filter.status = query.status;
    return paginateWithCursor<WorkoutTask>({
      model: this.model as unknown as Model<WorkoutTask>,
      filter,
      cursorField: '_id',
      limit: query.limit,
      after: query.after,
      before: query.before,
    });
  }

  /** `GET /workout-tasks/:id`. */
  async findOne(id: string): Promise<WorkoutTask> {
    const task = await this.loadDoc(id);
    return task.toObject();
  }

  /** `PATCH /workout-tasks/:id` — rename and/or replace+reorder items. */
  async update(id: string, dto: UpdateWorkoutTaskDto): Promise<WorkoutTask> {
    const task = await this.loadDoc(id);
    if (task.status === WorkoutTaskStatus.COMPLETED) {
      throw new ConflictException('A completed workout task cannot be edited.');
    }
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.items !== undefined) {
      // Replace the full item set; array order defines new positions.
      task.items = await this.buildItems(dto.items);
    }
    await task.save();
    return task.toObject();
  }

  /** `PATCH /workout-tasks/:id/items/:itemId/complete`. */
  async completeItem(id: string, itemId: string): Promise<WorkoutTask> {
    const task = await this.loadDoc(id);
    if (task.status === WorkoutTaskStatus.COMPLETED) {
      throw new ConflictException('Workout task is already completed.');
    }
    const item = task.items.find((i) => String(i._id) === itemId);
    if (!item) {
      throw new NotFoundException(`Item '${itemId}' not found on task '${id}'.`);
    }
    item.done = true;
    // Completing an item implicitly starts a draft workout.
    if (task.status === WorkoutTaskStatus.DRAFT) {
      task.status = WorkoutTaskStatus.IN_PROGRESS;
      task.startedAt = new Date();
    }
    await task.save();
    return task.toObject();
  }

  /** `PATCH /workout-tasks/:id/start` — draft → in_progress. */
  async start(id: string): Promise<WorkoutTask> {
    const task = await this.loadDoc(id);
    if (task.status !== WorkoutTaskStatus.DRAFT) {
      throw new ConflictException(
        `Only draft tasks can be started (current status: ${task.status}).`,
      );
    }
    if (!task.items?.length) {
      throw new ConflictException('Cannot start a workout task with no items.');
    }
    task.status = WorkoutTaskStatus.IN_PROGRESS;
    task.startedAt = new Date();
    await task.save();
    return task.toObject();
  }

  /** `PATCH /workout-tasks/:id/complete` — in_progress → completed. */
  async complete(id: string): Promise<WorkoutTask> {
    const task = await this.loadDoc(id);
    if (task.status === WorkoutTaskStatus.COMPLETED) {
      throw new ConflictException('Workout task is already completed.');
    }
    if (task.status === WorkoutTaskStatus.DRAFT) {
      throw new ConflictException('Start the workout before completing it.');
    }
    task.status = WorkoutTaskStatus.COMPLETED;
    task.completedAt = new Date();
    task.items.forEach((i) => (i.done = true));
    await task.save();
    return task.toObject();
  }

  /** `DELETE /workout-tasks/:id`. */
  async remove(id: string): Promise<void> {
    const res = await this.model.deleteOne({ _id: id }).exec();
    if (!res.deletedCount) {
      throw new NotFoundException(`Workout task '${id}' not found.`);
    }
  }

  /** Loads a hydrated document or throws 404. */
  private async loadDoc(id: string): Promise<WorkoutTaskDocument> {
    const task = await this.model.findById(id).exec();
    if (!task) throw new NotFoundException(`Workout task '${id}' not found.`);
    return task;
  }

  /**
   * Builds item subdocuments from inputs: validates each referenced exercise
   * exists, snapshots its name/gifUrl, and assigns sequential positions.
   */
  private async buildItems(
    inputs: WorkoutItemInputDto[],
  ): Promise<WorkoutTaskItem[]> {
    const result: WorkoutTaskItem[] = [];
    for (let i = 0; i < inputs.length; i += 1) {
      const input = inputs[i];
      // Throws NotFound if the exercise doesn't exist — fail fast.
      const exercise = await this.exercises.findOne(input.exerciseId);
      result.push({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.name,
        gifUrl: exercise.gifUrl,
        sets: input.sets ?? 3,
        reps: input.reps ?? 10,
        weight: input.weight ?? 0,
        rest: input.rest ?? 60,
        position: i,
        done: false,
      });
    }
    return result;
  }
}
