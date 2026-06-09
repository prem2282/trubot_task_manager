# BUG-008 — Workspace members page always shows default workspace name

| Field | Value |
|-------|-------|
| **Status** | Fixed |
| **Found** | 2026-06-08 |
| **Area** | Workspaces / WorkspaceMembersPage / context switch |

## Summary

From the Workspaces page, clicking **Manage members** on a non-default workspace (e.g. Engineering) opened the members list for that workspace ID in the URL, but the page heading always showed **Default Workspace — members**. The active workspace in the nav did not change.

## Root cause

`WorkspaceMembersPage` had a `useEffect` that **redirected** to `/settings/workspaces/{currentWorkspace.id}/members` whenever the URL workspace id did not match the JWT active workspace. So choosing any other workspace’s link was immediately replaced with the default workspace route.

The heading was derived from `memberships` using the URL id, but users were never left on that URL long enough to see the correct name — and the nav context stayed on the default workspace.

## Fix

- Removed the redirect-to-current-workspace effect.
- On mount / URL change: if the user has access to the workspace in the URL, call `switchContext(accountId, workspaceId)` and `reconnectSocket()` so the nav and JWT match the workspace being managed.
- Heading uses the target workspace from memberships (with fallback to active workspace name).
- Redirect to `/settings/workspaces` only when the user has no membership for the URL id.

## Verify

1. Create a second workspace (e.g. Engineering).
2. On Workspaces, click **Manage members** on Engineering.
3. Heading shows `Engineering — members` (not Default Workspace).
4. Nav workspace switcher updates to Engineering.
5. Member list matches Engineering’s members.
