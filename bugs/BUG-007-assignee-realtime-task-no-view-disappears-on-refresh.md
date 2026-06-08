# BUG-007 — Assignee sees realtime task without View; task gone after refresh

| Field | Value |
|-------|-------|
| **Status** | Fixed |
| **Found** | 2026-06-08 |
| **Area** | Dashboard / Socket.io / task visibility |

## Summary

When user A created a task assigned to user B, user B saw the task appear in real time but had no **View** button. After a page refresh the task disappeared from B’s board.

## Root cause

1. **Socket events** pushed every workspace task into the client store without applying the same visibility rules as `GET /tasks` (members only see tasks they created or are assigned to).
2. **User id shape mismatch** — realtime payloads often had Mongoose-style `assignee._id` without a top-level `id`, so `getUserId()` failed and the UI hid **View** even when the assignee should have access.
3. **Stale socket listeners** after workspace reconnect could miss events (secondary).

## Fix

- Server: `serializeTask()` normalizes `assignee` / `createdBy` with both `id` and `_id` on API responses and Socket.io emits.
- Client: `canViewTask()`, improved `getUserId()`, `normalizeTask()` on fetch and socket upserts.
- Dashboard: socket handlers filter by visibility and re-bind when workspace/user context changes.

## Verify

1. Log in as workspace member B (non-admin).
2. As admin A, create a task assigned to B.
3. B should see the task with **View**, in real time and after refresh.
4. B should not see unrelated tasks created for other members via socket alone.
