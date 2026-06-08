# TODO — completed

All items below were implemented on 2026-06-08.

## Auth UX

- [x] **Forgot password prefill** — login passes email to `/forgot-password` via router state
- [x] **Confirm password** — Register, Accept invite, Reset password pages

## Tasks

- [x] **Due date** — cannot pick past dates on new/edit (client `min` + server validation)
- [x] **Delete** — visible only to task owner (creator)
- [x] **Assignee** — can change status (todo / in progress / done) and add comments
- [x] **Owner only** — title, description, priority, assignee, due date
- [x] **Owner reopen** — reopen from closed; re-opened / closed statuses when task is done
- [x] **Comments** — owner and assignee can add comments; optional status change on comment (assignee)
- [x] **New statuses** — `reopened`, `closed` (owner; from `done` or reopen from `closed`)

See `bugtracker.md` for runtime bugs.

---

## UX polish — completed 2026-06-08

- [x] **View members** — workspace members (non-admin) see “View members” instead of “Manage members”
- [x] **Register field order** — confirm password immediately follows password
- [x] **Top nav** — account/workspace switcher labels; single-account/workspace shows name only; Dashboard → TaskBoard; nav pills; user name above logout
- [x] **Info tips** — glassy hover tooltips on major fields and dropdowns (TaskBoard filters, task modal, register, team, workspaces)

## Workspace roles — completed 2026-06-08

- [x] **Promote/demote** — workspace admins (or account admins) can change member role between admin and member
- [x] **Last admin guard** — remove and demote disabled when only one workspace admin remains (UI + API)

New feature work can be added below. See [AUDIT-TODO.md](./AUDIT-TODO.md) for systematic audit fixes (completed 2026-06-08).
