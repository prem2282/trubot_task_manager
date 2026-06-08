# Zustand Stores

State management using Zustand — lightweight global stores without React Context boilerplate.

---

## Auth store (`client/src/store/authStore.ts`)

### `useAuthStore`

**What it is:** React hook to read and update authentication state.

**Usage examples:**
```typescript
const user = useAuthStore((s) => s.user);
const login = useAuthStore((s) => s.login);
```

---

### State properties

| Property | Type | Meaning |
|----------|------|---------|
| `user` | `User \| null` | Logged-in user's id, name, email |
| `account` | `Account \| null` | Currently active account |
| `workspace` | `Workspace \| null` | Currently active workspace |
| `memberships` | `MembershipAccount[]` | All accounts/workspaces user can switch to |
| `isAuthenticated` | `boolean` | True after successful login/register/session restore |
| `isLoading` | `boolean` | True while `fetchMe` is running |
| `authReady` | `boolean` | True after initial `fetchMe` completes (success or failure); gates `App.tsx` routing |

---

### `isWorkspaceAdmin(memberships, accountId, workspaceId): boolean`

**What it does:** Returns true if the user is account admin for the account **or** workspace admin for the given workspace.

**Used by:** DashboardPage (admin task actions), and anywhere workspace-admin checks are needed without duplicating logic.

---

### `setSession({ accessToken, user, account, workspace })`

**What it does:** Saves a new authenticated session after login, register, or invite accept.

**Side effects:**
- Calls `setAccessToken()` for API interceptor
- Saves `lastActiveAccountId` and `lastActiveWorkspaceId` to localStorage
- Updates all auth state fields
- Sets `isAuthenticated: true`

---

### `login(email, password): Promise<void>`

**What it does:** Signs the user in.

**API call:** `POST /auth/login`

**On success:** Calls `setSession()` then `fetchMemberships()`.

**On failure:** Throws — caller (LoginPage) shows error message.

---

### `register({ name, email, password, accountName? }): Promise<{ requiresVerification, email, message }>`

**What it does:** Creates a new account and sends a verification email (does not log the user in immediately).

**API call:** `POST /auth/register`

**Returns:** Verification instructions for the Register page “check your email” screen.

---

### `logout(): Promise<void>`

**What it does:** Ends the session.

**API call:** `POST /auth/logout` (best effort)

**Always:** Clears access token and resets all auth state to null/empty.

---

### `fetchMe(): Promise<void>`

**What it does:** Restores session on app load (called from `App.tsx`, not AppLayout).

**Flow:**
1. Set `isLoading: true`
2. `loadStoredAccessToken()` — hydrate access token from localStorage
3. `GET /auth/me` — load user, account, workspace (401 interceptor may refresh first)
4. `fetchMemberships()` then `restoreLastContext()` (non-blocking on failure)
5. Set `isAuthenticated` true or false; always set `authReady: true` in `finally`

**Why needed:** Combines persisted access token + refresh cookie for session continuity on reload.

---

### `fetchMemberships(): Promise<void>`

**What it does:** Loads the account/workspace tree for switcher dropdowns.

**API call:** `GET /auth/memberships`

---

### `restoreLastContext(): Promise<void>`

**What it does:** After login or session restore, switches back to the last active account/workspace stored in localStorage if they differ from the JWT default.

**When used:** End of `login`, `fetchMe`, and via `setOnTokenRefreshed` after silent token refresh.

---

### `switchContext(accountId, workspaceId): Promise<void>`

**What it does:** Changes active account and/or workspace without re-login.

**API call:** `POST /auth/switch-context`

**Updates:** Access token, account, workspace in store; persists IDs to localStorage.

**Note:** Caller should also `fetchMemberships()` when the current user's workspace role may have changed (e.g. role update on members page), reconnect socket, and refetch tasks after account/workspace switch.

---

## Task store (`client/src/store/taskStore.ts`)

### `useTaskStore`

**What it is:** React hook for task list state, filters, and local updates from socket events.

---

### State properties

| Property | Type | Meaning |
|----------|------|---------|
| `tasks` | `Task[]` | Current task list from last fetch |
| `meta` | pagination object \| null | Total count, pages from API |
| `filters` | object | Active filters (status, assignee, date range) |
| `isLoading` | `boolean` | True while fetching tasks |

---

### `fetchTasks(options?: { append?: boolean }): Promise<void>`

**What it does:** Loads tasks from the API using current filters.

**API call:** `GET /tasks?page=&limit=20&sortBy=dueDate&sortOrder=asc&...filters`

**Options:** `append: true` loads the next page and appends to `tasks` (used by Load more).

**Updates:** `tasks` and `meta` in store.

**When called:** Dashboard mount, after filter apply/clear, after context switch, after modal save.

---

### `loadMoreTasks(): Promise<void>`

**What it does:** Fetches the next page if `meta.page < meta.totalPages` and appends results.

**When used:** TaskBoard “Load more” button.

---

### `clearFilters(): Promise<void>`

**What it does:** Resets filters to `{}` and immediately refetches page 1.

**When used:** TaskBoard “Clear filters” button.

---

### `setFilters(filters): void`

**What it does:** Updates the filter object (does not fetch — caller must call `fetchTasks()`).

**Used by:** Dashboard filter form before "Apply" button.

---

### `upsertTask(task): void`

**What it does:** Adds a new task to the list or replaces an existing one by `_id`.

**When used:** Socket.io listeners on Dashboard when another user creates/updates a task, or after local create if socket event arrives.

---

### `removeTask(taskId): void`

**What it does:** Removes a task from local state by ID.

**When used:** Socket `task:deleted` event or after local delete.

---

### `clearTasks(): void`

**What it does:** Empties tasks and meta.

**When used:** Before context switch so stale tasks from the old workspace are not shown briefly.

---

## Toast store (`client/src/store/toastStore.ts`)

### `useToastStore`

**What it is:** Global transient notification state.

| Method | Purpose |
|--------|---------|
| `showToast(message)` | Shows message for 3 seconds (auto-clears) |
| `clearToast()` | Dismiss immediately |

**Rendered by:** `Toast.tsx` at app root (`App.tsx`).

**Used by:** DashboardPage, TeamPage, WorkspaceMembersPage, and other flows needing lightweight success feedback.
