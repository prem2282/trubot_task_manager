# Local run (quick reference)

## Prerequisites

- **Node.js 20+** — project includes `.nvmrc`; run `nvm use` before starting (or let `./dev.sh` switch for you)
- **Docker** — Colima or Docker Desktop for MongoDB + Mailpit

## Local URLs

After the stack is running, open these in your browser:

| Service | URL |
|---------|-----|
| **Frontend (UI)** | http://localhost:5173 |
| **Backend (API)** | http://localhost:5000 |
| **API docs (Swagger)** | http://localhost:5000/api-docs |
| **Mailpit (email inbox)** | http://localhost:8025 |
| **MongoDB** | `mongodb://localhost:27017` (Docker; not a web UI) |

### Testing email flows locally

1. Register at http://localhost:5173/register
2. Open http://localhost:8025 — click the verification email link
3. Use **Forgot password?** on login — reset link also appears in Mailpit

Ensure `server/.env` includes the email settings from `server/.env.example` (SMTP → Mailpit on port 1025).

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
2. Start **MongoDB + Mailpit** via Docker Compose
3. Create `server/.env` and `client/.env` from examples if missing
4. Run `npm install` in server/client only when `node_modules` is missing
5. Start API and UI in the background (logs in `.dev/`)

When `./dev.sh start` finishes, open **http://localhost:5173** for the app.

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

### 1. MongoDB + Mailpit

```bash
docker compose up -d
```

Wait ~20 seconds for the MongoDB replica set to initialize. Mailpit is ready immediately at http://localhost:8025.

### 2. API (terminal 1)

```bash
cd server && cp .env.example .env && npm install && npm run dev
```

API: http://localhost:5000 · Swagger: http://localhost:5000/api-docs

### 3. UI (terminal 2)

```bash
cd client && cp .env.example .env && npm install && npm run dev
```

App: http://localhost:5173
