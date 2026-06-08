# Local run (quick reference)

## Prerequisites

- **Node.js 20+** — for the React UI only (`client/`); use `nvm use`
- **Docker** — Colima or Docker Desktop for MongoDB, Mailpit, and the **API container**

## Local URLs

After the stack is running, open these in your browser:

| Service | URL |
|---------|-----|
| **Frontend (UI)** | http://localhost:5173 |
| **Backend (API)** | http://localhost:5000 (Docker container) |
| **API docs (Swagger)** | http://localhost:5000/api-docs |
| **Mailpit (email inbox)** | http://localhost:8025 |
| **MongoDB** | Docker on port 27017 — browse with [MongoDB Compass](#explore-mongodb-compass) |

### Testing email flows locally

1. Register at http://localhost:5173/register
2. Open http://localhost:8025 — click the verification email link
3. Use **Forgot password?** on login — reset link also appears in Mailpit

Ensure `server/.env` exists (created from `.env.example` on first `./dev.sh start`). Docker Compose loads it for the API container and overrides `MONGODB_URI` / `SMTP_HOST` for the internal network.

---

## Explore MongoDB (Compass)

MongoDB runs in Docker and has no built-in web UI. Use **[MongoDB Compass](https://www.mongodb.com/products/compass)** (free) to browse collections visually.

### Setup

1. Install Compass from the link above.
2. Start the stack: `./dev.sh start` (or `docker compose up -d`).
3. Wait ~20 seconds for the replica set to finish initializing.
4. In Compass, paste this connection string and click **Connect**:

```
mongodb://127.0.0.1:27017/task-manager?directConnection=true
```

The API container uses `mongodb://mongo:27017/...` on the Docker network. Compass connects from your Mac via `127.0.0.1` with `directConnection=true`. Database name: **`task-manager`**.

### What to look at

| Collection | Contents |
|------------|----------|
| `users` | User accounts (email, name, verification status) |
| `accounts` | Companies / tenants |
| `workspaces` | Workspaces under each account |
| `accountmemberships` | User ↔ account roles |
| `workspacememberships` | User ↔ workspace roles |
| `tasks` | Tasks |
| `invitations` | Pending invites |
| `refreshtokens` | Refresh token hashes |
| `verificationtokens` | Email verify and password reset tokens |

Use Compass filters and document view to inspect data after registering users or creating tasks in the app.

### If Compass cannot connect

- Confirm MongoDB is running: `docker compose ps` — `task-manager-mongo` should be up.
- Wait a bit longer after first start, then retry (replica set init can take ~20s).
- Check logs: `docker compose logs mongo`.

### Register / login hangs ~30s then “Internal server error”

Usually a **stale API process on port 5000** from an old `npm run dev` in `server/` is still running on the host. It answers `GET /health` but POST requests time out talking to MongoDB.

Fix:

```bash
./dev.sh stop
lsof -i :5000          # should show nothing, or only Docker after restart
./dev.sh start
```

`dev.sh start` now frees port 5000 before starting the Docker API. You can also run manually:

```bash
kill $(lsof -ti :5000) 2>/dev/null
docker compose up -d --build
```

---

## One command (recommended)

```bash
chmod +x dev.sh   # first time only
./dev.sh start
```

Stop everything:

```bash
./dev.sh stop
```

Other commands: `./dev.sh status`, `./dev.sh logs`, `./dev.sh restart`

Same via npm: `npm run dev`, `npm run dev:stop`, `npm run dev:status`, `npm run dev:logs`

The script will:

1. Start Colima if you use it and it is not running
2. Build and start **MongoDB, Mailpit, and the API** via Docker Compose
3. Create `server/.env` and `client/.env` from examples if missing
4. Run `npm install` in `client/` only when `node_modules` is missing
5. Start the **UI** on the host in the background (logs in `.dev/`)

When `./dev.sh start` finishes, open **http://localhost:5173** for the app.

After changing server code, rebuild the API container:

```bash
docker compose up -d --build server
```

API logs: `docker compose logs -f server`

---

## Manual steps

### 0. Docker / Colima (macOS)

If you use **Colima** (Docker CLI points at `~/.colima/default/docker.sock`), start it first:

```bash
colima start          # only needed once per reboot
docker compose up -d
```

If `docker compose` fails with `no such file or directory` on the Colima socket, Colima is not running — run `colima start` and retry.

**Docker Desktop:** start the app, then `docker compose up -d`.

**No Docker:** use MongoDB Atlas and set `MONGODB_URI` in `server/.env`. For email in production, use Resend (see README).

See [bugtracker.md](./bugtracker.md) for tracked issues.

---

### 1. Docker stack (MongoDB, Mailpit, API)

```bash
docker compose up -d --build
```

Wait until the API responds: `curl http://localhost:5000/api/v1/health`

Mailpit: http://localhost:8025 · Swagger: http://localhost:5000/api-docs

See [server/DEPLOYMENT.md](./server/DEPLOYMENT.md) for container details and Render deployment.

### 2. UI (terminal)

```bash
cd client && cp .env.example .env && npm install && npm run dev
```

App: http://localhost:5173 (proxies `/api` to the Docker API on port 5000)

### Optional: API on the host (without Docker)

For server development with hot reload only:

```bash
cd server && cp .env.example .env && npm install && npm run dev
```

Requires MongoDB + Mailpit running (`docker compose up -d mongo mailpit`) and `MONGODB_URI` in `server/.env` pointing at `127.0.0.1` with `directConnection=true`.
