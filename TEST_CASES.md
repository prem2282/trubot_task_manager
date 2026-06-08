# Test Case Index

One-line summary of every automated test. Use this to see what is covered without opening the test source files.

**156 tests total** — 47 client unit · 86 server unit · 23 server integration

Run everything: `./test.sh all`

---

## Client unit tests (47)

### `AppLayout`

- Redirects unauthenticated users to login.
- Renders TopNav and child route when authenticated.

### `TopNav`

- Renders navigation links, user name, and switchers.
- Logs out, disconnects socket, and navigates to login.

### `AccountSwitcher`

- Shows account name only when user has a single account.
- Renders a select when user has multiple accounts.
- Switches account and refreshes tasks when selection changes.

### `WorkspaceSwitcher`

- Shows workspace name only when account has a single workspace.
- Renders a select when account has multiple workspaces.
- Switches workspace and refreshes tasks when selection changes.

### `Toast`

- Renders nothing when there is no message.
- Renders the toast message from the store.

### `InfoTip` / `FieldLabel`

- Shows tooltip text after clicking the info button.
- Hides tooltip when clicked again.
- Renders label text without a tip when tip is omitted.
- Renders label with an info tip when tip is provided.

### `TaskModal`

- Renders create mode with a new task heading.
- Calls onClose when the close button is clicked.
- Calls onClose when Escape is pressed.
- Creates a task and closes on successful save.
- Renders existing comments in edit mode.
- Shows assignee-only read-only fields when user is assignee but not owner.
- Shows API error message when save fails.

### `TaskModal` — role permissions

- **Task owner:** Can edit title, status including closed, and add comments.
- **Assignee (not owner, not admin):** Shows read-only task fields and limited status options.
- **Assignee:** Submits status-only updates without title changes.
- **Assignee:** Locks closed tasks unless adding a comment.
- **Workspace admin viewing another user's task:** Can edit all fields on tasks they do not own.

### `DashboardPage` — role-specific actions

- **Workspace admin:** Shows Edit and Delete on tasks owned by others.
- **Workspace member:** Shows Edit and Delete on owned tasks.
- **Workspace member:** Shows View but not Delete on assigned tasks.
- **Workspace member:** Shows no actions on tasks the member neither owns nor is assigned to.
- **Account admin with workspace member role:** Still receives admin task actions via account admin privilege.

### `WorkspacesPage` — role-specific UI

- Shows create workspace form for account admins.
- Hides create workspace form for account members.
- Shows Manage members for workspace admins who are account members.

### `WorkspaceMembersPage` — role-specific UI

- **Workspace member (non-admin):** Shows read-only member list without management controls.
- **Workspace admin:** Shows role dropdown and remove for manageable members.
- **Workspace admin:** Disables remove and role change for the sole workspace admin.
- **Workspace admin:** Allows demoting an admin when multiple admins exist.
- **Account admin without workspace admin role:** Can still manage members via account admin privilege.

### `TeamPage` — role-specific UI

- Shows invite form and workspace selector for account admins.
- Shows guidance message instead of invite controls for account members.

### `authStore` — `isWorkspaceAdmin`

- Returns true for account admins regardless of workspace role.
- Returns true for workspace admins who are account members.
- Returns false for plain workspace members.
- Returns false when account or workspace id is missing.

---

## Server unit tests (86)

### Utils — `errors`

- `AppError` stores status code, message, and optional field errors.
- `isValidObjectId` accepts 24-character hex strings.
- `isValidObjectId` rejects invalid ids.

### Utils — `params`

- Returns a string route parameter.
- Returns the first value when parameter is an array.
- Throws when parameter is missing.

### Utils — `validators`

- **registerSchema:** Accepts valid registration input.
- **registerSchema:** Rejects short passwords with a field message.
- **registerSchema:** Rejects invalid email addresses.
- **loginSchema:** Requires email and password.
- **createTaskSchema:** Rejects past due dates.
- **createTaskSchema:** Allows create status values limited to assignee statuses.
- **updateTaskSchema:** Allows owner-only statuses on update.
- **updateTaskSchema:** Accepts optional comments.
- **createInviteSchema:** Requires a valid invite email.
- **updateMemberRoleSchema:** Only allows admin or member.
- **taskQuerySchema:** Coerces pagination params and validates sort options.

### Middleware — `authenticate`

- Requires a Bearer token.
- Rejects invalid tokens.
- Rejects unverified users.
- Attaches user context and continues for verified users.

### Middleware — `authorize`

- **requireAccountAdmin:** Allows account admins.
- **requireAccountAdmin:** Blocks account members with 403.
- **requireAccountAdmin:** Blocks unauthenticated requests with 401.
- **requireWorkspaceAdmin:** Allows workspace admins.
- **requireWorkspaceAdmin:** Allows account admins even when workspace role is member.
- **requireWorkspaceAdmin:** Blocks workspace members who are not account admins.

### Middleware — `validate`

- Passes parsed data through on success.
- Returns field-level validation errors on failure.
- Validates query strings when configured.

### Service — `authService`

