/**
 * Local full-sync runner: `npm run sync:local`.
 *
 * Connects to MONGODB_URI and walks the entire upstream dataset into the DB
 * with no serverless time limit. Handy for the initial population (or any time
 * you'd rather not chunk the HTTP `POST /sync` endpoint).
 */
import { config } from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db';
import { runSync } from '../src/lib/services/sync';

config({ path: '.env' });
config({ path: '.env.local' });

async function main() {
  await connectDB();
  console.log('Connected. Starting full sync...');
  const result = await runSync(); // no maxPages → walk everything
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
