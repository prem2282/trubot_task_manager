import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { clearDatabase, closeIntegrationApp, getIntegrationApp } from '../integrationApp';
import { seedMemberInAccount, seedVerifiedUser, withAuth } from '../integrationHelpers';

describe('Tasks API integration', () => {
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

  it('creates, lists, updates, and deletes tasks for workspace admins', async () => {
    const admin = await seedVerifiedUser(app, {
      email: 'taskadmin@example.com',
      name: 'Task Admin',
    });

    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set(withAuth(admin.accessToken))
      .send({
        title: 'Ship integration tests',
        description: 'Cover API flows',
        priority: 'high',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.title).toBe('Ship integration tests');

    const taskId = createRes.body.data._id;

    const listRes = await request(app).get('/api/v1/tasks').set(withAuth(admin.accessToken));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.meta.total).toBe(1);

    const updateRes = await request(app)
      .put(`/api/v1/tasks/${taskId}`)
      .set(withAuth(admin.accessToken))
      .send({ status: 'in_progress' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('in_progress');

    const deleteRes = await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set(withAuth(admin.accessToken));

    expect(deleteRes.status).toBe(200);

    const afterDelete = await request(app).get('/api/v1/tasks').set(withAuth(admin.accessToken));
    expect(afterDelete.body.data).toHaveLength(0);
  });

  it('scopes task visibility for workspace members', async () => {
    const admin = await seedVerifiedUser(app, {
      email: 'owner@example.com',
      name: 'Task Owner',
    });

    const member = await seedMemberInAccount(app, admin.accountId, admin.workspaceId, {
      email: 'member@example.com',
      name: 'Workspace Member',
      accountRole: 'member',
      workspaceRole: 'member',
    });

    const adminTask = await request(app)
      .post('/api/v1/tasks')
      .set(withAuth(admin.accessToken))
      .send({ title: 'Admin private task', assignee: admin.userId });

    const assignedTask = await request(app)
      .post('/api/v1/tasks')
      .set(withAuth(admin.accessToken))
      .send({ title: 'Member assignment', assignee: member.userId });

    expect(adminTask.status).toBe(201);
    expect(assignedTask.status).toBe(201);

    const memberList = await request(app).get('/api/v1/tasks').set(withAuth(member.accessToken));

    expect(memberList.status).toBe(200);
    expect(memberList.body.data).toHaveLength(1);
    expect(memberList.body.data[0].title).toBe('Member assignment');

    const forbiddenGet = await request(app)
      .get(`/api/v1/tasks/${adminTask.body.data._id}`)
      .set(withAuth(member.accessToken));

    expect(forbiddenGet.status).toBe(403);
  });

  it('allows assignees to update status but not arbitrary fields', async () => {
    const admin = await seedVerifiedUser(app, {
      email: 'assigner@example.com',
      name: 'Assigner',
    });

    const assignee = await seedMemberInAccount(app, admin.accountId, admin.workspaceId, {
      email: 'assignee@example.com',
      name: 'Assignee',
    });

    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set(withAuth(admin.accessToken))
      .send({ title: 'Assignable task', assignee: assignee.userId });

    const taskId = createRes.body.data._id;

    const statusUpdate = await request(app)
      .put(`/api/v1/tasks/${taskId}`)
      .set(withAuth(assignee.accessToken))
      .send({ status: 'in_progress' });

    expect(statusUpdate.status).toBe(200);
    expect(statusUpdate.body.data.status).toBe('in_progress');

    const titleUpdate = await request(app)
      .put(`/api/v1/tasks/${taskId}`)
      .set(withAuth(assignee.accessToken))
      .send({ title: 'Hijacked title' });

    expect(titleUpdate.status).toBe(403);
  });

  it('rejects task creation with past due dates', async () => {
    const admin = await seedVerifiedUser(app, { email: 'duedate@example.com' });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const res = await request(app)
      .post('/api/v1/tasks')
      .set(withAuth(admin.accessToken))
      .send({
        title: 'Late task',
        dueDate: yesterday.toISOString().slice(0, 10),
      });

    expect(res.status).toBe(400);
  });
});
