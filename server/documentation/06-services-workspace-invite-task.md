# Services: Workspace, Invite, and Task

---

## `workspaceService.ts`

### `listWorkspaces(userId, accountId)`

**What it does:** Returns all workspaces in the given account where the user has a verified membership.

**Returns:** Array of `{ id, name, isDefault, workspaceRole }`.

**When used:** Workspace switcher dropdown and Workspaces page.

---

### `createWorkspace(userId, accountId, name)`

**What it does:** Creates a new workspace in the account.

**Authorization:** Caller must be account admin (verified).

**Steps:**
1. Verify requester is account admin
2. Check workspace name is unique within account
3. Create `Workspace` document (`isDefault: false`)
4. Add creator as workspace admin via `addToWorkspace()`

**Returns:** New workspace info with `workspaceRole: 'admin'`.

**Errors:** 403 not admin; 409 duplicate name.

---

### `listWorkspaceMembers(workspaceId, accountId)`

**What it does:** Lists all verified members of a workspace.

**Returns:** `{ userId, name, email, workspaceRole }[]`.

**Validates:** Workspace belongs to the account.

---

### `addWorkspaceMember(workspaceId, accountId, targetUserId, requesterAccountRole, requesterWorkspaceRole)`

**What it does:** Adds an existing verified account member to a workspace.

**Authorization:** Account admin (any workspace) or workspace admin (own workspace).

**Requirements:** Target user must already be a verified account member.

**Returns:** Added member info.

---

### `updateWorkspaceMemberRole(workspaceId, accountId, targetUserId, workspaceRole, requesterAccountRole, requesterWorkspaceRole)`

**What it does:** Wrapper that validates workspace belongs to account, then delegates to `membershipService.updateWorkspaceMemberRole`.

**Returns:** `{ userId, name, email, workspaceRole }` for the updated member.

---

### `listAccountMembers(accountId)`

**What it does:** Lists everyone in the account (verified and unverified memberships).

**Returns:** `{ userId, name, email, accountRole, status, verificationStatus }[]`.

**When used:** Team page and workspace member picker (to add existing account users to a workspace).

---

## `inviteService.ts`

### `createInvite(invitedBy, accountId, workspaceId, email, name?)`

**What it does:** Invites someone to join a workspace — with two different paths depending on whether they already exist.

**Path A — Verified user (email already in system):**
1. Call `addToWorkspace()` with status verified
2. Return `{ type: 'added', user, accountId, workspaceId }` — no link needed

**Path B — New or unverified user:**
1. Create user stub if needed (`verificationStatus: unverified`, no password)
2. Call `addToWorkspace()` with status unverified
3. Generate random invite token; store hash in `Invitation`
4. Return `{ type: 'pending', inviteUrl, expiresAt, email }` for admin to copy manually

---

### `listInvites(accountId)`

**What it does:** Returns all pending invitations for the account (without exposing token hashes).

---

### `revokeInvite(inviteId, accountId)`

**What it does:** Marks a pending invitation as `revoked` so the link no longer works.

---

### `validateInviteToken(rawToken)`

**What it does:** Public check used by the Accept Invite page before showing the password form.

**Steps:**
1. Hash the raw token and find matching pending invitation
2. Reject if not found or expired (marks expired if past `expiresAt`)
3. Load account and workspace names for display

**Returns:** `{ email, accountName, workspaceName, inviteeName? }`.

---

### `acceptInvite(rawToken, name, password)`

**What it does:** Completes signup for an invited user.

**Steps:**
1. Validate invitation (same as validate)
2. Set user's name, password hash, `verificationStatus: verified`
3. Upgrade account and workspace memberships to verified
4. Mark invitation as accepted
5. Issue auth tokens and log user in

**Returns:** Auth result (same shape as login).

---

### `createAuthResultForUser()` (internal)

**What it does:** Builds tokens after invite acceptance — same pattern as login but for a specific account/workspace from the invitation.

---

## `taskService.ts`

### `listTasks(userId, workspaceId, accountRole, workspaceRole, filters)`

**What it does:** Returns a paginated, filtered list of tasks in the workspace.

**Visibility rules:**
- **Admin** (account or workspace): sees all tasks in workspace
- **Member:** sees only tasks they created OR are assigned to

**Filters supported:** status, assignee, dueDateFrom, dueDateTo, page, limit, sortBy, sortOrder.

**Returns:** `{ data: Task[], meta: PaginationMeta }`.

---

### `getTaskById(taskId, workspaceId, userId, accountRole, workspaceRole)`

**What it does:** Fetches one task with the same visibility rules as list.

**Errors:** 400 invalid ID; 404 not found; 403 no access.

---

### `createTask(userId, accountId, workspaceId, data)`

**What it does:** Creates a new task in the workspace.

**Defaults:** status `todo`, priority `medium`, assignee = creator if not specified.

**Validates:** Assignee must be a verified member of the workspace.

---

### `updateTask(taskId, workspaceId, userId, accountRole, workspaceRole, data)`

**What it does:** Updates task fields.

**Authorization:** Admin, creator, or assignee can update.

**Validates:** New assignee must be verified workspace member.

**Comments:** When a comment is saved alongside a status change, the new comment includes `statusChange` set to the task's new status (audit trail for assignee/owner comment flows).

---

### `deleteTask(taskId, workspaceId, userId, accountRole, workspaceRole)`

**What it does:** Permanently deletes a task.

**Authorization:** Admin or task creator only.

**Returns:** `{ taskId, workspaceId }` for socket broadcast.

---

### `listWorkspaceUsers(workspaceId)`

**What it does:** Returns verified workspace members for the assignee dropdown.

**Returns:** `{ id, name, email, workspaceRole }[]`.

---

### `buildVisibilityFilter()` (internal)

**What it does:** Returns a MongoDB query fragment restricting tasks to created-by or assigned-to the current user when they are not an admin.

---

### `ensureAssigneeInWorkspace()` (internal)

**What it does:** Confirms the assignee user ID is a verified member of the workspace before saving a task.
