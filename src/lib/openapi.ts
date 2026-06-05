import { ATTRIBUTION } from './db';

const pageMeta = {
  type: 'object',
  properties: {
    total: { type: 'integer', example: 1500 },
    hasNextPage: { type: 'boolean' },
    hasPreviousPage: { type: 'boolean' },
    nextCursor: { type: 'string', nullable: true },
    previousCursor: { type: 'string', nullable: true },
  },
};

const exercise = {
  type: 'object',
  properties: {
    exerciseId: { type: 'string', example: 'EIeI8Vf' },
    name: { type: 'string', example: 'barbell bench press' },
    gifUrl: { type: 'string' },
    targetMuscles: { type: 'array', items: { type: 'string' } },
    bodyParts: { type: 'array', items: { type: 'string' } },
    equipments: { type: 'array', items: { type: 'string' } },
    secondaryMuscles: { type: 'array', items: { type: 'string' } },
    instructions: { type: 'array', items: { type: 'string' } },
    source: { type: 'string', enum: ['exercisedb', 'custom'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const paginationParams = [
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 25, default: 10 } },
  { name: 'after', in: 'query', schema: { type: 'string' }, description: 'Forward cursor.' },
  { name: 'before', in: 'query', schema: { type: 'string' }, description: 'Backward cursor.' },
];

const listResponse = (itemRef: object) => ({
  '200': {
    description: 'OK',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            meta: pageMeta,
            data: { type: 'array', items: itemRef },
          },
        },
      },
    },
  },
});

const itemResponse = (itemRef: object, code = '200') => ({
  [code]: {
    description: 'OK',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { success: { type: 'boolean' }, data: itemRef },
        },
      },
    },
  },
});

const errorResponses = {
  '400': { description: 'Bad Request' },
  '404': { description: 'Not Found' },
  '409': { description: 'Conflict' },
  '500': { description: 'Internal Server Error' },
};

const ExRef = { $ref: '#/components/schemas/Exercise' };
const csv = (name: string, example: string) => ({
  name,
  in: 'query',
  schema: { type: 'string' },
  description: 'Comma-separated.',
  example,
});

export function buildOpenApiSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Gym Exercise & Workout-Task API',
      version: '2.0.0',
      description:
        'Next.js API mirroring & extending the ExerciseDB v1 dataset with ' +
        `MongoDB persistence, sync, fuzzy search and a workout-task domain.\n\n**Attribution:** ${ATTRIBUTION}`,
    },
    servers: [{ url: '/api/v1' }],
    tags: [
      { name: 'exercises' },
      { name: 'workout-tasks' },
      { name: 'metadata' },
      { name: 'sync' },
      { name: 'health' },
    ],
    components: {
      schemas: {
        Exercise: exercise,
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'integer' },
                message: { type: 'string' },
                detail: {},
                timestamp: { type: 'string', format: 'date-time' },
                path: { type: 'string' },
              },
            },
          },
        },
      },
    },
    paths: {
      '/liveness': {
        get: { tags: ['health'], summary: 'Liveness / health check', responses: { '200': { description: 'OK' } } },
      },
      '/exercises': {
        get: {
          tags: ['exercises'],
          summary: 'Advanced exercise filtering',
          parameters: [
            { name: 'name', in: 'query', schema: { type: 'string' } },
            csv('targetMuscles', 'pectorals,shoulders'),
            csv('secondaryMuscles', 'triceps'),
            csv('bodyParts', 'chest'),
            csv('equipments', 'barbell,dumbbell'),
            ...paginationParams,
          ],
          responses: { ...listResponse(ExRef), ...errorResponses },
        },
        post: {
          tags: ['exercises'],
          summary: 'Create a custom exercise',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: ExRef } },
          },
          responses: { ...itemResponse(ExRef, '201'), ...errorResponses },
        },
      },
      '/exercises/search': {
        get: {
          tags: ['exercises'],
          summary: 'Fuzzy search',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'threshold', in: 'query', schema: { type: 'number', minimum: 0, maximum: 1, default: 0.3 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/exercises/bodyparts': {
        get: { tags: ['exercises'], summary: 'Filter by body parts', parameters: [csv('bodyParts', 'chest,shoulders'), ...paginationParams], responses: listResponse(ExRef) },
      },
      '/exercises/muscles': {
        get: { tags: ['exercises'], summary: 'Filter by muscles', parameters: [csv('targetMuscles', 'pectorals'), csv('secondaryMuscles', 'triceps'), ...paginationParams], responses: listResponse(ExRef) },
      },
      '/exercises/equipments': {
        get: { tags: ['exercises'], summary: 'Filter by equipment', parameters: [csv('equipments', 'barbell'), ...paginationParams], responses: listResponse(ExRef) },
      },
      '/exercises/{exerciseId}': {
        get: { tags: ['exercises'], summary: 'Get by id', parameters: [{ name: 'exerciseId', in: 'path', required: true, schema: { type: 'string' } }], responses: { ...itemResponse(ExRef), ...errorResponses } },
        patch: { tags: ['exercises'], summary: 'Update', parameters: [{ name: 'exerciseId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: ExRef } } }, responses: { ...itemResponse(ExRef), ...errorResponses } },
        delete: { tags: ['exercises'], summary: 'Delete', parameters: [{ name: 'exerciseId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deleted' }, ...errorResponses } },
      },
      '/bodyparts': { get: { tags: ['metadata'], summary: 'List body parts', responses: { '200': { description: 'OK' } } } },
      '/muscles': { get: { tags: ['metadata'], summary: 'List muscles', responses: { '200': { description: 'OK' } } } },
      '/equipments': { get: { tags: ['metadata'], summary: 'List equipment', responses: { '200': { description: 'OK' } } } },
      '/sync': {
        post: {
          tags: ['sync'],
          summary: 'Trigger a data sync from ExerciseDB',
          parameters: [
            { name: 'maxPages', in: 'query', schema: { type: 'integer' }, description: 'Walk at most N source pages (for serverless limits).' },
            { name: 'after', in: 'query', schema: { type: 'string' }, description: 'Continue from a previous nextCursor.' },
          ],
          responses: { '200': { description: 'Sync result (done / nextCursor / counts).' } },
        },
      },
      '/sync/status': { get: { tags: ['sync'], summary: 'Sync progress', responses: { '200': { description: 'OK' } } } },
      '/workout-tasks': {
        get: { tags: ['workout-tasks'], summary: 'List tasks', parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'in_progress', 'completed'] } }, ...paginationParams], responses: { '200': { description: 'OK' } } },
        post: { tags: ['workout-tasks'], summary: 'Create a task', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, seedExerciseIds: { type: 'array', items: { type: 'string' } } } } } } }, responses: { '201': { description: 'Created' }, ...errorResponses } },
      },
      '/workout-tasks/{id}': {
        get: { tags: ['workout-tasks'], summary: 'Get task', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, ...errorResponses } },
        patch: { tags: ['workout-tasks'], summary: 'Update task', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, ...errorResponses } },
        delete: { tags: ['workout-tasks'], summary: 'Delete task', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deleted' }, ...errorResponses } },
      },
      '/workout-tasks/{id}/start': { patch: { tags: ['workout-tasks'], summary: 'Start (draft → in_progress)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, ...errorResponses } } },
      '/workout-tasks/{id}/complete': { patch: { tags: ['workout-tasks'], summary: 'Complete (in_progress → completed)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, ...errorResponses } } },
      '/workout-tasks/{id}/items/{itemId}/complete': { patch: { tags: ['workout-tasks'], summary: 'Mark item done', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, ...errorResponses } } },
    },
  };
}
