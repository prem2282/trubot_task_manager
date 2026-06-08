import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { clearDatabase, closeIntegrationApp, getIntegrationApp } from '../integrationApp';

describe('API health', () => {
  let app: Express;

  beforeAll(async () => {
    app = await getIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('GET /api/v1/health returns ok', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'API is running' });
  });
});
