# Pages

Full-screen views in `client/src/pages/`. Each page corresponds to a route.

---

## `LoginPage.tsx`

**Route:** `/login`

**What it shows:** Email and password form with link to register.

**On submit:**
1. Calls `authStore.login(email, password)`
2. Connects Socket.io
3. Navigates to `/dashboard`

**Error handling:** Displays API error message. Shows **Resend verification email** when login blocked for unverified email. Link to **Forgot password?**.

---

## `RegisterPage.tsx`

**Route:** `/register`

**What it shows:** Form with name, email, password, and optional account name.

**On submit:**
1. Calls `authStore.register(form)`
2. Shows **Check your email** screen with link to Mailpit (local dev)
3. User verifies via email link → `VerifyEmailPage`

**Result:** Account + default workspace created; user unverified until email link clicked.

---

## `VerifyEmailPage.tsx`

**Route:** `/verify-email/:token`

**On mount:** `GET /auth/verify-email/:token/validate`

**On verify:** `POST /auth/verify-email/:token` → session + dashboard

---

## `ForgotPasswordPage.tsx`

**Route:** `/forgot-password`

**On submit:** `POST /auth/forgot-password` — always shows success message (no email enumeration).

---

## `ResetPasswordPage.tsx`

**Route:** `/reset-password/:token`

**On mount:** Validates token. **On submit:** `POST /auth/reset-password/:token` → redirect to login.

---

## `AcceptInvitePage.tsx`

**Route:** `/accept-invite/:token`

**What it shows:** Invitation preview (account name, email) and form for name + password.

**On mount:** Calls `GET /invites/:token/validate` to load invite details. Shows error if token invalid/expired.

**On submit:**
1. `POST /invites/:token/accept` with name and password
2. `setSession()` from response
3. Connect socket
4. Navigate to dashboard

**Public:** No prior login required — this is how invited users create their password.

---

## `DashboardPage.tsx`

**Route:** `/dashboard` (protected)

**What it shows:** Main task management UI (page title **TaskBoard**).

**Sections:**
1. **Header** — TaskBoard title, tagline, "New task" button
2. **Filters** — status, assignee, due date range, **My tasks** quick filter, Apply + **Clear filters**
3. **Table (desktop)** — title, colored status chips, assignee, due date with urgency chips, Edit/View + delete
4. **Cards (mobile)** — same data in stacked card layout
5. **Pagination** — "Showing X of Y" + **Load more**
6. **TaskModal** — opens for create/edit/view

**Task actions:**
- **Edit** — owner or workspace/account admin
- **View** — assignee (read-focused modal)
- **Delete** — owner or admin (with confirmation + toast)

**Status display:** Colored chips via `statusChipClass` / `statusLabel`.

**Due dates:** Urgency chips (Past due / Due today / Approaching) for active tasks via `getDueDateUrgency`.

**On mount:**
- `fetchTasks()` (sorted by due date ascending)
- Load users for assignee filter (`GET /users`)
- Connect socket and subscribe to:
  - `task:created` → `upsertTask`
  - `task:updated` → `upsertTask`
  - `task:deleted` → `removeTask`

**Delete:** Confirms with browser dialog, then `DELETE /tasks/:id`, toast on success.

**Open task:** Fetches full task via `GET /tasks/:id` before opening modal (ensures comments and permissions are current).

---

## `WorkspacesPage.tsx`

**Route:** `/settings/workspaces` (protected)

**What it shows:** List of workspaces the user belongs to in the current account, with page tagline.

**Account admin only feature:** "Create workspace" form at top (with info tip).

**Each row:** Workspace name, default badge, **· current** marker for active workspace, role, link to **Manage members** or **View members** (non-admins see view-only link).

**API calls:**
- `GET /workspaces` on load (refetch when account changes)
- `POST /workspaces` on create

---

## `WorkspaceMembersPage.tsx`

**Route:** `/settings/workspaces/:id/members` (protected)

**What it shows:** Members of one workspace with add/remove/role controls (heading includes workspace name).

**Workspace sync:** If nav workspace ≠ URL `:id`, redirects to `/settings/workspaces/{current}/members` so switching workspace in TopNav always shows the correct list.

**Add member (if admin):** Dropdown of verified account members not yet in workspace → `POST /workspaces/:id/members`.

**Change role (if admin):** Per-member dropdown **Admin** / **Member** → `PATCH /workspaces/:id/members/:userId` with `{ workspaceRole }`.

**Last admin rule:** Remove button and role dropdown are **disabled** for the sole workspace admin (tooltip: at least one admin required). Server enforces the same on DELETE and demote.

**Self role change:** If the current user’s role changes, calls `switchContext` + `fetchMemberships` to refresh JWT roles.

**Remove member (if admin):** `DELETE /workspaces/:id/members/:userId` with confirmation and toast.

**Authorization UI:** Management controls hidden if user is neither account admin nor workspace admin for this workspace.

**Back link:** Returns to Workspaces list.

---

## `TeamPage.tsx`

**Route:** `/settings/team` (protected)

**What it shows:** Invite form and pending invitations list (account admin), or a helpful message for non-admin members.

**Invite form:** Email + optional name + **workspace selector** → `POST /invites` with `workspaceId`.

**Two outcomes displayed:**
- **`type: pending`** — Shows copyable invite URL for admin to share manually + toast
- **`type: added`** — Toast that verified user was added immediately

**Pending list:** Shows email, workspace name, expiry, and **Revoke** button → `DELETE /invites/:id`.

**Non-admin users:** See explanatory copy instead of the invite form.

---

## Internal helpers

### `copyLink(url)` in TeamPage

Uses `navigator.clipboard.writeText()` to copy invite URL.

### `load()` in WorkspacesPage / WorkspaceMembersPage

Local functions that refetch data from API after mutations.
