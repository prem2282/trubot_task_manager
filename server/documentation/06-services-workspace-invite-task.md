# Services: Workspace, Invite, and Task

---

## `workspaceService.ts`

### `listWorkspaces(userId, accountId)`

**What it does:** Returns all workspaces in the given account where the user has a verified membership.

**Returns:** Array of `{ id, name, isDefault, workspaceRole, taskCount }` for **active** workspaces only (archived excluded).

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

### `renameWorkspace(workspaceId, accountId, userId, name)`

**What it does:** Renames an active workspace.

**Authorization:** Caller must be **workspace admin** on the target workspace (membership checked by `workspaceId`, not JWT active workspace).

**Errors:** 403 not workspace admin; 404 not found / archived; 409 duplicate name in account.

---

### `deleteWorkspace(workspaceId, accountId, userId)`

**What it does:** Hard-deletes an **empty** workspace and its workspace memberships.

**Authorization:** Workspace admin on target.

**Rules:** Cannot delete default workspace, last active workspace in account, or workspace with any tasks (use archive instead).

---

### `archiveWorkspace(workspaceId, accountId, userId)`

**What it does:** Sets `status: 'archived'` and `archivedAt`. Workspace disappears from lists, switcher, and context switch; tasks remain in DB.

**Authorization:** Workspace admin on target.

**Rules:** Cannot archive empty workspace (delete instead), default workspace, or last active workspace.

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
4. Send invite email via `sendWorkspaceInviteEmail()` (Resend in production, Mailpit locally)
5. Return `{ type: 'pending', inviteUrl, expiresAt, email, emailSent }` — link also shown on Team page

If the email fails to send, the invite is still created and `emailSent` is `false` so the admin can share the link manually.

---

### `sendWorkspaceInviteEmail(options)`

**What it does:** Sends the workspace invitation email with account name, workspace name, inviter name, and accept link.

**Called by:** `createInvite()` for pending invites only.

---

### `assertCanInviteToWorkspace(userId, accountId, workspaceId)`

**What it does:** Permits account admins or workspace admins on the target workspace to create, list, or revoke invites for that workspace.

---

### `listInvites(accountId, requesterUserId, workspaceId?)`

**What it does:** Returns pending invitations (without token hashes). Account admins may list all; workspace admins must pass `workspaceId` for a workspace they admin.

---

### `revokeInvite(inviteId, accountId, requesterUserId)`

**What it does:** Marks a pending invitation as `revoked` after verifying the requester can manage invites for that invite's workspace.

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
