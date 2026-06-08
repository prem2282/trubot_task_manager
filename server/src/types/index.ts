export type AccountRole = 'admin' | 'member';
export type WorkspaceRole = 'admin' | 'member';
export type VerificationStatus = 'verified' | 'unverified';
export type MembershipStatus = 'verified' | 'unverified';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'reopened' | 'closed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface JwtPayload {
  userId: string;
  accountId: string;
  workspaceId: string;
  accountRole: AccountRole;
  workspaceRole: WorkspaceRole;
}

export interface AuthContext extends JwtPayload {
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthContext;
    }
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MembershipAccount {
  accountId: string;
  name: string;
  accountRole: AccountRole;
  workspaces: {
    workspaceId: string;
    name: string;
    workspaceRole: WorkspaceRole;
    isDefault: boolean;
  }[];
}
