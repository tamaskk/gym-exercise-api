import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '../src/app.module';

/**
 * End-to-end coverage over the real HTTP stack (global prefix, ValidationPipe,
 * exception filter, Mongoose) using an in-memory MongoDB. The upstream sync is
 * never invoked, so these tests run fully offline.
 */
describe('API (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let server: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    // AppModule reads MONGODB_URI from the environment at module init.
    process.env.MONGODB_URI = mongod.getUri();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  const base = '/api/v1';
  const customId = 'custom-incline-push-up';

  it('GET /liveness reports ok with attribution', async () => {
    const res = await request(server).get(`${base}/liveness`).expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.attribution).toContain('AscendAPI');
  });

  it('POST /exercises creates a custom exercise', async () => {
    const res = await request(server)
      .post(`${base}/exercises`)
      .send({
        name: 'incline push up',
        gifUrl: 'https://static.exercisedb.dev/media/custom.gif',
        targetMuscles: ['pectorals'],
        bodyParts: ['chest'],
        equipments: ['body weight'],
        secondaryMuscles: ['triceps'],
        instructions: ['Step:1 Get into position.'],
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.exerciseId).toBe(customId);
    expect(res.body.data.source).toBe('custom');
  });

  it('rejects invalid create payloads with the error envelope', async () => {
    const res = await request(server)
      .post(`${base}/exercises`)
      .send({ name: '' })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(400);
    expect(res.body.error.path).toBe(`${base}/exercises`);
  });

  it('GET /exercises returns the list envelope with meta', async () => {
    const res = await request(server)
      .get(`${base}/exercises`)
      .query({ bodyParts: 'chest', limit: 10 })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('hasNextPage');
    expect(res.body.data[0].exerciseId).toBe(customId);
  });

  it('enforces the max limit of 25', async () => {
    await request(server).get(`${base}/exercises`).query({ limit: 100 }).expect(400);
  });

  it('GET /exercises/:id returns a single item', async () => {
    const res = await request(server)
      .get(`${base}/exercises/${customId}`)
      .expect(200);
    expect(res.body.data.name).toBe('incline push up');
  });

  it('GET /exercises/:id 404s for unknown id', async () => {
    const res = await request(server)
      .get(`${base}/exercises/does-not-exist`)
      .expect(404);
    expect(res.body.error.code).toBe(404);
  });

  it('GET /exercises/search fuzzy matches', async () => {
    const res = await request(server)
      .get(`${base}/exercises/search`)
      .query({ search: 'incline', threshold: 0.4 })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('runs a full workout-task lifecycle', async () => {
    const create = await request(server)
      .post(`${base}/workout-tasks`)
      .send({ title: 'Push day', seedExerciseIds: [customId] })
      .expect(201);
    const taskId = create.body.data.id;
    expect(create.body.data.status).toBe('draft');
    const itemId = create.body.data.items[0].id;

    await request(server).patch(`${base}/workout-tasks/${taskId}/start`).expect(200);

    const itemDone = await request(server)
      .patch(`${base}/workout-tasks/${taskId}/items/${itemId}/complete`)
      .expect(200);
    expect(itemDone.body.data.items[0].done).toBe(true);

    const completed = await request(server)
      .patch(`${base}/workout-tasks/${taskId}/complete`)
      .expect(200);
    expect(completed.body.data.status).toBe('completed');

    // Editing a completed task is a conflict.
    await request(server)
      .patch(`${base}/workout-tasks/${taskId}`)
      .send({ title: 'nope' })
      .expect(409);

    await request(server).delete(`${base}/workout-tasks/${taskId}`).expect(204);
  });
});
