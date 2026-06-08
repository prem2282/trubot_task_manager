# Middleware

All files in `server/src/middleware/`. Middleware runs **between** receiving a request and reaching the controller.

---

## `authenticate.ts`

### `authenticate(req, res, next)`

**What it does:** Proves the caller is a logged-in, verified user and attaches their identity to the request.

**Steps:**
1. Reads `Authorization: Bearer <token>` header
2. If missing → throws 401 "Authentication required"
3. Verifies JWT with `verifyAccessToken()`
4. Loads user from database by `userId` from token
5. If user missing or `verificationStatus !== 'verified'` → 401
6. Sets `req.user` with JWT payload + email + name
7. Calls `next()` to continue to the route handler

**Used on:** All protected routes (tasks, workspaces, invites list, etc.).

---

### `optionalAuth(req, res, next)`

**What it does:** Same as `authenticate`, but only if an Authorization header is present. If no header, continues without setting `req.user`.

**Currently:** Not wired to any route, but available for future optional-auth endpoints.

---

## `authorize.ts`

### `requireAccountAdmin(req, res, next)`

**What it does:** Blocks the request unless `req.user.accountRole === 'admin'`.

**When used:** Creating workspaces, creating invites, listing account members, revoking invites.

**On failure:** 403 "Account admin access required".

---

### `requireWorkspaceAdmin(req, res, next)`

**What it does:** Allows the request if the user is either an **account admin** OR a **workspace admin**.

**When used:** Adding/removing workspace members, adding members via workspace routes.

**On failure:** 403 "Workspace admin access required".

---

## `validate.ts`

### `validate(schema, source?)`

**What it is:** A **middleware factory** — you call it with a Zod schema and it returns a middleware function.

**Parameters:**
- `schema` — Zod schema to validate against
- `source` — `'body'` (default) or `'query'`

**What the returned middleware does:**
1. Runs `schema.safeParse()` on `req.body` or `req.query`
2. If invalid → passes `AppError(400)` with field errors to error handler
3. If valid → replaces body/query with parsed (coerced) data and calls `next()`

**Example:** `validate(createTaskSchema)` on POST /tasks.

---

## `errorHandler.ts`

### `errorHandler(err, req, res, next)`

**What it does:** Central catch-all for every error thrown in routes, services, or middleware.

**Behavior:**
- If `err` is `AppError` → respond with its `statusCode`, `message`, and `errors`
- If `err` has a `statusCode` property → respond similarly
- Otherwise → log to console, respond 500 "Internal server error"

**Why it matters:** Ensures every error returns consistent JSON instead of crashing the server.

---

### `notFoundHandler(req, res)`

**What it does:** Returns `{ success: false, message: 'Route not found' }` with HTTP 404.

**When used:** Any request that did not match a defined route.
