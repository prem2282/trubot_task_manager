# Audit TODO — systematic fixes

Priority-ordered from product/UX audit (2026-06-08). **All items implemented.**

## P0 — Logic inconsistencies

- [x] **AUDIT-001** Admin can see tasks but cannot open them — admins get Edit on TaskBoard + full modal access
- [x] **AUDIT-002** Delete aligned with server — owner **or** admin can delete (UI + API)
- [x] **AUDIT-003** Restore last active account/workspace after login, page load, and token refresh
- [x] **AUDIT-004** Accept invite calls `fetchMemberships` after session set
- [x] **AUDIT-005** Record `statusChange` on comments when status changes on save
- [x] **AUDIT-006** Reconnect socket + restore context after access-token refresh

## P1 — Missing features

- [x] **AUDIT-007** Task pagination — “Showing X of Y” + Load more
- [x] **AUDIT-008** Clear filters button on TaskBoard
- [x] **AUDIT-009** Workspace selector on Team invite form
- [x] **AUDIT-010** Revoke pending invites on Team page
- [x] **AUDIT-011** Team page helpful message for non-admin members

## P2 — Polish

- [x] **AUDIT-012** Sort tasks by due date (API default on fetch)
- [x] **AUDIT-013** “My tasks” quick filter (assignee = me)
- [x] **AUDIT-014** Workspace name in members page heading
- [x] **AUDIT-015** Info tips: tap-to-toggle on touch devices
- [x] **AUDIT-016** Toast feedback on task save / delete / invite / revoke / copy link

## Key files changed

| Area | Files |
|------|--------|
| Session | `authStore.ts`, `api.ts`, `App.tsx` |
| Tasks | `taskStore.ts`, `DashboardPage.tsx`, `TaskModal.tsx`, `taskHelpers.ts`, `taskService.ts` |
| Team | `TeamPage.tsx` |
| Workspaces | `WorkspacesPage.tsx`, `WorkspaceMembersPage.tsx`, `membershipService.ts`, `workspaceService.ts` |
| UX | `Toast.tsx`, `toastStore.ts`, `InfoTip.tsx`, `AcceptInvitePage.tsx` |

## Future ideas (not in scope)

- Account member list UI
- Task search / full pagination pages
- Unsaved-changes guard on task modal
- Server refresh token stores active workspace (avoid client switch after refresh)
