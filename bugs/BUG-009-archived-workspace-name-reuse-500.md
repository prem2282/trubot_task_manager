# BUG-009 — Creating workspace with archived name returns 500

| Field | Value |
|-------|-------|
| **Status** | Fixed |
| **Found** | 2026-06-08 |
| **Area** | Workspaces / MongoDB index |

## Summary

After archiving a workspace named **HR**, creating a new workspace with the same name returned **Internal server error** instead of succeeding.

## Root cause

Application logic only checked duplicate names among **active** workspaces, but MongoDB had a **full** unique index on `(accountId, name)` that still included archived documents. `Workspace.create()` hit duplicate key error `11000`, which surfaced as 500.

## Fix

- Partial unique index: `{ accountId, name }` unique where `status: 'active'`
- `Workspace.syncIndexes()` on DB connect to replace legacy index
- `createWorkspace` catches duplicate key and returns 409 as a fallback

## Verify

1. Create workspace **HR**, add a task, archive **HR**.
2. Create a new workspace **HR** → 201 success.
3. Two active workspaces named **HR** still blocked with 409.
