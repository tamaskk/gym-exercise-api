import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ExercisesService } from './exercises.service';
import { Exercise, ExerciseSchema, ExerciseSource } from './schemas/exercise.schema';

async function seed(service: ExercisesService) {
  await service.upsertManyFromSource(
    [
      {
        exerciseId: 'a-bench',
        name: 'barbell bench press',
        gifUrl: 'https://x/a.gif',
        targetMuscles: ['pectorals'],
        bodyParts: ['chest'],
        equipments: ['barbell'],
        secondaryMuscles: ['triceps', 'shoulders'],
        instructions: ['step 1'],
      },
      {
        exerciseId: 'b-squat',
        name: 'barbell squat',
        gifUrl: 'https://x/b.gif',
        targetMuscles: ['quads'],
        bodyParts: ['upper legs'],
        equipments: ['barbell'],
        secondaryMuscles: ['glutes'],
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
}

describe('ExercisesService', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let service: ExercisesService;
  let connection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: Exercise.name, schema: ExerciseSchema },
        ]),
      ],
      providers: [ExercisesService],
    }).compile();
    service = module.get(ExercisesService);
    connection = module.get(getConnectionToken());
  });

  afterAll(async () => {
    await module.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await connection.collection('exercises').deleteMany({});
    await seed(service);
  });

  it('upserts idempotently (re-running updates, never duplicates)', async () => {
    const before = await service.count();
    const res = await service.upsertManyFromSource(
      [
        {
          exerciseId: 'a-bench',
          name: 'barbell bench press (v2)',
          gifUrl: 'https://x/a.gif',
          targetMuscles: ['pectorals'],
          bodyParts: ['chest'],
          equipments: ['barbell'],
          secondaryMuscles: ['triceps'],
          instructions: ['step 1'],
        },
      ],
      new Date(),
    );
    expect(res.updated).toBe(1);
    expect(res.inserted).toBe(0);
    expect(await service.count()).toBe(before);
    const updated = await service.findOne('a-bench');
    expect(updated.name).toBe('barbell bench press (v2)');
  });

  it('filters by bodyParts (case-insensitive token match)', async () => {
    const page = await service.findMany({ limit: 10, bodyParts: ['chest'] } as any);
    expect(page.data).toHaveLength(1);
    expect(page.data[0].exerciseId).toBe('a-bench');
    expect(page.meta.total).toBe(1);
  });

  it('filters by equipment matching multiple rows', async () => {
    const page = await service.findMany({
      limit: 10,
      equipments: ['barbell'],
    } as any);
    expect(page.data.map((e) => e.exerciseId).sort()).toEqual([
      'a-bench',
      'b-squat',
    ]);
  });

  it('filters by name substring', async () => {
    const page = await service.findMany({ limit: 10, name: 'curl' } as any);
    expect(page.data).toHaveLength(1);
    expect(page.data[0].exerciseId).toBe('c-curl');
  });

  it('paginates forward with a cursor', async () => {
    const first = await service.findMany({ limit: 2 } as any);
    expect(first.data).toHaveLength(2);
    expect(first.meta.hasNextPage).toBe(true);
    expect(first.meta.nextCursor).toBe(first.data[1].exerciseId);

    const second = await service.findMany({
      limit: 2,
      after: first.meta.nextCursor!,
    } as any);
    expect(second.data).toHaveLength(1);
    expect(second.meta.hasNextPage).toBe(false);
    expect(second.meta.hasPreviousPage).toBe(true);
  });

  it('fuzzy searches by name', async () => {
    const hits = await service.search({
      search: 'bench',
      threshold: 0.3,
      limit: 10,
    });
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].exerciseId).toBe('a-bench');
    expect(hits[0]).toHaveProperty('gifUrl');
  });

  it('creates a custom exercise and rejects duplicates', async () => {
    const created = await service.create({
      name: 'incline push up',
      gifUrl: 'https://x/p.gif',
      targetMuscles: ['pectorals'],
      bodyParts: ['chest'],
      equipments: ['body weight'],
      secondaryMuscles: ['triceps'],
      instructions: ['step 1'],
    });
    expect(created.source).toBe(ExerciseSource.CUSTOM);
    expect(created.exerciseId).toBe('custom-incline-push-up');

    await expect(
      service.create({
        exerciseId: 'custom-incline-push-up',
        name: 'dup',
        gifUrl: 'https://x/p.gif',
        targetMuscles: ['pectorals'],
        bodyParts: ['chest'],
        equipments: [],
        secondaryMuscles: [],
        instructions: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates and re-filters by the new body part', async () => {
    await service.update('c-curl', { bodyParts: ['arms'] });
    const byOld = await service.findByBodyParts({
      limit: 10,
      bodyParts: ['upper arms'],
    } as any);
    expect(byOld.data).toHaveLength(0);
    const byNew = await service.findByBodyParts({
      limit: 10,
      bodyParts: ['arms'],
    } as any);
    expect(byNew.data).toHaveLength(1);
  });

  it('throws NotFound for a missing exercise', async () => {
    await expect(service.findOne('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
