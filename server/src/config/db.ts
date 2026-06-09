import mongoose from 'mongoose';
import { env } from './env';
import { Workspace } from '../models';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  // Backfill status before partial unique index; replace legacy full unique index
  await Workspace.updateMany({ status: { $exists: false } }, { $set: { status: 'active' } });
  await Workspace.syncIndexes();
  console.log('MongoDB connected');
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
