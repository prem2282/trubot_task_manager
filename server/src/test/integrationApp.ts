import type { Express } from 'express';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let appInstance: Express | null = null;
let mongoReplSet: MongoMemoryReplSet | null = null;

export async function getIntegrationApp(): Promise<Express> {
  if (appInstance) {
    return appInstance;
  }

  mongoReplSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, name: 'rs0' },
  });
  process.env.MONGODB_URI = mongoReplSet.getUri();

  const { connectDatabase } = await import('../config/db');
  await connectDatabase();

  const appModule = await import('../app');
  appInstance = appModule.default;
  return appInstance;
}

export async function closeIntegrationApp(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    const { disconnectDatabase } = await import('../config/db');
    await disconnectDatabase();
  }
  await mongoReplSet?.stop();
  mongoReplSet = null;
  appInstance = null;
}

export async function clearDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.connection.dropDatabase();
  // Brief pause so the replica set finishes catalog updates before the next transaction.
  await new Promise((resolve) => setTimeout(resolve, 200));
}
