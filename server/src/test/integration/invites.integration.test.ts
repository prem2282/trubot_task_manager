import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { clearDatabase, closeIntegrationApp, getIntegrationApp } from '../integrationApp';
import { seedVerifiedUser, withAuth } from '../integrationHelpers';

describe('Invites API integration', () => {
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

  it('immediately adds verified users without creating a pending invite', async () => {
    const admin = await seedVerifiedUser(app, {
      email: 'inviter@example.com',
      accountName: 'Invite Account',
    });

    await seedVerifiedUser(app, {
      email: 'existing@example.com',
      accountName: 'Other Account',
      accountRole: 'admin',
    });

    const res = await request(app)
      .post('/api/v1/invites')
      .set(withAuth(admin.accessToken))
      .send({
        email: 'existing@example.com',
        workspaceId: admin.workspaceId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('added');
    expect(res.body.data.user.email).toBe('existing@example.com');
  });

  it('creates pending invites for new users and allows revoke/list', async () => {
    const admin = await seedVerifiedUser(app, {
      email: 'pending-admin@example.com',
      accountName: 'Pending Account',
    });

    const createRes = await request(app)
      .post('/api/v1/invites')
      .set(withAuth(admin.accessToken))
      .send({
        email: 'pending@example.com',
        name: 'Pending User',
        workspaceId: admin.workspaceId,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.type).toBe('pending');
    expect(createRes.body.data.inviteUrl).toContain('/accept-invite/');

    const listRes = await request(app).get('/api/v1/invites').set(withAuth(admin.accessToken));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].email).toBe('pending@example.com');

    const inviteId = listRes.body.data[0]._id;

    const revokeRes = await request(app)
      .delete(`/api/v1/invites/${inviteId}`)
      .set(withAuth(admin.accessToken));

    expect(revokeRes.status).toBe(200);

    const afterRevoke = await request(app).get('/api/v1/invites').set(withAuth(admin.accessToken));
    expect(afterRevoke.body.data).toHaveLength(0);
  });

  it('blocks account members from creating invites', async () => {
    const member = await seedVerifiedUser(app, {
      email: 'invite-member@example.com',
      accountName: 'Member Only Account',
      accountRole: 'member',
      workspaceRole: 'member',
    });

    const res = await request(app)
      .post('/api/v1/invites')
      .set(withAuth(member.accessToken))
      .send({
        email: 'blocked@example.com',
        workspaceId: member.workspaceId,
      });

    expect(res.status).toBe(403);
  });

  it('accepts a pending invite and logs the user in', async () => {
    const admin = await seedVerifiedUser(app, {
      email: 'accept-admin@example.com',
      accountName: 'Accept Account',
    });

    const createRes = await request(app)
      .post('/api/v1/invites')
      .set(withAuth(admin.accessToken))
      .send({
        email: 'accept@example.com',
        name: 'Accept User',
        workspaceId: admin.workspaceId,
      });

    const inviteUrl = createRes.body.data.inviteUrl as string;
    const token = inviteUrl.split('/accept-invite/')[1];

    const validateRes = await request(app).get(`/api/v1/invites/${token}/validate`);
    expect(validateRes.status).toBe(200);
    expect(validateRes.body.data.email).toBe('accept@example.com');

    const acceptRes = await request(app).post(`/api/v1/invites/${token}/accept`).send({
      name: 'Accept User',
      password: 'password123',
    });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.accessToken).toBeTruthy();
    expect(acceptRes.body.data.user.email).toBe('accept@example.com');
    expect(acceptRes.headers['set-cookie']?.[0]).toContain('refreshToken=');
  });
});
