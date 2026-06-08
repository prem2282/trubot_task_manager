# Product Scope & Features

This document describes what the TruBotAI Task Manager does, how users experience it in order, how the built product compares to the original assignment brief, and why several features extend beyond the minimum coding challenge.

For setup and commands, see [README.md](./README.md). For technical design, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Overview

**TruBotAI Task Manager** is a multi-tenant MERN stack web application: a company (Account) has one or more Workspaces, and each Workspace has Tasks assigned to team members. It includes authentication, team invitations, role-based permissions, real-time task updates, email flows, API documentation, and automated tests.

| Item | Detail |
|------|--------|
| **Stack** | Node.js, Express, TypeScript, MongoDB, React, Vite, Socket.io, Zustand, Tailwind |
| **Run locally** | `./dev.sh start` — see [localrun.md](./localrun.md) |
| **Local URLs** | UI: http://localhost:5173 · API: http://localhost:5000 · Swagger: http://localhost:5000/api-docs · Mailpit: http://localhost:8025 |
| **Tests** | `./test.sh all` — 156 tests (see [TEST_CASES.md](./TEST_CASES.md)) |

---

## How the app works (user journey)

Below is the product as a **new user or admin would experience it**, step by step.

### 1. Sign up and verify email

1. A new visitor opens **Register**, enters name, email, password, and optional company name.
2. The system creates a **new Account** (company), a **default Workspace**, and makes that person the **account admin** and **workspace admin**.
3. The user is **not logged in yet** — they must verify their email first.
4. A verification email is sent (visible in **Mailpit** during local dev).
5. Clicking the link opens **Verify Email**, marks the user verified, and logs them in.

Registration always creates an isolated company — there is no shared public pool of users.

### 2. Log in, stay logged in, switch context

1. Verified users **Log in** with email and password.
2. The app issues a short-lived **access token** (JWT) and a long-lived **refresh token** (httpOnly cookie). Refreshing the browser does **not** log the user out.
3. The top navigation shows **Account** and **Workspace** switchers when the user belongs to more than one.
4. Switching account or workspace updates the JWT context so tasks and members always belong to the active workspace.

### 3. Dashboard — tasks

1. The **Dashboard** lists tasks in the **active workspace**.
2. **Workspace admins** (and account admins) see **all** tasks in that workspace.
3. **Regular members** see only tasks they **created** or are **assigned to**.
4. Filters: status, assignee, due date range. Results are paginated and sortable.
5. **Create / Edit** opens a modal: title, description, status, priority, assignee, due date, and comments.
6. **Assignees** can update status on tasks assigned to them but cannot freely edit title, priority, or close/reopen like an owner or admin.
7. When anyone changes a task, **Socket.io** pushes updates to other users viewing the same workspace — no manual refresh needed.

### 4. Workspaces and members

1. **Workspaces** page — account admins can **create** additional workspaces (e.g. “Engineering”, “Sales”).
2. **Manage members** on a workspace — admins can see who belongs to the workspace, **promote/demote** roles (admin ↔ member), and **remove** members.
3. **Last-admin rule:** the sole workspace admin cannot be demoted or removed until another admin exists — prevents locking a workspace with no admin.

### 5. Team and invitations

1. **Team** page — account admins invite people by email and pick a target workspace.
2. **New or unverified user:** system creates a **pending invite link**; admin **copies and shares manually** (the assignment did not require automated invite email).
3. Invitee opens **Accept Invite**, sets name and password, becomes a verified **member** of that account and workspace.
4. **Already verified user** (registered elsewhere or previously invited): added **immediately** — no link, no password step.
5. Admins can **list and revoke** pending invites; invites expire after 7 days.

### 6. Password reset

1. From **Login**, **Forgot password** sends a reset email (Mailpit locally).
2. User opens the link, sets a new password, and can log in again.

### 7. Security and data boundaries

- Passwords hashed with bcrypt; MongoDB queries scoped by account/workspace from the JWT.
- Rate limiting, Helmet headers, input validation (Zod), and mongo sanitization on the API.
- Account members cannot create workspaces, send invites, or list all account members — admin-only actions.

---

## Original assignment scope (Part 5 — coding challenge)

The TruBotAI assignment includes written Q&A (Parts 1–4) and a **practical build** (Part 5). This repository implements Part 5 as a working application. The **required coding scope** from the assignment was:

### Backend (required)

