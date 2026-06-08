# Types and Services

---

## Types (`client/src/types/index.ts`)

Shared TypeScript shapes used across the frontend.

### `TaskStatus`

Values: `'todo' | 'in_progress' | 'done' | 'reopened' | 'closed'`

Used in filters, task forms, status chips, and table display. Owner-only transitions include reopen/close from `done`.

### `TaskPriority`

Values: `'low' | 'medium' | 'high'`

Used in task create/edit modal.

### `User`

```typescript
{ id: string; name: string; email: string }
```

Represents a person. Used in auth state and assignee dropdowns.

### `Account`

```typescript
{ id: string; name: string }
```

The organization/tenant the user is currently viewing.

### `Workspace`

```typescript
{ id: string; name: string }
```

The workspace within the account where tasks live.

### `MembershipAccount`

Describes one account the user belongs to, including nested workspaces:

```typescript
{
  accountId: string;
  name: string;
  accountRole: 'admin' | 'member';
  workspaces: {
    workspaceId: string;
    name: string;
    workspaceRole: 'admin' | 'member';
    isDefault: boolean;
  }[];
}
```

**Used by:** AccountSwitcher and WorkspaceSwitcher to build dropdown options.

### `Task`

Full task object from the API. Note MongoDB returns `_id` (not `id`). Assignee and createdBy may be populated objects or raw IDs.

### `ApiResponse<T>`

Generic wrapper matching backend JSON: `{ success, message?, data?, meta? }`.

---

## API client (`client/src/services/api.ts`)

### `api` (Axios instance)

**What it is:** Pre-configured HTTP client for all backend calls.

**Settings:**
- `baseURL` — from `VITE_API_URL` or `/api/v1` (Vite proxy in dev)
- `withCredentials: true` — sends refresh token cookie automatically

---

### `setAccessToken(token: string | null): void`

**What it does:** Stores the JWT access token in memory **and** in `localStorage` under `taskManager.accessToken`.

**Why localStorage + refresh cookie:** Survives page reload without forcing a refresh round-trip on every tab load; the refresh cookie still renews expired tokens via the 401 interceptor.

**Called by:** Auth store on login, register, refresh, logout, context switch.

---

### `loadStoredAccessToken(): string | null`

**What it does:** Reads the token from `localStorage` into the module-level variable on app bootstrap.

**When used:** `fetchMe()` in `authStore` before the first `/auth/me` call.

---

### `setOnTokenRefreshed(handler): void`

**What it does:** Registers a callback invoked after a successful silent token refresh (401 interceptor).

**When used:** `App.tsx` wires this to `restoreLastContext()` and `reconnectSocket()` so context and socket stay aligned after refresh.

---

### `getAccessToken(): string | null`

**What it does:** Returns the current in-memory access token.

**Used by:** Socket.io client when connecting.

---

### Request interceptor (anonymous function)

**What it does:** Before every API request, attaches `Authorization: Bearer <token>` if a token exists.

---

### Response interceptor (anonymous function)

**What it does:** Handles expired access tokens automatically.

**Flow:**
1. If response is 401 and request has not been retried yet
2. Skip refresh for `/auth/refresh`, `/auth/login`, and `/auth/register` (avoids interceptor deadlock)
3. Call `POST /auth/refresh` with credentials (cookie); deduplicated via shared `refreshPromise`
4. If new access token received → save it, call `onTokenRefreshed`, and retry the original request
5. If refresh fails → reject (caller may clear session)

**Why it matters:** User stays logged in across page reloads and token expiry without manually re-entering credentials.

---

## Socket client (`client/src/services/socket.ts`)

### `connectSocket(): Socket`

**What it does:** Creates a Socket.io connection to the backend (or returns existing one if already connected).

**Auth:** Sends `{ auth: { token: getAccessToken() } }` so the server can verify JWT and join the correct workspace room.

**Transports:** WebSocket first, falls back to polling.

**When called:** After login, register, invite accept, and when AppLayout restores session.

---

### `disconnectSocket(): void`

**What it does:** Disconnects and destroys the socket instance.

**When called:** On logout and before reconnecting after context switch.

---

### `getSocket(): Socket | null`

**What it does:** Returns current socket without creating a new one.

**Used by:** DashboardPage to attach event listeners.

---

### `reconnectSocket(): Socket`

**What it does:** Disconnects old socket and creates a fresh connection.

**When called:** After switching account or workspace, and after silent token refresh — new JWT may have a different `workspaceId`, so the client must rejoin the correct room.

---

## Task helpers (`client/src/utils/taskHelpers.ts`)

Shared display and permission helpers for the TaskBoard and TaskModal.

| Export | Purpose |
|--------|---------|
| `getUserId(value)` | Normalizes populated or raw MongoDB user refs to a string id |
| `ALL_TASK_STATUSES` / `ASSIGNEE_STATUSES` | Status enums for owner vs assignee flows |
| `statusLabel(status)` | Human-readable status text (e.g. `in_progress` → "In progress") |
| `statusChipClass(status)` | Tailwind classes for colored status chips on TaskBoard |
| `getDueDateUrgency(dueDate, taskStatus)` | Returns `past_due`, `due_today`, `approaching`, or `null` (hidden for done/closed) |
| `dueDateUrgencyLabel` / `dueDateUrgencyChipClass` | Label and styling for due-date urgency chips |
