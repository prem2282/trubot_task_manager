# Services: Auth and Membership

Business logic layer — controllers call these; services talk to the database.

---

## `authService.ts`

### `register(input: RegisterInput): Promise<AuthResult>`

**What it does:** Creates a brand-new account for a user who is signing up for the first time.

**Input fields:**
- `name`, `email`, `password` — required
- `accountName` — optional; defaults to `"{name}'s Account"`

**Steps (in a MongoDB transaction):**
1. Check email is not already used by a verified user
2. Create `Account` document
3. Create default `Workspace` (`isDefault: true`, name "Default Workspace")
4. Create or update `User` with bcrypt password, `verificationStatus: verified`
5. Create `AccountMembership` (role: admin, status: verified)
6. Create `WorkspaceMembership` (role: admin, status: verified)
7. Issue access + refresh tokens

**Returns:** `AuthResult` with tokens, user info, account, workspace, and JWT payload.

**Errors:** 409 if email already registered and verified.

---

### `login(email, password): Promise<AuthResult>`

**What it does:** Authenticates an existing verified user.

**Steps:**
1. Find user by email (including password hash)
2. Reject if user not found or no password set
3. Reject if `verificationStatus !== 'verified'` (403 — must complete invite first)
4. Compare password with bcrypt
5. Load user's memberships; pick their admin account or first account
6. Pick default workspace or first workspace in that account
7. Issue tokens for that context

**Returns:** `AuthResult`.

**Errors:** 401 invalid credentials; 403 unverified or no account access.

---

### `refreshAccessToken(refreshToken): Promise<{ accessToken, refreshToken }>`

**What it does:** Issues a new access token (and rotates the refresh token) using the refresh cookie.

**Steps:**
1. Verify refresh JWT signature
2. Find matching hash in `RefreshToken` collection
3. Delete old refresh token record (rotation)
4. Load user and memberships
5. Sign new access token for first available account/workspace
6. Store new refresh token hash

**Returns:** New access and refresh tokens.

**Errors:** 401 if token invalid or not found in database.

---

### `logout(refreshToken): Promise<void>`

**What it does:** Revokes the refresh token so the session cannot be renewed.

**Behavior:** Verifies token, deletes matching `RefreshToken` document. Silently ignores invalid tokens (logout should always " succeed" from the user's perspective).

---

### `switchContext(userId, accountId, workspaceId): Promise<AuthResult>`

**What it does:** Changes which account and workspace the user's JWT represents.

**Steps:**
1. Verify user is verified
2. Call `validateContextAccess()` — ensures memberships exist
3. Issue new tokens with updated `accountId`, `workspaceId`, and roles

**When used:** Account switcher and workspace switcher in the frontend.

---

### `getMe(userId, payload): Promise<object>`

**What it does:** Returns the current user's profile plus active account and workspace details.

**Uses:** JWT payload for account/workspace IDs; loads names from database.

---

### `listMemberships(userId): Promise<MembershipAccount[]>`

**What it does:** Returns the full tree of accounts and workspaces the user belongs to.

**Delegates to:** `membershipService.getUserMemberships()`.

---

### `buildAuthResult()` (internal)

**What it does:** Helper that signs tokens, stores refresh token hash, and builds the standard auth response object. Used by register, login, and switchContext.

---

## `membershipService.ts`

### `addToWorkspace(params): Promise<{ accountMembership, workspaceMembership, workspace }>`

**What it does:** Adds a user to a workspace **and** ensures they are an account member. This is the core rule: workspace membership always implies account membership.

**Parameters (`AddToWorkspaceParams`):**
- `userId`, `workspaceId` — who and where
- `workspaceRole`, `accountRole` — default `'member'`
- `status` — `'verified'` or `'unverified'`

**Steps (transaction):**
1. Load workspace; get parent `accountId`
2. Upsert `AccountMembership` (create or upgrade status to verified)
3. Upsert `WorkspaceMembership` (create or upgrade status)
4. Commit

**When used:** Invites, adding workspace members, registration.

---

### `countVerifiedWorkspaceAdmins(workspaceId): Promise<number>`

**What it does:** Counts verified workspace memberships with `workspaceRole: 'admin'`.

**When used:** Last-admin checks before demote or remove.

---

### `removeFromWorkspace(workspaceId, userId, requesterId, requesterAccountRole, requesterWorkspaceRole)`

**What it does:** Removes a user's workspace membership.

**Authorization:** Requester must be account admin OR workspace admin.

**Safety rule:** Cannot remove the sole workspace admin from a workspace.

**Note:** Does **not** remove account membership — user may still belong to other workspaces.

---

### `updateWorkspaceMemberRole(workspaceId, userId, workspaceRole, requesterAccountRole, requesterWorkspaceRole)`

**What it does:** Changes a verified member's workspace role between `admin` and `member`.

**Authorization:** Requester must be account admin OR workspace admin.

**Safety rule:** Cannot demote the sole workspace admin to `member` (same rule as remove).

**Returns:** Updated `WorkspaceMembership` document.

**When used:** `PATCH /workspaces/:id/members/:userId` via `workspaceService.updateWorkspaceMemberRole`.

---

### `getUserMemberships(userId): Promise<MembershipAccount[]>`

**What it does:** Builds the nested list of accounts → workspaces for the account/workspace switchers.

**Logic:**
1. Find all verified `AccountMembership` records for user
2. For each account, find verified `WorkspaceMembership` records in that account's workspaces
3. Skip accounts where user has no workspace memberships

---

### `validateContextAccess(userId, accountId, workspaceId)`

**What it does:** Confirms the user has verified access to both the account and the specific workspace.

**Throws:** 403 if account membership missing; 404 if workspace not in account; 403 if workspace membership missing.

**Returns:** The membership documents and workspace document.

**When used:** `switchContext()` before issuing new tokens.
