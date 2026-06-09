# Routes and Socket.io

---

## Route mounting (`routes/index.ts`)

All API routes live under `/api/v1`:

| Mount path | Router file | Purpose |
|------------|-------------|---------|
| `/auth` | `authRoutes.ts` | Login, register, tokens, context switch |
| `/workspaces` | `workspaceRoutes.ts` | Workspace CRUD and members |
| `/invites` | `inviteRoutes.ts` | Invitations (public accept + admin manage) |
| `/members` | `memberRoutes.ts` | Account-level member list |
| `/users` | `userRoutes.ts` | Workspace users for assignee picker |
| `/tasks` | `taskRoutes.ts` | Task CRUD |

**Health check:** `GET /api/v1/health` → `{ success: true, message: 'API is running' }`

---

## Auth routes (`authRoutes.ts`)

| Method | Path | Middleware | Handler |
|--------|------|------------|---------|
| POST | `/register` | rate limit, validate | register |
| POST | `/login` | rate limit, validate | login |
| POST | `/logout` | — | logout |
| POST | `/refresh` | — | refresh |
| GET | `/me` | authenticate | me |
| GET | `/memberships` | authenticate | memberships |
| POST | `/switch-context` | authenticate, validate | switchContext |

**Rate limit on auth:** 30 attempts per 15 minutes per IP.

---

## Workspace routes (`workspaceRoutes.ts`)

All routes require `authenticate`.

| Method | Path | Extra middleware | Handler |
|--------|------|------------------|---------|
| GET | `/` | — | listWorkspaces |
| POST | `/` | requireAccountAdmin, validate | createWorkspace |
| PATCH | `/:id` | validate | renameWorkspace |
| DELETE | `/:id` | — | deleteWorkspace |
| POST | `/:id/archive` | — | archiveWorkspace |
| GET | `/:id/members` | — | listMembers |
| POST | `/:id/members` | requireWorkspaceAdmin, validate | addMember |
| PATCH | `/:id/members/:userId` | requireWorkspaceAdmin, validate | updateMemberRole |
| DELETE | `/:id/members/:userId` | requireWorkspaceAdmin | removeMember |

---

## Invite routes (`inviteRoutes.ts`)

**Public routes (no auth):**

| Method | Path | Handler |
|--------|------|---------|
| GET | `/:token/validate` | validateInvite |
| POST | `/:token/accept` | acceptInvite |

**Protected routes (after `router.use(authenticate)`):**

| Method | Path | Middleware | Handler |
|--------|------|------------|---------|
| POST | `/` | validate | createInvite — account or workspace admin on target workspace |
| GET | `/` | — | listInvites — account admin (all) or `?workspaceId=` for workspace admin |
| DELETE | `/:id` | — | revokeInvite — account or workspace admin on invite workspace |

---

## Member routes (`memberRoutes.ts`)

| Method | Path | Middleware | Handler |
|--------|------|------------|---------|
| GET | `/` | authenticate, requireAccountAdmin | listAccountMembers |

---

## User routes (`userRoutes.ts`)

| Method | Path | Middleware | Handler |
|--------|------|------------|---------|
| GET | `/` | authenticate | listUsers |

---

## Task routes (`taskRoutes.ts`)

All routes require `authenticate`.

| Method | Path | Middleware | Handler |
|--------|------|------------|---------|
| GET | `/` | validate query | listTasks |
| GET | `/:id` | — | getTask |
| POST | `/` | validate body | createTask |
| PUT | `/:id` | validate body | updateTask |
| DELETE | `/:id` | — | deleteTask |

---

## Socket.io (`sockets/index.ts`)

### `initSocket(httpServer): Server`

**What it does:** Creates the Socket.io server attached to the HTTP server.

**Configuration:**
- CORS allows `CLIENT_URL` with credentials
- Auth middleware on every connection

**Connection flow:**
1. Client sends `{ auth: { token: accessToken } }` in handshake
2. Server verifies JWT with `verifyAccessToken()`
3. On success, client joins room `workspace:{workspaceId}` from token
4. On disconnect, client leaves the room

**Why rooms:** Task events only go to users viewing the same workspace — no cross-tenant leakage.

---

### `getIO(): Server | null`

**What it does:** Returns the global Socket.io instance.

**When used:** Task controllers call `getIO()?.to('workspace:...').emit(...)` after create/update/delete.

---

## Real-time events

| Event | Emitted when | Payload | Who receives |
|-------|--------------|---------|--------------|
| `task:created` | POST /tasks succeeds | `{ task }` | All clients in `workspace:{id}` room |
| `task:updated` | PUT /tasks/:id succeeds | `{ task }` | Same |
| `task:deleted` | DELETE /tasks/:id succeeds | `{ taskId, workspaceId }` | Same |

**Frontend handling:** Dashboard listens and calls `upsertTask()` or `removeTask()` on the task store.
