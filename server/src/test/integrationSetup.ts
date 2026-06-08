process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-key-minimum-32-chars';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-key-minimum-32-chars';
process.env.CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
process.env.EMAIL_PROVIDER = 'smtp';
process.env.EMAIL_FROM = 'Task Manager <test@localhost>';
process.env.MONGOMS_DOWNLOAD_DIR =
  process.env.MONGOMS_DOWNLOAD_DIR ??
  `${process.cwd()}/node_modules/.cache/mongodb-binaries`;

import { vi } from 'vitest';

vi.mock('../services/emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/verificationService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/verificationService')>();
  return {
    ...actual,
    sendEmailVerification: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendResendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  };
});
