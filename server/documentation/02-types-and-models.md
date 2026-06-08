# Types and Database Models

---

## Types (`server/src/types/index.ts`)

These are shared TypeScript definitions used across services, middleware, and JWT handling.

### Type aliases

| Name | Values | Purpose |
|------|--------|---------|
| `AccountRole` | `'admin' \| 'member'` | User's role within an account |
| `WorkspaceRole` | `'admin' \| 'member'` | User's role within a workspace |
| `VerificationStatus` | `'verified' \| 'unverified'` | Whether a user has completed signup (set password) |
| `MembershipStatus` | `'verified' \| 'unverified'` | Whether a membership is active |
| `TaskStatus` | `'todo' \| 'in_progress' \| 'done' \| 'reopened' \| 'closed'` | Task workflow state |
| `TaskPriority` | `'low' \| 'medium' \| 'high'` | Task urgency |
| `InvitationStatus` | `'pending' \| 'accepted' \| 'expired' \| 'revoked'` | Invite link lifecycle |

### `JwtPayload` (interface)

**What it holds:** The data embedded inside every access JWT token.

| Field | Meaning |
|-------|---------|
| `userId` | Who is logged in |
| `accountId` | Which account they are currently viewing |
| `workspaceId` | Which workspace they are currently viewing |
| `accountRole` | Their admin/member role in that account |
| `workspaceRole` | Their admin/member role in that workspace |

**Why it matters:** Every protected API request reads these values from the token to scope data and check permissions.

### `AuthContext` (interface)

Extends `JwtPayload` with `email` and `name` — attached to `req.user` after authentication middleware runs.

### `ApiResponse<T>` (interface)

Standard JSON shape for all API responses: `{ success, message?, data?, errors? }`.

### `PaginationMeta` (interface)

Pagination info for list endpoints: `{ page, limit, total, totalPages }`.

### `MembershipAccount` (interface)

Nested structure returned by `/auth/memberships`: one account with an array of workspaces the user belongs to.

### Express global augmentation

Adds optional `user?: AuthContext` to Express `Request` so TypeScript knows about `req.user` after auth middleware.

---

## Models (`server/src/models/`)

Each model is a Mongoose schema + model. Models define how data is stored in MongoDB.

### `User` (`User.ts`)

**Purpose:** Represents a person who can log in. One user can belong to many accounts.

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Display name, 2–100 chars |
| `email` | string | Unique, lowercase |
| `passwordHash` | string | Bcrypt hash; never returned in API responses (`select: false`) |
| `verificationStatus` | enum | `verified` after register or invite accept; `unverified` while pending |

**Exports:** `IUser` interface, `User` model.

---

### `Account` (`Account.ts`)

**Purpose:** Top-level tenant — every registration creates one account.

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Organization/account name |

**Exports:** `IAccount`, `Account`.

---

### `Workspace` (`Workspace.ts`)

**Purpose:** Container for tasks within an account. Registration creates a default workspace.

| Field | Type | Notes |
|-------|------|-------|
| `accountId` | ObjectId | Parent account |
| `name` | string | Unique within account |
| `isDefault` | boolean | True for auto-created workspace on register |

**Indexes:** Unique `(accountId, name)`; `(accountId, isDefault)`.

**Exports:** `IWorkspace`, `Workspace`.

---

### `AccountMembership` (`AccountMembership.ts`)

**Purpose:** Join table linking a user to an account with a role.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | Ref to User |
| `accountId` | ObjectId | Ref to Account |
| `accountRole` | enum | `admin` or `member` |
| `status` | enum | `verified` or `unverified` |

**Exports:** `IAccountMembership`, `AccountMembership`.

---

### `WorkspaceMembership` (`WorkspaceMembership.ts`)

**Purpose:** Join table linking a user to a workspace with a role.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | Ref to User |
| `workspaceId` | ObjectId | Ref to Workspace |
| `workspaceRole` | enum | `admin` or `member` |
| `status` | enum | `verified` or `unverified` |

**Rule:** A user in a workspace must also have account membership (enforced in `membershipService`).

**Exports:** `IWorkspaceMembership`, `WorkspaceMembership`.

---

### `Invitation` (`Invitation.ts`)

**Purpose:** Tracks pending invite links for new/unverified users.

| Field | Type | Notes |
|-------|------|-------|
| `accountId`, `workspaceId`, `invitedBy` | ObjectId | Context |
| `email` | string | Invitee email |
| `tokenHash` | string | SHA-256 of raw token (raw token never stored) |
| `status` | enum | pending → accepted/expired/revoked |
| `expiresAt` | Date | Auto-expire via TTL index |

**Exports:** `IInvitation`, `Invitation`.

---

### `Task` (`Task.ts`)

**Purpose:** A task item scoped to one workspace.

| Field | Type | Notes |
|-------|------|-------|
| `accountId` | ObjectId | Denormalized for tenant queries |
| `workspaceId` | ObjectId | Task boundary |
| `title`, `description` | string | Content |
| `status`, `priority` | enum | Workflow fields |
| `assignee`, `createdBy` | ObjectId | Ref to User |
| `dueDate` | Date | Optional deadline |
| `comments` | subdocument[] | `{ author, body, statusChange?, createdAt }` — optional `statusChange` when comment accompanies a status update |

**Exports:** `ITask`, `Task`.

---

### `RefreshToken` (`RefreshToken.ts`)

**Purpose:** Stores hashed refresh tokens so logout can revoke them.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | Owner |
| `tokenHash` | string | Hash of JWT refresh token |
| `expiresAt` | Date | TTL auto-deletes expired tokens |

**Exports:** `IRefreshToken`, `RefreshToken`.

---

### `models/index.ts`

Re-exports all eight models for convenient importing: `Account`, `Workspace`, `User`, `AccountMembership`, `WorkspaceMembership`, `Invitation`, `Task`, `RefreshToken`.
