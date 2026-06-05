import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as exercises from '../src/lib/services/exercises';
import * as tasks from '../src/lib/services/workout-tasks';
import { WorkoutTaskStatus } from '../src/lib/models/workout-task';
import { ApiError } from '../src/lib/http/errors';

let mongod: MongoMemoryServer;

const params = (over: Partial<{ limit: number; after: string; before: string }> = {}) => ({
  limit: 10,
  ...over,
});

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await mongoose.connection.collection('exercises').deleteMany({});
  await mongoose.connection.collection('workout_tasks').deleteMany({});
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
        instructions: ['s'],
      },
      {
        exerciseId: 'b-squat',
        name: 'barbell squat',
        gifUrl: 'https://x/b.gif',
        targetMuscles: ['quads'],
        bodyParts: ['upper legs'],
        equipments: ['barbell'],
        secondaryMuscles: ['glutes'],
        instructions: ['s'],
      },
      {
        exerciseId: 'c-curl',
        name: 'dumbbell bicep curl',
        gifUrl: 'https://x/c.gif',
        targetMuscles: ['biceps'],
        bodyParts: ['upper arms'],
        equipments: ['dumbbell'],
        secondaryMuscles: ['forearms'],
        instructions: ['s'],
      },
    ],
    new Date(),
  );
});

describe('exercises service', () => {
  it('upserts idempotently', async () => {
    const before = await exercises.count();
    const res = await exercises.upsertManyFromSource(
      [
        {
          exerciseId: 'a-bench',
          name: 'bench v2',
          gifUrl: 'https://x/a.gif',
          targetMuscles: ['pectorals'],
          bodyParts: ['chest'],
          equipments: ['barbell'],
          secondaryMuscles: [],
          instructions: [],
        },
      ],
      new Date(),
    );
    expect(res.updated).toBe(1);
    expect(res.inserted).toBe(0);
    expect(await exercises.count()).toBe(before);
  });

  it('filters by body part', async () => {
    const page = await exercises.findByBodyParts(['chest'], params());
    expect(page.data).toHaveLength(1);
    expect(page.data[0].exerciseId).toBe('a-bench');
  });

  it('filters by equipment (multiple matches)', async () => {
    const page = await exercises.findMany({ equipments: ['barbell'] }, params());
    expect(page.data.map((e) => e.exerciseId).sort()).toEqual(['a-bench', 'b-squat']);
  });

  it('paginates with a cursor', async () => {
    const first = await exercises.findMany({}, params({ limit: 2 }));
    expect(first.data).toHaveLength(2);
    expect(first.meta.hasNextPage).toBe(true);
    const second = await exercises.findMany({}, params({ limit: 2, after: first.meta.nextCursor! }));
    expect(second.data).toHaveLength(1);
    expect(second.meta.hasPreviousPage).toBe(true);
  });

  it('fuzzy searches by name', async () => {
    const hits = await exercises.search('bench', 0.3, 10);
    expect(hits[0].exerciseId).toBe('a-bench');
  });

  it('creates and rejects duplicates', async () => {
    const created = await exercises.create({
      name: 'incline push up',
      gifUrl: 'https://x/p.gif',
      targetMuscles: ['pectorals'],
      bodyParts: ['chest'],
      equipments: [],
      secondaryMuscles: [],
      instructions: [],
    });
    expect(created.exerciseId).toBe('custom-incline-push-up');
    await expect(
      exercises.create({
        exerciseId: 'custom-incline-push-up',
        name: 'dup',
        gifUrl: 'https://x/p.gif',
        targetMuscles: ['x'],
        bodyParts: ['x'],
        equipments: [],
        secondaryMuscles: [],
        instructions: [],
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('404s for a missing exercise', async () => {
    await expect(exercises.findOne('nope')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('workout-tasks service', () => {
  it('runs the full lifecycle', async () => {
    const created = await tasks.create({ title: 'Push', seedExerciseIds: ['a-bench'] });
    expect(created.status).toBe(WorkoutTaskStatus.DRAFT);

    const id = String(created._id);
    const started = await tasks.start(id);
    expect(started.status).toBe(WorkoutTaskStatus.IN_PROGRESS);

    const itemId = String((started.items as any)[0]._id);
    const itemDone = await tasks.completeItem(id, itemId);
    expect((itemDone.items as any)[0].done).toBe(true);

    const done = await tasks.complete(id);
    expect(done.status).toBe(WorkoutTaskStatus.COMPLETED);
  });

  it('rejects seeding from unknown exercise', async () => {
    await expect(
      tasks.create({ title: 'x', seedExerciseIds: ['ghost'] }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('cannot edit a completed task', async () => {
    const created = await tasks.create({ title: 'x', items: [{ exerciseId: 'a-bench' }] });
    const id = String(created._id);
    await tasks.start(id);
    await tasks.complete(id);
    await expect(tasks.update(id, { title: 'new' })).rejects.toBeInstanceOf(ApiError);
  });

  it('filters by status', async () => {
    await tasks.create({ title: 'draft one' });
    const active = await tasks.create({ title: 'active', items: [{ exerciseId: 'a-bench' }] });
    await tasks.start(String(active._id));
    const inProgress = await tasks.findMany(WorkoutTaskStatus.IN_PROGRESS, params());
    expect(inProgress.data).toHaveLength(1);
  });
});
