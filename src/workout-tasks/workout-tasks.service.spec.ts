import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ExercisesService } from '../exercises/exercises.service';
import { Exercise, ExerciseSchema } from '../exercises/schemas/exercise.schema';
import { WorkoutTasksService } from './workout-tasks.service';
import {
  WorkoutTask,
  WorkoutTaskSchema,
  WorkoutTaskStatus,
} from './schemas/workout-task.schema';

describe('WorkoutTasksService', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let service: WorkoutTasksService;
  let exercises: ExercisesService;
  let connection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: Exercise.name, schema: ExerciseSchema },
          { name: WorkoutTask.name, schema: WorkoutTaskSchema },
        ]),
      ],
      providers: [WorkoutTasksService, ExercisesService],
    }).compile();
    service = module.get(WorkoutTasksService);
    exercises = module.get(ExercisesService);
    connection = module.get(getConnectionToken());
  });

  afterAll(async () => {
    await module.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await connection.collection('workout_tasks').deleteMany({});
    await connection.collection('exercises').deleteMany({});
    await exercises.upsertManyFromSource(
      [
        {
          exerciseId: 'a-bench',
          name: 'barbell bench press',
          gifUrl: 'https://x/a.gif',
          targetMuscles: ['pectorals'],
          bodyParts: ['chest'],
          equipments: ['barbell'],
          secondaryMuscles: ['triceps'],
          instructions: ['step 1'],
        },
        {
          exerciseId: 'c-curl',
          name: 'dumbbell bicep curl',
          gifUrl: 'https://x/c.gif',
          targetMuscles: ['biceps'],
          bodyParts: ['upper arms'],
          equipments: ['dumbbell'],
          secondaryMuscles: ['forearms'],
          instructions: ['step 1'],
        },
      ],
      new Date(),
    );
  });

  it('creates a draft task seeded from exercise ids with snapshots', async () => {
    const task = await service.create({
      title: 'Push day',
      seedExerciseIds: ['a-bench', 'c-curl'],
    });
    expect(task.status).toBe(WorkoutTaskStatus.DRAFT);
    expect(task.items).toHaveLength(2);
    expect(task.items[0].exerciseName).toBe('barbell bench press');
    expect(task.items.map((i) => i.position)).toEqual([0, 1]);
  });

  it('rejects seeding from an unknown exercise', async () => {
    await expect(
      service.create({ title: 'x', seedExerciseIds: ['ghost'] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('walks the full lifecycle: draft → in_progress → completed', async () => {
    const created = await service.create({
      title: 'Push day',
      items: [{ exerciseId: 'a-bench', sets: 5, reps: 5 }],
    });

    const started = await service.start(created._id);
    expect(started.status).toBe(WorkoutTaskStatus.IN_PROGRESS);
    expect(started.startedAt).toBeInstanceOf(Date);

    const itemId = String(started.items[0]._id);
    const itemDone = await service.completeItem(created._id, itemId);
    expect(itemDone.items[0].done).toBe(true);

    const completed = await service.complete(created._id);
    expect(completed.status).toBe(WorkoutTaskStatus.COMPLETED);
    expect(completed.completedAt).toBeInstanceOf(Date);
    expect(completed.items.every((i) => i.done)).toBe(true);
  });

  it('cannot start a task that is not a draft', async () => {
    const created = await service.create({
      title: 'x',
      items: [{ exerciseId: 'a-bench' }],
    });
    await service.start(created._id);
    await expect(service.start(created._id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('cannot complete a draft without starting', async () => {
    const created = await service.create({
      title: 'x',
      items: [{ exerciseId: 'a-bench' }],
    });
    await expect(service.complete(created._id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('cannot edit a completed task', async () => {
    const created = await service.create({
      title: 'x',
      items: [{ exerciseId: 'a-bench' }],
    });
    await service.start(created._id);
    await service.complete(created._id);
    await expect(
      service.update(created._id, { title: 'new' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('replaces and reorders items on update', async () => {
    const created = await service.create({
      title: 'x',
      items: [{ exerciseId: 'a-bench' }],
    });
    const updated = await service.update(created._id, {
      items: [{ exerciseId: 'c-curl' }, { exerciseId: 'a-bench' }],
    });
    expect(updated.items).toHaveLength(2);
    const ordered = updated.items.sort((a, b) => a.position - b.position);
    expect(ordered[0].exerciseId).toBe('c-curl');
    expect(ordered[1].exerciseId).toBe('a-bench');
  });

  it('filters list by status', async () => {
    await service.create({ title: 'draft one' });
    const active = await service.create({
      title: 'active',
      items: [{ exerciseId: 'a-bench' }],
    });
    await service.start(active._id);

    const drafts = await service.findMany({
      limit: 10,
      status: WorkoutTaskStatus.DRAFT,
    } as any);
    expect(drafts.data.every((t) => t.status === WorkoutTaskStatus.DRAFT)).toBe(
      true,
    );
    const inProgress = await service.findMany({
      limit: 10,
      status: WorkoutTaskStatus.IN_PROGRESS,
    } as any);
    expect(inProgress.data).toHaveLength(1);
  });
});
