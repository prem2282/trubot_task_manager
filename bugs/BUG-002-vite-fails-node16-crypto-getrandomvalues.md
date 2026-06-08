# BUG-002: Vite UI fails to start (Node.js 16)

**Status:** Fixed (verified)  
**Found:** 2026-06-07

## Symptom

After `./dev.sh restart` (or `start`), MongoDB and API start but UI fails:

```text
Error: UI failed to start. See /Users/prem/Projects/MERN/.dev/client.log
```

Client log:

```text
error when starting dev server:
TypeError: crypto$2.getRandomValues is not a function
    at resolveConfig (.../vite/dist/node/chunks/dep-BK3b2jBa.js:66671:16)
```

## Cause

The shell default Node.js was **v16.16.0**. **Vite 5** (used by the client) requires **Node.js 18+**; this project targets **Node 20+**. Node 16 lacks the Web Crypto API behavior Vite expects, which triggers `getRandomValues is not a function`.

## Fix

1. Use Node 20 from the project root:

   ```bash
   nvm use          # reads .nvmrc (20)
   ./dev.sh restart
   ```

2. If Node 20 is not installed:

   ```bash
   nvm install 20
   nvm use 20
   ```

3. **`dev.sh`** now loads nvm (when available), runs `nvm use` from `.nvmrc`, and exits with a clear error if Node &lt; 20.

## Docs updated

- `.nvmrc` — pins Node 20
- `dev.sh` — `ensure_node_version()` + clearer UI error hint
- `localrun.md` — Node.js prerequisite

## Verification

- [x] `nvm use` switches to Node 20.20.2
- [x] `npm run dev` in `client/` starts Vite on http://localhost:5173
- [x] `./dev.sh restart` starts full stack with Node 20
