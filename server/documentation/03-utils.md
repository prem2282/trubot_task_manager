# Utility Functions

All files in `server/src/utils/`.

---

## `errors.ts`

### `AppError` (class)

**What it is:** A custom error type for expected HTTP failures (400, 401, 403, 404, etc.).

**Constructor parameters:**
- `statusCode` — HTTP status to return (e.g. 404)
- `message` — Human-readable error message
- `errors` (optional) — Array of `{ field, message }` for validation failures

**Example use:** `throw new AppError(403, 'Not authorized')`

**Caught by:** `errorHandler` middleware, which converts it to JSON `{ success: false, message, errors }`.

---

### `isValidObjectId(id: string): boolean`

**What it does:** Checks if a string looks like a valid MongoDB ObjectId (exactly 24 hexadecimal characters).

**When used:** Before calling `findById` on tasks or users, to avoid Mongoose cast errors and to fix the insecure pattern from the assignment's code review snippet.

**Returns:** `true` if valid format, `false` otherwise.

---

## `crypto.ts`

### `hashPassword(password: string): Promise<string>`

**What it does:** Converts a plain-text password into a bcrypt hash using 12 salt rounds.

**When used:** Registration, invite acceptance, never on login (login uses `comparePassword`).

**Returns:** Bcrypt hash string safe to store in `User.passwordHash`.

---

### `comparePassword(password: string, hash: string): Promise<boolean>`

**What it does:** Compares a login password against the stored bcrypt hash.

**Returns:** `true` if they match, `false` if not.

**When used:** `authService.login()`.

---

### `hashToken(token: string): string`

**What it does:** Creates a SHA-256 hex digest of a token string.

**When used:** Before storing invite tokens or refresh tokens in the database. We never store raw tokens — only hashes — so a database leak does not expose usable tokens.

**Returns:** 64-character hex string.

---

### `generateInviteToken(): string`

**What it does:** Generates a cryptographically random 64-character hex string for invite links.

**When used:** When an admin invites a new/unverified user.

**Returns:** Raw token (returned once to admin in API response; only hash is saved).

---

### `generateRefreshToken(): string`

**What it does:** Generates a random 80-character hex string.

**Note:** Currently the code uses JWT for refresh tokens via `signRefreshToken`; this helper exists for potential raw-token patterns.

---

## `jwt.ts`

### `signAccessToken(payload: JwtPayload): string`

**What it does:** Creates a signed JWT access token containing user ID, account ID, workspace ID, and roles.

**Lifetime:** Configured by `JWT_ACCESS_EXPIRES_IN` (default 15 minutes).

**Returns:** JWT string sent to the client in JSON response body (stored in memory on frontend).

---

### `signRefreshToken(userId: string): string`

**What it does:** Creates a signed JWT refresh token containing only the user ID.

**Lifetime:** Configured by `JWT_REFRESH_EXPIRES_IN` (default 7 days).

**Returns:** JWT string stored in httpOnly cookie and hashed in `RefreshToken` collection.

---

### `verifyAccessToken(token: string): JwtPayload`

**What it does:** Validates the access token signature and expiry, then decodes the payload.

**Throws:** If token is invalid or expired (caught by auth middleware → 401).

**Returns:** `{ userId, accountId, workspaceId, accountRole, workspaceRole }`.

---

### `verifyRefreshToken(token: string): { userId: string }`

**What it does:** Validates refresh token and returns the user ID inside it.

**When used:** `/auth/refresh`, `/auth/logout`, token rotation in `refreshAccessToken`.

---

### `getRefreshCookieOptions()`

**What it does:** Returns the cookie settings object for the refresh token.

**Settings:**
- `httpOnly: true` — JavaScript cannot read it (XSS protection)
- `secure: true` in production — HTTPS only
- `sameSite: 'strict'` — CSRF mitigation
- `maxAge: 7 days`
- `path: '/api/v1/auth'` — only sent to auth endpoints

---

## `params.ts`

### `param(value, name?): string`

**What it does:** Normalizes Express route parameters to a single string.

**Why needed:** Express types `req.params.id` as `string | string[]`. This helper picks the first value or throws if missing.

**Example:** `param(req.params.id, 'id')` → `"665a1b2c3d4e5f6789012345"`

---

## `validators.ts`

These are **Zod schemas** — rules that describe valid request shapes. Used by `validate()` middleware.

| Schema | Validates | Key rules |
|--------|-----------|-----------|
| `registerSchema` | POST /auth/register body | name 2–100 chars, valid email, password min 8 chars |
| `loginSchema` | POST /auth/login body | email + password required |
| `switchContextSchema` | POST /auth/switch-context | accountId and workspaceId must be 24-char ObjectIds |
| `createInviteSchema` | POST /invites | email required; optional name and workspaceId |
| `acceptInviteSchema` | POST /invites/:token/accept | name + password min 8 |
| `createWorkspaceSchema` | POST /workspaces | name 2–200 chars |
| `addMemberSchema` | POST /workspaces/:id/members | userId must be valid ObjectId |
| `updateMemberRoleSchema` | PATCH /workspaces/:id/members/:userId | `workspaceRole` must be `admin` or `member` |
| `createTaskSchema` | POST /tasks | title required; optional status, priority, assignee, dueDate |
| `updateTaskSchema` | PUT /tasks/:id | Partial of createTaskSchema — any field optional |
| `taskQuerySchema` | GET /tasks query params | Filters: status, assignee, dates; pagination page/limit |

**On failure:** Middleware throws `AppError(400)` with field-level error messages.
