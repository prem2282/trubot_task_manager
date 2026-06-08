export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'reopened' | 'closed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Account {
  id: string;
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
}

export interface MembershipAccount {
  accountId: string;
  name: string;
  accountRole: 'admin' | 'member';
  workspaces: {
    workspaceId: string;
    name: string;
    workspaceRole: 'admin' | 'member';
    isDefault: boolean;
  }[];
}

export interface TaskComment {
  _id: string;
  author: User | string;
  body: string;
  statusChange?: TaskStatus;
  createdAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: User | string;
  createdBy: User | string;
  dueDate?: string;
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
