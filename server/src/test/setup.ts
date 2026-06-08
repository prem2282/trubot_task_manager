process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/task-manager-test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-key-minimum-32-chars';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-key-minimum-32-chars';
process.env.CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.clearAllMocks();
});
