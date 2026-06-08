import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { clearDatabase, closeIntegrationApp, getIntegrationApp } from '../integrationApp';
import { seedMemberInAccount, seedVerifiedUser, withAuth } from '../integrationHelpers';

describe('Workspaces API integration', () => {
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

  it('lists workspaces for the current account', async () => {
    const admin = await seedVerifiedUser(app, {
      email: 'ws-list@example.com',
      accountName: 'List Account',
    });

    const res = await request(app).get('/api/v1/workspaces').set(withAuth(admin.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Default Workspace');
    expect(res.body.data[0].workspaceRole).toBe('admin');
  });

  it('allows account admins to create workspaces', async () => {
    const admin = await seedVerifiedUser(app, { email: 'ws-create@example.com' });

    const res = await request(app)
      .post('/api/v1/workspaces')
      .set(withAuth(admin.accessToken))
      .send({ name: 'Engineering' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Engineering');
    expect(res.body.data.workspaceRole).toBe('admin');
  });

  it('blocks account members from creating workspaces', async () => {
    const admin = await seedVerifiedUser(app, { email: 'ws-owner@example.com' });
    const member = await seedMemberInAccount(app, admin.accountId, admin.workspaceId, {
      email: 'ws-member@example.com',
      accountRole: 'member',
      workspaceRole: 'member',
    });

    const res = await request(app)
      .post('/api/v1/workspaces')
      .set(withAuth(member.accessToken))
      .send({ name: 'Forbidden Workspace' });

    expect(res.status).toBe(403);
  });

  it('adds account members to a workspace and manages roles', async () => {
    const admin = await seedVerifiedUser(app, { email: 'ws-admin@example.com' });
    const member = await seedMemberInAccount(app, admin.accountId, admin.workspaceId, {
      email: 'ws-add@example.com',
      accountRole: 'member',
      workspaceRole: 'member',
    });

    const membersBefore = await request(app)
      .get(`/api/v1/workspaces/${admin.workspaceId}/members`)
      .set(withAuth(admin.accessToken));

    expect(membersBefore.body.data.some((m: { userId: string }) => m.userId === member.userId)).toBe(
      true
    );

    const promoteRes = await request(app)
      .patch(`/api/v1/workspaces/${admin.workspaceId}/members/${member.userId}`)
      .set(withAuth(admin.accessToken))
      .send({ workspaceRole: 'admin' });

    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.data.workspaceRole).toBe('admin');

    const demoteMemberRes = await request(app)
      .patch(`/api/v1/workspaces/${admin.workspaceId}/members/${member.userId}`)
      .set(withAuth(admin.accessToken))
      .send({ workspaceRole: 'member' });

    expect(demoteMemberRes.status).toBe(200);
    expect(demoteMemberRes.body.data.workspaceRole).toBe('member');

    const demoteLastAdminRes = await request(app)
      .patch(`/api/v1/workspaces/${admin.workspaceId}/members/${admin.userId}`)
      .set(withAuth(admin.accessToken))
      .send({ workspaceRole: 'member' });

    expect(demoteLastAdminRes.status).toBe(400);
    expect(demoteLastAdminRes.body.message).toContain('At least one workspace admin');
  });

  it('prevents removing the last workspace admin', async () => {
    const admin = await seedVerifiedUser(app, { email: 'ws-last-admin@example.com' });

    const res = await request(app)
      .delete(`/api/v1/workspaces/${admin.workspaceId}/members/${admin.userId}`)
      .set(withAuth(admin.accessToken));

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('At least one workspace admin');
  });

  it('blocks workspace members from listing account members', async () => {
    const admin = await seedVerifiedUser(app, { email: 'acct-admin@example.com' });
    const member = await seedMemberInAccount(app, admin.accountId, admin.workspaceId, {
      email: 'acct-member@example.com',
    });

    const allowed = await request(app).get('/api/v1/members').set(withAuth(admin.accessToken));
    const denied = await request(app).get('/api/v1/members').set(withAuth(member.accessToken));

    expect(allowed.status).toBe(200);
    expect(denied.status).toBe(403);
  });
});
