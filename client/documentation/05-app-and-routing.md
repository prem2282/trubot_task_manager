# App Bootstrap and Routing

---

## `main.tsx`

**What it does:** Entry point that mounts the React application into the DOM.

**Steps:**
1. Finds `#root` element in `index.html`
2. Wraps `App` in `React.StrictMode` (development double-render checks)
3. Wraps in `BrowserRouter` for client-side routing
4. Renders to DOM

**No exports** — this file only runs once at startup.

---

## `App.tsx`

**What it does:** Defines all application routes and bootstraps auth before rendering.

**Bootstrap:**
1. On mount, calls `fetchMe()` once
2. Registers `setOnTokenRefreshed` → `restoreLastContext()` + `reconnectSocket()`
3. Shows centered **Loading...** until `authReady` is true
4. Renders global `<Toast />` above routes

### Public routes (no layout)

| Path | Component | Purpose |
|------|-----------|---------|
| `/login` | LoginPage | Sign in |
| `/register` | RegisterPage | Create new account |
| `/verify-email/:token` | VerifyEmailPage | Confirm email after register |
| `/forgot-password` | ForgotPasswordPage | Request password reset |
| `/reset-password/:token` | ResetPasswordPage | Set new password |
| `/accept-invite/:token` | AcceptInvitePage | Complete invitation |

### Protected routes (inside AppLayout)

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Redirect → `/dashboard` | Default entry |
| `/dashboard` | DashboardPage | Task board |
| `/settings/workspaces` | WorkspacesPage | List/create workspaces |
| `/settings/workspaces/:id/members` | WorkspaceMembersPage | Manage workspace members |
| `/settings/team` | TeamPage | Invites (admin) |

### Catch-all

| Path | Behavior |
|------|----------|
| `*` | Redirect to `/dashboard` |

**Export:** Default export `App` component.

---

## `vite-env.d.ts`

**What it does:** TypeScript declaration file for Vite environment variables.

**Declares:**
- `ImportMetaEnv` with `VITE_API_URL` and `VITE_WS_URL`
- Extends `ImportMeta` so `import.meta.env.VITE_*` is typed

**No runtime code** — types only.

---

## `index.css`

**What it does:** Global styles via Tailwind CSS directives.

- `@tailwind base/components/utilities` — includes Tailwind
- Sets body background to slate-50 and enables antialiased text

---

## Route protection pattern

```
App mounts
  → fetchMe() (load token from localStorage, GET /auth/me)
  → authReady = true
  → Routes render

User visits /dashboard
  → AppLayout checks isAuthenticated
  → If success: render TopNav + DashboardPage
  → If fail: <Navigate to="/login" />
```

Public routes (`/login`, `/register`, `/accept-invite`) bypass AppLayout entirely.

---

## Data flow summary

```
User action (click, submit)
  → Page component
  → Zustand store method OR direct api call
  → api.ts (adds Bearer token, handles 401 refresh)
  → Backend REST API
  → Response updates store
  → React re-renders

Real-time (Dashboard):
  → socket.ts connection
  → task:created | updated | deleted
  → taskStore.upsertTask / removeTask
  → Table updates without manual refresh

Session refresh (401 interceptor):
  → POST /auth/refresh
  → restoreLastContext + reconnectSocket
  → Retried request continues with new token
```

---

## Context switch flow

```
User selects different account or workspace in TopNav
  → AccountSwitcher / WorkspaceSwitcher
  → authStore.switchContext()
  → taskStore.clearTasks()
  → reconnectSocket() (join new workspace room)
  → taskStore.fetchTasks()
  → Dashboard shows new workspace's tasks
```
