import mongoose from 'mongoose';

/**
 * Serverless-safe MongoDB connection.
 *
 * On platforms like Vercel each invocation may reuse a warm Lambda, so we cache
 * the connection (and the in-flight connect promise) on the Node global to avoid
 * opening a new connection on every request, while still working across hot
 * reloads in dev.
 */
const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForMongoose = global as unknown as { __mongoose?: MongooseCache };

const cache: MongooseCache =
  globalForMongoose.__mongoose ?? { conn: null, promise: null };
globalForMongoose.__mongoose = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Add it to your environment (.env / Vercel project settings).',
    );
  }
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export const ATTRIBUTION =
  'Exercise data © AscendAPI (ExerciseDB). https://ascendapi.com';
