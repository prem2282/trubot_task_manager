# BUG-001: Docker daemon not running (Colima)

**Status:** Fixed (verified)  
**Found:** 2026-06-06

## Symptom

```text
docker compose up -d
unable to get image 'mongo:7': failed to connect to the docker API at unix:///Users/prem/.colima/default/docker.sock
... connect: no such file or directory
```

## Cause

Docker CLI is configured to use Colima’s socket (`~/.colima/default/docker.sock`), but Colima was not running, so no Docker daemon was available.

## Fix

1. Start Colima before running Compose:

   ```bash
   colima start
   docker compose up -d
   ```

2. If you use Docker Desktop instead, start Docker Desktop and ensure your Docker context points to it:

   ```bash
   docker context use default   # Docker Desktop
   # or
   docker context use colima      # Colima
   ```

3. **Alternative (no Docker):** use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and set `MONGODB_URI` in `server/.env` (replica set not required for basic local dev if transactions aren’t used).

## Docs updated

- `localrun.md` — Colima prerequisite and troubleshooting
- `README.md` — Local setup prerequisites
- `dev.sh` — starts Colima automatically when needed

## Verification

- [x] `colima status` shows `running`
- [x] `docker compose up -d` pulls `mongo:7` and container is healthy
- [x] Replica set healthy (`rs.status().ok` = 1)
