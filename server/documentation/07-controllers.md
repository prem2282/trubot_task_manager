# Controllers (HTTP Handlers)

Controllers sit between routes and services. They read the HTTP request, call a service, and write the HTTP response. They should **not** contain business logic.

---

## `authController.ts`

### `register(req, res, next)`

**Route:** `POST /api/v1/auth/register`

**What it does:** Handles new user registration.

**Flow:** Calls `authService.register(req.body)` → sets refresh token cookie → returns 201 with access token, user, account, workspace.

---

### `login(req, res, next)`

**Route:** `POST /api/v1/auth/login`

**What it does:** Handles user login.

**Flow:** Calls `authService.login(email, password)` → sets cookie → returns 200 with tokens and context.

---

### `logout(req, res, next)`

**Route:** `POST /api/v1/auth/logout`

**What it does:** Logs the user out.

**Flow:** Reads refresh token from cookie → `authService.logout()` → clears cookie → returns success message.

**Note:** Does not require access token — works even if access token expired.

---

### `refresh(req, res, next)`

**Route:** `POST /api/v1/auth/refresh`

**What it does:** Gets a new access token using the refresh cookie.

**Flow:** Reads cookie → `authService.refreshAccessToken()` → sets new cookie → returns new access token.

**Used by:** Frontend on page reload and when access token expires (401 interceptor).

---

### `me(req, res, next)`

**Route:** `GET /api/v1/auth/me` (requires auth)

**What it does:** Returns current user profile and active account/workspace.

**Uses:** `req.user` from JWT middleware.

---

### `memberships(req, res, next)`

**Route:** `GET /api/v1/auth/memberships` (requires auth)

**What it does:** Returns all accounts and workspaces the user belongs to.

**Used by:** Account switcher and workspace switcher dropdowns.

---

### `switchContext(req, res, next)`

**Route:** `POST /api/v1/auth/switch-context` (requires auth)

**Body:** `{ accountId, workspaceId }`

**What it does:** Switches active tenant context and reissues tokens.

**Flow:** `authService.switchContext()` → new cookie → returns new access token, account, workspace.

---

## `workspaceController.ts`

### `listWorkspaces(req, res, next)`

**Route:** `GET /api/v1/workspaces`

**What it does:** Lists workspaces in the user's current account (from JWT).

---

### `createWorkspace(req, res, next)`

**Route:** `POST /api/v1/workspaces` (account admin only)

**Body:** `{ name }`

**What it does:** Creates a new workspace.

---

### `renameWorkspace(req, res, next)`

**Route:** `PATCH /api/v1/workspaces/:id`

**Body:** `{ name }`

**What it does:** Renames the workspace. Caller must be workspace admin on `:id`.

---

### `deleteWorkspace(req, res, next)`

**Route:** `DELETE /api/v1/workspaces/:id`

**What it does:** Hard-deletes an empty workspace and its memberships. Not allowed for default, last active, or non-empty workspaces.

---

### `archiveWorkspace(req, res, next)`

**Route:** `POST /api/v1/workspaces/:id/archive`

**What it does:** Marks workspace archived (hidden from lists). Tasks retained. Not allowed for empty, default, or last active workspaces.

---

### `listMembers(req, res, next)`

**Route:** `GET /api/v1/workspaces/:id/members`

**What it does:** Lists members of the workspace specified by `:id`.

---

### `addMember(req, res, next)`

**Route:** `POST /api/v1/workspaces/:id/members` (workspace admin)

**Body:** `{ userId }`

**What it does:** Adds an account member to the workspace.

---

### `removeMember(req, res, next)`

**Route:** `DELETE /api/v1/workspaces/:id/members/:userId` (workspace admin)

**What it does:** Removes a user from the workspace. Fails with 400 if target is the last workspace admin.

---

### `updateMemberRole(req, res, next)`

**Route:** `PATCH /api/v1/workspaces/:id/members/:userId` (workspace admin)

**Body:** `{ workspaceRole: 'admin' | 'member' }`

**What it does:** Promotes or demotes a workspace member. Fails with 400 if demoting the last workspace admin.

---

### `listAccountMembers(req, res, next)`

**Route:** `GET /api/v1/members` (account admin)

**What it does:** Lists all members of the current account.

---

## `inviteController.ts`

### `createInvite(req, res, next)`

**Route:** `POST /api/v1/invites` (account admin)

**Body:** `{ email, name?, workspaceId? }` — workspaceId defaults to current workspace from JWT.

**What it does:** Invites a user — returns either `{ type: 'added' }` or `{ type: 'pending', inviteUrl }`.

---

### `listInvites(req, res, next)`

**Route:** `GET /api/v1/invites` (account admin)

**What it does:** Lists pending invitations.

---

### `revokeInvite(req, res, next)`

**Route:** `DELETE /api/v1/invites/:id` (account admin)

**What it does:** Revokes a pending invitation.

---

### `validateInvite(req, res, next)`

**Route:** `GET /api/v1/invites/:token/validate` (public)

**What it does:** Validates invite token for the Accept Invite page (shows account name before password form).

---

### `acceptInvite(req, res, next)`

**Route:** `POST /api/v1/invites/:token/accept` (public)

**Body:** `{ name, password }`

**What it does:** Completes invite signup and logs user in (sets cookie, returns tokens).

---

## `taskController.ts`

### `listTasks(req, res, next)`

**Route:** `GET /api/v1/tasks`

**What it does:** Returns filtered, paginated tasks for current workspace.

**Query params:** Passed from validated `req.query` (status, assignee, dates, page, limit, sort).

---

### `getTask(req, res, next)`

**Route:** `GET /api/v1/tasks/:id`

**What it does:** Returns a single task by ID.

---

### `createTask(req, res, next)`

**Route:** `POST /api/v1/tasks`

**What it does:** Creates a task, then **emits `task:created`** to the workspace Socket.io room so all connected clients update instantly.

---

### `updateTask(req, res, next)`

**Route:** `PUT /api/v1/tasks/:id`

**What it does:** Updates a task, then **emits `task:updated`** to the workspace room.

---

### `deleteTask(req, res, next)`

**Route:** `DELETE /api/v1/tasks/:id`

**What it does:** Deletes a task, then **emits `task:deleted`** with `{ taskId, workspaceId }`.

---

### `listUsers(req, res, next)`

**Route:** `GET /api/v1/users`

**What it does:** Returns workspace members for assignee dropdowns (delegates to `taskService.listWorkspaceUsers`).
