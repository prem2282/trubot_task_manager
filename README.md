# TruBotAI Task Manager

Multi-tenant MERN task management app with accounts, workspaces, invitations, email verification, password reset, and real-time updates.

**Live demo:** [https://trubotai-taskmanager.netlify.app](https://trubotai-taskmanager.netlify.app) · API: [health check](https://trubot-task-manager.onrender.com/api/v1/health) · [Swagger](https://trubot-task-manager.onrender.com/api-docs)

For a plain-English walkthrough of features and scope, see [SCOPE.md](./SCOPE.md).

## Stack

- **Backend:** Node.js, Express, TypeScript, Mongoose, Socket.io, JWT, Nodemailer (runs in **Docker** locally and on Render)
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Zustand (runs on host in dev)
- **Database:** MongoDB (Atlas in production; local via Docker)
- **Email (local):** Mailpit via Docker
- **Email (production):** Resend (free tier)

## Project structure

```
├── server/          # Express API + Socket.io + Dockerfile
├── client/          # React SPA (host dev server)
├── docker-compose.yml   # MongoDB, Mailpit, API container
├── dev.sh               # Docker stack + UI
└── test.sh              # Unit + integration test runner
```

## Prerequisites

- **Node.js 20+** — for the React UI and tests (`nvm use`)
- **Docker** — MongoDB, Mailpit, and the API container (Colima or Docker Desktop)

## Local setup

**Quick start:** `./dev.sh start` — see [localrun.md](./localrun.md) for URLs, Mailpit, and troubleshooting.

See also [bugtracker.md](./bugtracker.md).

### Services (after `./dev.sh start`)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:5000 |
| Swagger | http://localhost:5000/api-docs |
| **Mailpit (emails)** | **http://localhost:8025** |

### First-time env setup

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Merge new email variables into `server/.env` if you already have one from before this feature.

## Environment variables

### Server (`server/.env`)

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Min 32 chars |
| `JWT_REFRESH_SECRET` | Min 32 chars |
| `CLIENT_URL` | Frontend URL for CORS + email links |
| `PORT` | API port (default 5000) |
| `EMAIL_PROVIDER` | `smtp` (local) or `resend` (production) |
| `EMAIL_FROM` | Sender address |
| `SMTP_HOST` / `SMTP_PORT` | Mailpit: `localhost` / `1025` |
| `RESEND_API_KEY` | Required when `EMAIL_PROVIDER=resend` |
| `EMAIL_VERIFICATION_EXPIRY_HOURS` | Default 24 |
| `PASSWORD_RESET_EXPIRY_HOURS` | Default 1 |

### Client (`client/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_WS_URL` | Socket.io server URL |

## Deployment (separate services, one repo)

| Service | Platform | Root directory | Runtime |
|---------|----------|----------------|---------|
| Backend | Render | `server/` | **Docker** (`server/Dockerfile`) |
| Frontend | Vercel / Netlify | `client/` | Static build |
| Database | MongoDB Atlas | — | Managed |
| Email | [Resend](https://resend.com) | API key on backend | — |

Full deploy runbook: `internal/PRODUCTION-DEPLOYMENT.md` (local only). Summary: [server/DEPLOYMENT.md](./server/DEPLOYMENT.md).

### Production URLs

| Service | URL |
|---------|-----|
| **App (Netlify)** | https://trubotai-taskmanager.netlify.app |
| API (Render) | https://trubot-task-manager.onrender.com |
| Health | https://trubot-task-manager.onrender.com/api/v1/health |
| Swagger | https://trubot-task-manager.onrender.com/api-docs |

Netlify build env: `VITE_API_URL=https://trubot-task-manager.onrender.com/api/v1`, `VITE_WS_URL=https://trubot-task-manager.onrender.com`.

Production backend env:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM=Task Manager <onboarding@yourdomain.com>
CLIENT_URL=https://trubotai-taskmanager.netlify.app
```

## Features implemented

- Register → verification email → verify → login
- Forgot password → reset email → new password
- Login / logout with JWT + refresh token (httpOnly cookie); session survives page reload
- Multi-account + multi-workspace switchers in nav; restores last active context
- Create workspaces, manage workspace members, promote/demote workspace roles (last-admin guard)
- Invite users (invite email + copyable link for new users; instant add for verified users); revoke pending invites
- Task CRUD with filters, pagination, status/due-date chips, comments, assignee permissions
- Real-time task updates via Socket.io (workspace-scoped rooms)

## Auth flows (demo)

1. **Register** at http://localhost:5173/register
2. Open **Mailpit** at http://localhost:8025 → click verification link
3. **Forgot password** from login → reset link in Mailpit

## CI/CD

| Layer | What runs | Trigger |
|-------|-----------|---------|
| **CI** | Lint + 158 tests (GitHub Actions) | Push or PR to `main` |
| **CD (frontend)** | Netlify build + deploy | Push to `main` (repo connected in Netlify) |
| **CD (backend)** | Render Docker build + deploy | Push to `main` (repo connected in Render) |

No extra deploy hooks needed — Netlify and Render already watch GitHub. CI is `.github/workflows/ci.yml`.

Optional later: require the GitHub **CI** check to pass before merging (`Settings → Branches → branch protection` on `main`).

## Scripts

```bash
./dev.sh start          # full stack
./dev.sh stop
npm run dev             # same as dev.sh start
npm run lint
```

## Testing

Tests use [Vitest](https://vitest.dev/). Run them from the repo root via `./test.sh` or the matching `npm run` scripts.

### Commands

| Command | What it runs |
|---------|----------------|
| `./test.sh` or `npm test` | Client + server **unit** tests (default) |
| `./test.sh client` | Client unit tests only (React components, pages, stores) |
| `./test.sh server` | Server unit tests only (services, middleware, validators) |
| `./test.sh integration` | Server **integration** tests (HTTP + in-memory MongoDB) |
| `./test.sh all` | Full suite — unit + integration |
| `npm run test:watch` | Client unit tests in watch mode |

Integration tests spin up an in-memory MongoDB replica set (no Docker required). The first run downloads MongoDB binaries (~66 MB) into `server/node_modules/.cache/`.

### Suite size

| Suite | Tests | Location |
|-------|------:|----------|
| Client unit | 48 | `client/src/**/__tests__/` |
| Server unit | 87 | `server/src/**/__tests__/` |
| Server integration | 23 | `server/src/test/integration/` |
| **Total** | **158** | |

### Coverage by area

Unit and integration tests together cover the main product flows and permission rules:

| Area | Client unit | Server unit | Integration |
|------|:-----------:|:-----------:|:-----------:|
| Auth (register, login, refresh, switch context) | — | ✓ | ✓ |
| Email verification / password reset (mocked in tests) | — | ✓ | ✓ |
| Workspaces CRUD + member roles | ✓ | ✓ | ✓ |
| Last-admin guard (promote/demote/remove) | ✓ | ✓ | ✓ |
| Invites (add, pending, revoke, accept) | ✓ | ✓ | ✓ |
| Tasks CRUD, filters, assignee permissions | ✓ | ✓ | ✓ |
| Role-specific UI (admin vs member) | ✓ | — | — |
| Middleware (auth, authorize, validate) | — | ✓ | — |
| Zod validators | — | ✓ | — |
| Shared components (modals, switchers, layout) | ✓ | — | — |
| API health check | — | — | ✓ |

Gaps (not yet tested): Socket.io real-time events, end-to-end browser flows, and email delivery to Mailpit/Resend.

### Per-package commands

From `client/` or `server/`:

```bash
npm run test:run          # unit tests in that package
npm run test              # vitest in watch mode (server/client)
npm run test:integration  # server only — integration suite
```

More detail: [TEST_CASES.md](./TEST_CASES.md) (one-line index of all 158 tests) · [server/documentation/README.md](./server/documentation/README.md) (server test file index).

## Documentation

- [SCOPE.md](./SCOPE.md) — product features, user journey, assignment vs built scope
- [server/DEPLOYMENT.md](./server/DEPLOYMENT.md) — Docker local stack + Render production
- [TEST_CASES.md](./TEST_CASES.md) — one-line index of every test case
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design (v2.4)
- [AMBIGUITIES_AND_ASSUMPTIONS.md](./AMBIGUITIES_AND_ASSUMPTIONS.md) — scope decisions
- [localrun.md](./localrun.md) — ports and commands
- [server/documentation/](./server/documentation/) — backend function reference
- [client/documentation/](./client/documentation/) — frontend function reference
