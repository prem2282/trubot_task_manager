# Components

Reusable UI pieces in `client/src/components/`.

---

## Layout

### `AppLayout` (`components/layout/AppLayout.tsx`)

**What it renders:** The protected app shell — top navigation + page content area.

**Auth gate:** Redirects to `/login` when `isAuthenticated` is false. Initial session bootstrap runs in `App.tsx` before routes render.

**Authenticated:** Renders `TopNav` + `<Outlet />` for nested routes (Dashboard, Workspaces, etc.).

---

### `TopNav` (`components/layout/TopNav.tsx`)

**What it renders:** Responsive header bar with:
- Home icon link to TaskBoard (no text label)
- `AccountSwitcher` and `WorkspaceSwitcher` (stacked on small screens)
- Nav pills: **TaskBoard**, **Workspaces**, **Team**
- User name above **Logout** button

**Layout:** Column stack on mobile/tablet; horizontal on large screens.

**Logout flow:** Disconnects socket → calls `logout()` → navigates to `/login`.

---

## Switchers

### `AccountSwitcher` (`components/AccountSwitcher.tsx`)

**What it renders:** A `<select>` dropdown listing all accounts the user belongs to.

**Visibility:** Returns `null` (hidden) if user has only one account.

**On change:**
1. Finds default/first workspace in selected account
2. Calls `switchContext(accountId, workspaceId)`
3. Clears task store
4. Reconnects socket (new workspace room)
5. Refetches tasks

**Labels:** Shows “Account” label when multiple accounts exist; otherwise shows account name only.

**Shows loading state:** Dropdown disabled while switch is in progress.

---

### `WorkspaceSwitcher` (`components/WorkspaceSwitcher.tsx`)

**What it renders:** A `<select>` dropdown listing workspaces in the **current account**.

**Visibility:** Hidden if user has only one workspace in that account.

**On change:** Same as account switch but keeps same account, changes workspace only.

**Labels:** Shows “Workspace” label when multiple workspaces exist; otherwise shows workspace name only.

---

## Info tips

### `InfoTip` / `FieldLabel` (`components/InfoTip.tsx`)

**What it renders:** Italic **i** icon beside field labels; tooltip with glassy backdrop on hover or tap.

**Touch behavior:** Click toggles tooltip (`aria-expanded`); avoids clipped hover-only tooltips on mobile.

**Exports:**
- `InfoTip({ text })` — standalone icon + tooltip
- `FieldLabel({ label, tip?, className? })` — label row with optional tip

**Used on:** TaskBoard filters, TaskModal, Register, Team, Workspaces, and other forms.

---

## Notifications

### `Toast` (`components/Toast.tsx`)

**What it renders:** Fixed bottom-center banner when `toastStore.message` is set.

**Auto-dismiss:** 3 seconds via `showToast()`.

---

## Task UI

### `TaskModal` (`components/TaskModal.tsx`)

**What it renders:** A modal overlay with a form to create or edit a task, plus a comments panel on edit.

**Props:**

| Prop | Type | Purpose |
|------|------|---------|
| `task` | `Task \| null` | If null → create mode; if set → edit mode |
| `users` | `User[]` | Assignee dropdown options |
| `onClose` | `() => void` | Close modal without saving |
| `onSaved` | `() => void` | Called after successful save |

**Form fields:** title, description, status, priority, assignee, due date (with field-level info tips).

**Layout:** Two-column on desktop — form left, scrollable comments right; stacked on mobile. Comments auto-scroll to latest.

**Close behavior:** × button, **Escape** key, and closes automatically after successful save.

**Permissions:**
- **Owner / admin:** Full edit (title, description, priority, assignee, due date, status including reopen/close)
- **Assignee:** Status changes and comments only

**Comments:** Owner and assignee can add comments; optional status change on comment records `statusChange` in the comment payload.

**On submit:**
- Create: `POST /tasks`
- Edit: `PUT /tasks/:id` (may include `comment` body)

**Errors:** Shows API error message inside modal.

**Note:** Real-time update also arrives via socket; modal triggers `onSaved` which refetches for consistency.

---

## Internal helpers (not exported)

### `getUserName()` in DashboardPage

Converts assignee field (string ID or populated user object) to a display name for the task table.

### `getTaskActions()` in DashboardPage

Returns `{ canOpen, canDelete, openLabel }` based on owner, assignee, and workspace-admin status. Admins can open any task; delete allowed for owner or admin.
