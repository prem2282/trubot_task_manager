import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { clearDatabase, closeIntegrationApp, getIntegrationApp } from '../integrationApp';
import { seedVerifiedUser, withAuth } from '../integrationHelpers';

describe('Auth API integration', () => {
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

  it('POST /auth/register creates an unverified account and returns verification instructions', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
      accountName: 'New Account',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.requiresVerification).toBe(true);
    expect(res.body.data.email).toBe('new@example.com');
  });

  it('POST /auth/register returns field validation errors for invalid input', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'A',
      email: 'bad-email',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors?.length).toBeGreaterThan(0);
  });

  it('POST /auth/login authenticates a verified user and sets refresh cookie', async () => {
    await seedVerifiedUser(app, {
      email: 'login@example.com',
      password: 'password123',
      name: 'Login User',
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe('login@example.com');
    expect(res.headers['set-cookie']?.[0]).toContain('refreshToken=');
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    await seedVerifiedUser(app, { email: 'user@example.com' });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'user@example.com',
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns the current user context', async () => {
    const admin = await seedVerifiedUser(app, {
      email: 'me@example.com',
      name: 'Me User',
    });

    const res = await request(app).get('/api/v1/auth/me').set(withAuth(admin.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('me@example.com');
    expect(res.body.data.account.id).toBe(admin.accountId);
    expect(res.body.data.workspace.id).toBe(admin.workspaceId);
  });

  it('GET /auth/me rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
  });

  it('POST /auth/switch-context changes active workspace in the token', async () => {
    const admin = await seedVerifiedUser(app, {
      email: 'switcher@example.com',
      accountName: 'Switch Account',
    });

    const createRes = await request(app)
      .post('/api/v1/workspaces')
      .set(withAuth(admin.accessToken))
      .send({ name: 'Secondary Workspace' });

    const secondaryWorkspaceId = createRes.body.data.id;

    const switchRes = await request(app)
      .post('/api/v1/auth/switch-context')
      .set(withAuth(admin.accessToken))
      .send({
        accountId: admin.accountId,
        workspaceId: secondaryWorkspaceId,
      });

    expect(switchRes.status).toBe(200);
    expect(switchRes.body.data.workspace.id).toBe(secondaryWorkspaceId);

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set(withAuth(switchRes.body.data.accessToken));

    expect(meRes.body.data.workspace.id).toBe(secondaryWorkspaceId);
  });

  it('POST /auth/refresh rotates access token using refresh cookie', async () => {
    const agent = request.agent(app);

    await seedVerifiedUser(app, {
      email: 'refresh@example.com',
      password: 'password123',
    });

    await agent.post('/api/v1/auth/login').send({
      email: 'refresh@example.com',
      password: 'password123',
    });

    const refreshRes = await agent.post('/api/v1/auth/refresh');

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
    expect(refreshRes.headers['set-cookie']?.[0]).toContain('refreshToken=');

    const meRes = await agent
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refreshRes.body.data.accessToken}`);

    expect(meRes.status).toBe(200);
  });
});