| # | Requirement |
|---|-------------|
| B1 | User authentication — register, login, logout — with JWT |
| B2 | CRUD operations for tasks (create, read, update, delete) |
| B3 | Task assignment to users |
| B4 | Real-time task updates (WebSockets or Socket.io) |
| B5 | MongoDB schema with proper relationships |
| B6 | Input validation and error handling |
| B7 | API documentation (Swagger or Postman collection) |

### Frontend (required)

| # | Requirement |
|---|-------------|
| F1 | Login and Register pages |
| F2 | Dashboard showing all tasks with filtering (status, assignee, date) |
| F3 | Create/Edit task modal |
| F4 | Real-time updates when tasks change |
| F5 | Responsive design |
| F6 | Error handling and loading states |

### Submission guidelines

| # | Requirement |
|---|-------------|
| S1 | GitHub repo with clear README and setup instructions |
| S2 | Documentation — architecture decisions, trade-offs, assumptions |
| S3 | Live demo |
| S4 | Time tracking (approximate time per section) |

### Bonus (optional)

TypeScript · unit/integration tests · Docker · CI/CD · performance optimizations

### Additional product rules (beyond Part 5 text)

During planning, the following rules were adopted to make multi-tenancy concrete (documented in [AMBIGUITIES_AND_ASSUMPTIONS.md](./AMBIGUITIES_AND_ASSUMPTIONS.md)):

- Every **registration creates a new Account** with a **default Workspace**.
- The registrant is **account admin** and **workspace admin**.
- Admins **invite** others; invitees become **members**.
- Invites for new users use a **manually shared link** (not automated invite email).
- Invitee sets password via the link and becomes **verified**; until then they cannot log in.

---

## Assignment requirements vs what was built

