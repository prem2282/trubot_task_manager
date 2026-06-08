# Server Code Documentation

Plain-English reference for every module, function, type, and schema in `server/src/`.

## How to read this documentation

Each file below mirrors a folder or layer in the codebase. For every **function**, you will find:

- **What it does** — purpose in one sentence
- **When it runs** — who calls it and in what flow
- **Parameters** — what each input means
- **Returns** — what you get back
- **Side effects** — database writes, cookies, socket events, etc.
- **Errors** — what can go wrong

## Document index

| File | Covers |
|------|--------|
| [01-entry-and-config.md](./01-entry-and-config.md) | `server.ts`, `app.ts`, environment, database |
| [02-types-and-models.md](./02-types-and-models.md) | TypeScript types and Mongoose schemas |
| [03-utils.md](./03-utils.md) | JWT, crypto, validation, errors, params |
| [04-middleware.md](./04-middleware.md) | Auth, authorization, validation, error handling |
| [05-services-auth-and-membership.md](./05-services-auth-and-membership.md) | `authService`, `membershipService` |
| [06-services-workspace-invite-task.md](./06-services-workspace-invite-task.md) | Workspace, invite, and task business logic |
| [07-controllers.md](./07-controllers.md) | HTTP request handlers |
| [08-routes-and-sockets.md](./08-routes-and-sockets.md) | API routes and real-time events |
| [09-email-and-verification.md](./09-email-and-verification.md) | Email service, verification, password reset |

## Request flow (high level)

```
HTTP Request
  → app.ts (security middleware)
  → routes (URL matching)
  → middleware (auth, validate, authorize)
  → controller (parse request, send response)
  → service (business logic)
  → model (MongoDB)
```

Socket events are emitted from controllers after successful task mutations.

## Unit tests

Run from repo root:

```bash
./test.sh server
# or
npm run test:server
```

Run inside `server/`:

```bash
npm run test:run
```

| Test file | Covers |
|-----------|--------|
| `utils/__tests__/errors.test.ts` | `AppError`, `isValidObjectId` |
| `utils/__tests__/params.test.ts` | Route param helper |
| `utils/__tests__/validators.test.ts` | Zod schemas (auth, tasks, invites, members) |
| `middleware/__tests__/authenticate.test.ts` | JWT auth middleware |
| `middleware/__tests__/authorize.test.ts` | Account/workspace admin guards |
| `middleware/__tests__/validate.test.ts` | Request validation middleware |
| `services/__tests__/authService.test.ts` | Register, login, switch context, logout |
| `services/__tests__/inviteService.test.ts` | Invite create/add/pending, validate, revoke, accept |
| `services/__tests__/workspaceService.test.ts` | Workspaces CRUD, members, account member list |
| `services/__tests__/taskService.test.ts` | Task create rules, list visibility, pagination |
| `services/__tests__/membershipService.roles.test.ts` | Member role changes, last-admin guard |
| `services/__tests__/taskService.roles.test.ts` | Task permissions by role |

Integration tests live in `src/test/integration/` and run against an in-memory MongoDB replica set (no Docker required):

```bash
npm run test:integration
# or from repo root:
./test.sh integration
```

Suites cover health, auth, workspaces, tasks, and invites over HTTP with Supertest.
