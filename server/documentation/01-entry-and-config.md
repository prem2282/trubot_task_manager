# Entry Points and Configuration

---

## `server/src/server.ts`

### `start()` (internal, not exported)

**What it does:** Boots the entire backend application.

**When it runs:** Automatically when you run `npm run dev` or `npm start`. This is the first code that executes.

**Steps it performs:**
1. Connects to MongoDB via `connectDatabase()`
2. Creates an HTTP server wrapping the Express `app`
3. Attaches Socket.io via `initSocket(server)`
4. Listens on the port from environment variables (default 5000)
5. Logs the server URL and Swagger docs URL to the console

**Returns:** `Promise<void>` — resolves when the server is listening.

**On failure:** Logs the error and exits the process with code 1.

---

## `server/src/app.ts`

### `app` (default export)

**What it is:** The configured Express application object — not a function, but the central HTTP app instance.

**What it sets up (in order):**
1. **Helmet** — adds security HTTP headers
2. **CORS** — allows requests from `CLIENT_URL` with credentials (cookies)
3. **JSON body parser** — reads JSON request bodies
4. **Cookie parser** — reads cookies (needed for refresh tokens)
5. **Mongo sanitize** — strips keys that start with `$` to prevent NoSQL injection
6. **Rate limiter** — max 300 requests per 15 minutes globally
7. **Swagger UI** — interactive API docs at `/api-docs` (OpenAPI spec from `src/swagger/openapi.ts`; raw JSON at `/api-docs.json`)
8. **API routes** — mounted at `/api/v1`
9. **404 handler** — catches unknown URLs
10. **Error handler** — catches all thrown errors and returns JSON

**Used by:** `server.ts` to create the HTTP server.

---

## `server/src/config/env.ts`

### `env` (exported constant)

**What it is:** A validated, typed object containing all environment variables the server needs.

**When it runs:** Once at startup when any file imports `env`. If validation fails, the process exits immediately with an error message.

**Fields:**

| Field | Meaning |
|-------|---------|
| `NODE_ENV` | `development`, `production`, or `test` |
| `PORT` | HTTP port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Secret key for signing access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens (min 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `CLIENT_URL` | Frontend URL — used for CORS and building invite links |
| `INVITE_TOKEN_EXPIRY_DAYS` | How many days an invite link stays valid (default 7) |

---

## `server/src/config/db.ts`

### `connectDatabase()`

**What it does:** Opens a connection from Mongoose to MongoDB.

**Parameters:** None.

**Returns:** `Promise<void>` — resolves when connected.

**Side effects:** Logs `"MongoDB connected"` to the console.

**Uses:** `env.MONGODB_URI` from config.

---

### `disconnectDatabase()`

**What it does:** Closes the Mongoose connection to MongoDB.

**Parameters:** None.

**Returns:** `Promise<void>`.

**When used:** Useful in tests or graceful shutdown (not currently called in production flow).