| Assignment item | Built? | Where / notes |
|-----------------|:------:|---------------|
| B1 Register, login, logout, JWT | ✅ | Auth pages + `/api/v1/auth/*` |
| B2 Task CRUD | ✅ | Dashboard + `/api/v1/tasks` |
| B3 Task assignment | ✅ | Assignee field; defaults to creator |
| B4 Real-time updates | ✅ | Socket.io, workspace-scoped rooms |
| B5 MongoDB relationships | ✅ | User, Account, Workspace, memberships, Task, Invitation, etc. |
| B6 Validation & errors | ✅ | Zod validators, structured JSON errors |
| B7 API docs | ✅ | Swagger UI at `/api-docs` (26 endpoints) |
| F1 Login / Register | ✅ | + Verify, Forgot/Reset password, Accept invite pages |
| F2 Dashboard + filters | ✅ | Status, assignee, due date; pagination |
| F3 Create/Edit modal | ✅ | TaskModal with comments |
| F4 Real-time UI | ✅ | Dashboard listens for task events |
| F5 Responsive design | ✅ | Tailwind; mobile-friendly layout |
| F6 Errors & loading | ✅ | Toasts, form errors, loading states |
| S1 README & setup | ✅ | README, localrun.md, `dev.sh` |
| S2 Architecture docs | ✅ | ARCHITECTURE.md, AMBIGUITIES_AND_ASSUMPTIONS.md, code docs |
| S3 Live demo | ✅ | [trubotai-taskmanager.netlify.app](https://trubotai-taskmanager.netlify.app) · API on Render |
| S4 Time tracking | ⚠️ | Not included as a separate time log file |
| Bonus: TypeScript | ✅ | Full stack |
| Bonus: Tests | ✅ | 156 tests — unit + integration |
| Bonus: Docker | ✅ | API in Docker (`server/Dockerfile`); MongoDB + Mailpit via `docker-compose.yml`; UI on host in dev |
| Bonus: CI/CD | ❌ | Not configured |
| Bonus: Performance | ⚠️ | Pagination, indexes; no advanced tuning |

All **core Part 5 backend and frontend requirements are implemented**. Production is live on Netlify + Render. Submission item S4 (time log) is still optional/deferred.

---

## Features beyond the assignment (and why)

Part 5 describes a **single-team task app**. The project builds a **small SaaS-shaped product** instead because:

1. **Part 1 of the same assignment** asks about multi-tenant MongoDB schema design — the app demonstrates that design in working code, not only in prose.
2. **Part 3** asks about JWT refresh tokens, XSS/CSRF, and rate limiting — those patterns are implemented, not just described.
3. **The product rules above** (account + workspace + invite flow) require more than a flat user/task model to work coherently.

| Feature | In assignment Part 5? | Why it was added |
|---------|:---------------------:|------------------|
| **Account + Workspace multi-tenancy** | No | Aligns with Part 1 Q&A; every registration = new company |
| **Account admin / workspace admin / member roles** | No | Needed for invites, workspace management, and task visibility rules |
| **Email verification on register** | No | Production-grade auth; unverified users cannot log in |
| **Password reset flow** | No | Standard SaaS expectation; matches Part 3 security topics |
| **JWT refresh token + httpOnly cookie** | JWT only (no refresh specified) | Part 3 covers refresh tokens; session survives page reload |
| **Multiple workspaces per account** | No | Real teams split work; account admin can create workspaces |
| **Workspace member management (add, remove, promote, demote)** | No | Admins must manage who sees which tasks |
| **Last-admin guard** | No | Prevents accidental lockout with no workspace admin |
| **Invite flow (pending link + instant add for verified users)** | No | Follows adopted product rules; manual link share per assignment ambiguity |
| **Revoke invites + 7-day expiry** | No | Practical admin control |
| **Account / workspace switchers in nav** | No | Users can belong to multiple accounts/workspaces |
| **Task comments** | No | Collaboration on a task thread |
| **Extended task statuses (`reopened`, `closed`)** | No | Clearer lifecycle beyond todo / in progress / done |
| **Assignee-only edit rules** | No | Assignee updates status, not arbitrary fields |
| **Role-based task visibility for members** | No | Members see own + assigned tasks only; admins see all |
| **Mailpit (local) + Resend (prod) email** | No | Verification and reset emails work end-to-end in dev and deploy |
| **156 automated tests** | Bonus only | Assignment bonus; protects regressions on roles and invites |
| **TEST_CASES.md, server/client code docs** | Extra docs | Plain-language and module-level documentation |
| **Filled Swagger spec (26 routes)** | B7 requires docs | Full API reference at `/api-docs` |
| **`dev.sh` one-command local stack** | No | Docker stack + UI; see [server/DEPLOYMENT.md](./server/DEPLOYMENT.md) |

The extra scope turns a minimal task CRUD demo into a **multi-tenant team product** that implements the assignment’s architecture and security topics in code, while keeping the required task dashboard and real-time updates at the center.

---

## Out of scope (not built)

| Item | Notes |
|------|-------|
| **Automated invite email** | Resolved to manual link share; auth emails (verify/reset) are sent |
| **CI/CD pipeline** | Listed as bonus; not configured |
| **Dockerized API** | ✅ | Same `server/Dockerfile` locally and on Render |
| **Dockerized MongoDB + Mailpit** | ✅ | `docker-compose.yml` |
| **Production live demo URL** | ✅ | https://trubotai-taskmanager.netlify.app |
| **Time log file** | Submission guideline; not committed separately |
| **GraphQL, file upload, microservices** | Discussed in Part 1–2 Q&A only — not part of Part 5 build |
| **Socket.io integration tests** | Real-time behavior verified manually; not in automated suite |
| **E2E browser tests (Playwright/Cypress)** | Unit + API integration tests only |

---

## Pages and API

### Frontend pages

| Page | Purpose |
|------|---------|
| Register | New account + default workspace |
| Login / Logout | Authenticated access |
| Verify Email | Complete registration |
| Forgot / Reset Password | Password recovery |
| Dashboard | Task list, filters, real-time updates |
| Workspaces | List/create workspaces; link to members |
| Workspace Members | Roles, remove, promote/demote |
| Team | Invite users, pending invites |
| Accept Invite | New user joins via shared link |

### API groups (Swagger)

Health · Authentication · Workspaces · Tasks · Invites · Members · Users — full list at `/api-docs`.

---

## Testing

| Suite | Count | Covers |
|-------|------:|--------|
| Client unit | 47 | Components, pages, role-specific UI |
| Server unit | 86 | Services, middleware, validators |
| Server integration | 23 | HTTP flows with in-memory MongoDB |
| **Total** | **156** | See [TEST_CASES.md](./TEST_CASES.md) for every test name |

```bash
./test.sh all
```

---

## Related documentation

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Setup, env vars, scripts |
| [localrun.md](./localrun.md) | Ports, Docker stack, Compass, troubleshooting |
| [server/DEPLOYMENT.md](./server/DEPLOYMENT.md) | API Docker image, Render deploy |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data model, diagrams |
| [AMBIGUITIES_AND_ASSUMPTIONS.md](./AMBIGUITIES_AND_ASSUMPTIONS.md) | Scope decisions and rationale |
| [TEST_CASES.md](./TEST_CASES.md) | One-line list of all 156 tests |
| [server/documentation/](./server/documentation/) | Backend module reference |
| [client/documentation/](./client/documentation/) | Frontend module reference |
| [bugtracker.md](./bugtracker.md) | Known issues tracked during development |
