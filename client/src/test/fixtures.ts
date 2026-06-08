import { MembershipAccount, Task, User } from '../types';

export const mockUser: User = {
  id: 'user1',
  name: 'Jane Doe',
  email: 'jane@example.com',
};

export const mockAccount = { id: 'acc1', name: 'Acme Corp' };
export const mockWorkspace = { id: 'ws1', name: 'Default Workspace' };

export const mockMemberships: MembershipAccount[] = [
  {
    accountId: 'acc1',
    name: 'Acme Corp',
    accountRole: 'admin',
    workspaces: [
      {
        workspaceId: 'ws1',
        name: 'Default Workspace',
        workspaceRole: 'admin',
        isDefault: true,
      },
      {
        workspaceId: 'ws2',
        name: 'Secondary',
        workspaceRole: 'member',
        isDefault: false,
      },
    ],
  },
  {
    accountId: 'acc2',
    name: 'Beta Inc',
    accountRole: 'member',
    workspaces: [
      {
        workspaceId: 'ws3',
        name: 'Beta Main',
        workspaceRole: 'admin',
        isDefault: true,
      },
    ],
  },
];

export const mockUsers: User[] = [
  mockUser,
  { id: 'user2', name: 'Bob Smith', email: 'bob@example.com' },
];

export const mockTask: Task = {
  _id: 'task1',
  title: 'Fix login bug',
  description: 'Investigate session persistence',
  status: 'in_progress',
  priority: 'high',
  assignee: mockUser,
  createdBy: mockUser,
  dueDate: '2026-06-15',
  comments: [
    {
      _id: 'comment1',
      author: mockUser,
      body: 'Started investigation',
      createdAt: '2026-06-08T10:00:00.000Z',
    },
  ],
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-08T10:00:00.000Z',
};
