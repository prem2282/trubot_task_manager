import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { serializeTask } from '../taskSerializer';

describe('serializeTask', () => {
  it('adds id fields on populated assignee and createdBy', () => {
    const assigneeId = new Types.ObjectId();
    const creatorId = new Types.ObjectId();

    const serialized = serializeTask({
      toObject: () => ({
        _id: new Types.ObjectId(),
        title: 'Assigned task',
        assignee: { _id: assigneeId, name: 'Assignee', email: 'b@example.com' },
        createdBy: { _id: creatorId, name: 'Creator', email: 'a@example.com' },
      }),
    });

    expect(serialized.assignee).toMatchObject({
      id: assigneeId.toString(),
      _id: assigneeId.toString(),
      name: 'Assignee',
    });
    expect(serialized.createdBy).toMatchObject({
      id: creatorId.toString(),
      _id: creatorId.toString(),
      name: 'Creator',
    });
  });
});