- **register:** Rejects already verified emails.
- **register:** Rejects pending unverified emails with guidance.
- **register:** Creates account scaffolding and sends verification for new users.
- **login:** Rejects unknown credentials.
- **login:** Blocks unverified users.
- **login:** Rejects invalid passwords for verified users.
- **login:** Returns tokens for verified users with memberships.
- **switchContext:** Requires a verified user.
- **switchContext:** Issues a new token for valid account/workspace membership.
- **logout:** Swallows invalid refresh tokens.

### Service — `inviteService`

- **createInvite:** Returns immediate add result for verified users.
- **createInvite:** Creates a pending invitation for new users.
- **createInvite:** Rejects invites to workspaces outside the account.
- **validateInviteToken:** Returns invite preview details for valid tokens.
- **validateInviteToken:** Marks expired invitations and returns 410.
- **revokeInvite:** Revokes pending invitations for the account.
- **revokeInvite:** Returns 404 when invite is missing.
- **listInvites:** Lists pending invites without token hashes.
- **acceptInvite:** Verifies the user and returns auth tokens.

### Service — `workspaceService`

- **listWorkspaces:** Returns only verified workspaces in the active account.
- **createWorkspace:** Requires account admin membership.
- **createWorkspace:** Rejects duplicate workspace names within an account.
- **createWorkspace:** Creates a workspace and adds the creator as admin.
- **listWorkspaceMembers:** Returns 404 when workspace is outside the account.
- **listWorkspaceMembers:** Maps verified members with roles.
- **addWorkspaceMember:** Requires admin privileges on the workspace or account.
- **addWorkspaceMember:** Requires the target to be a verified account member.
- **addWorkspaceMember:** Adds verified account members as workspace members.
- **listAccountMembers:** Returns account roles and verification status.

### Service — `taskService` (core)

- **createTask:** Rejects past due dates.
- **createTask:** Defaults assignee to the creator when omitted.
- **createTask:** Requires assignees to belong to the workspace.
- **listTasks:** Scopes member queries to owned or assigned tasks.
- **listTasks:** Allows admins to query all workspace tasks.
- **listTasks:** Returns pagination metadata.

### Service — `taskService` (roles)

- **getTaskById:** Allows workspace admins to view tasks they do not own or assign.
- **getTaskById:** Allows assignees to view assigned tasks.
- **getTaskById:** Denies unrelated workspace members.
- **updateTask:** Allows assignees to update status only.
- **updateTask:** Blocks assignees from editing title or priority.
- **updateTask:** Blocks assignees from setting owner-only statuses.
- **updateTask:** Allows owners to close tasks from done.
- **updateTask:** Allows admins to edit tasks they neither own nor are assigned to.
- **deleteTask:** Allows owners to delete their tasks.
- **deleteTask:** Allows admins to delete tasks they do not own.
- **deleteTask:** Blocks assignees from deleting tasks.
- **deleteTask:** Blocks unrelated members from deleting tasks.

### Service — `membershipService` (roles)

- **removeFromWorkspace:** Rejects workspace members who are not admins.
- **removeFromWorkspace:** Allows workspace admins to remove non-admin members.
- **removeFromWorkspace:** Allows account admins to remove members even without workspace admin role.
- **removeFromWorkspace:** Prevents removing the last workspace admin.
- **updateWorkspaceMemberRole:** Rejects members without admin privileges.
- **updateWorkspaceMemberRole:** Allows workspace admins to promote a member to admin.
- **updateWorkspaceMemberRole:** Allows account admins to demote when multiple admins exist.
- **updateWorkspaceMemberRole:** Prevents demoting the last workspace admin.
- **updateWorkspaceMemberRole:** Returns unchanged membership when role is already set.

---

## Server integration tests (23)

HTTP + in-memory MongoDB. Email sending is mocked.

### Health

- `GET /api/v1/health` returns ok.

### Auth API

- `POST /auth/register` creates an unverified account and returns verification instructions.
- `POST /auth/register` returns field validation errors for invalid input.
- `POST /auth/login` authenticates a verified user and sets refresh cookie.
- `POST /auth/login` rejects invalid credentials.
- `GET /auth/me` returns the current user context.
- `GET /auth/me` rejects unauthenticated requests.
- `POST /auth/switch-context` changes active workspace in the token.
- `POST /auth/refresh` rotates access token using refresh cookie.

### Workspaces API

- Lists workspaces for the current account.
- Allows account admins to create workspaces.
- Blocks account members from creating workspaces.
- Adds account members to a workspace and manages roles (promote, demote, last-admin guard).
- Prevents removing the last workspace admin.
- Blocks workspace members from listing account members.

### Tasks API

- Creates, lists, updates, and deletes tasks for workspace admins.
- Scopes task visibility for workspace members.
- Allows assignees to update status but not arbitrary fields.
- Rejects task creation with past due dates.

### Invites API

- Immediately adds verified users without creating a pending invite.
- Creates pending invites for new users and allows revoke/list.
- Blocks account members from creating invites.
- Accepts a pending invite and logs the user in.
