# Backend deployment (Docker)

The API runs as a Docker container locally (`docker compose`) and on **Render** in production. The same `Dockerfile` is used in both environments.

## Local (Docker Compose)

From the repo root:

```bash
./dev.sh start
# or rebuild API image after server code changes:
docker compose up -d --build server
```

The `server` service:

- Builds from `server/Dockerfile` (multi-stage TypeScript → `node dist/server.js`)
- Loads secrets from `server/.env`
- Overrides Docker-network settings: `MONGODB_URI`, `SMTP_HOST=mailpit`

| Host URL | Service |
|----------|---------|
| http://localhost:5000 | API (container port mapped to host) |
| http://localhost:5000/api-docs | Swagger |
| http://localhost:5000/api/v1/health | Health check |

Logs: `docker compose logs -f server`

## Render (production)

### Option A — Dashboard

1. Create a **Web Service** on [Render](https://render.com).
2. Connect this repository.
3. Set **Root Directory** to `server`.
4. Set **Runtime** to **Docker** (Render detects `server/Dockerfile`).
5. Add environment variables (see below).
6. Deploy. Render uses the Dockerfile `HEALTHCHECK` and you can set **Health Check Path** to `/api/v1/health`.

### Option B — Blueprint

Deploy using `server/render.yaml` (adjust service name and env as needed).

### Required environment variables (Render)

| Variable | Example / notes |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` (Render sets `PORT` automatically; keep aligned) |
| `MONGODB_URI` | MongoDB Atlas connection string (replica set recommended for transactions) |
| `JWT_ACCESS_SECRET` | Min 32 characters |
| `JWT_REFRESH_SECRET` | Min 32 characters |
| `CLIENT_URL` | Frontend origin, e.g. `https://your-app.vercel.app` (CORS + email links) |
| `EMAIL_PROVIDER` | `resend` |
| `EMAIL_FROM` | Verified sender in Resend |
| `RESEND_API_KEY` | From Resend dashboard |

Optional: `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `INVITE_TOKEN_EXPIRY_DAYS`, email expiry hours — see `server/.env.example`.

### Socket.io on Render

Render web services support WebSockets. Set the client `VITE_WS_URL` to your Render service URL (e.g. `https://task-manager-api.onrender.com`).

### Database

Use **MongoDB Atlas** (not the local Docker MongoDB). Create a free cluster and paste the connection string into `MONGODB_URI`.

## Build image manually

```bash
cd server
docker build -t task-manager-api .
docker run --rm -p 5000:5000 --env-file .env task-manager-api
```

For local `docker run`, point `MONGODB_URI` at a reachable MongoDB (Atlas or host `localhost:27017` with appropriate query params).

## After changing replica set host (local MongoDB)

If MongoDB was previously initialized with a different replica-set member hostname, reset the volume:

```bash
docker compose down -v
docker compose up -d
```

Then re-seed data by registering again in the app.
