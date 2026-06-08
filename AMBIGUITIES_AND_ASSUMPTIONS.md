# Ambiguities & Assumptions Tracker

> **Purpose:** Record every scope question that the assignment leaves unclear, the options considered, and the **assumed answer** we will implement against unless you override it.  
> **Companion doc:** [ARCHITECTURE.md](./ARCHITECTURE.md)  
> **How to use:** Review each item. Change **Status** to `Confirmed` or `Override` and update **Assumed Answer** if you disagree.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| `Assumed` | Default chosen for implementation; no user input yet |
| `Confirmed` | User reviewed and agreed |
| `Override` | User changed the assumed answer — see Notes |
| `Deferred` | Out of scope for this submission; documented only |

---

## Summary Table

| ID | Topic | Assumed Answer | Status |
|----|-------|----------------|--------|
| Q1 | Multi-tenancy | Account + Workspace model; every registration = new account | **Confirmed** |
| Q2 | User registration | Two paths: register (new account) or accept invite (join account) | **Confirmed** |
| Q3 | Roles / RBAC | Account admin + workspace admin; invited users are members | **Confirmed** |
| Q4 | Task visibility | Scoped to workspace; admin sees all; member sees created + assigned | **Confirmed** |
| Q5 | Assignee on create | Required; defaults to creator if omitted | Assumed |
| Q6 | Task status values | `todo`, `in_progress`, `done` | **Confirmed** |
| Q7 | Date filter field | `dueDate` (with optional `createdAt` sort) | Assumed |
| Q8 | Repository layout | Monorepo (`server/` + `client/`) | Assumed |
| Q9 | TypeScript adoption | TypeScript from day one (backend + frontend) | Assumed |
| Q10 | Refresh tokens | Implement refresh tokens + httpOnly cookie | Assumed |
| Q11 | Logout semantics | Revoke refresh token server-side + clear cookie | Assumed |
| Q12 | Task deletion | Hard delete (no soft delete / archive) | Assumed |
| Q13 | Real-time audience | Broadcast per workspace room (`workspace:{id}`) | **Confirmed** |
| Q14 | User list for assignee | Verified members of current workspace only | **Confirmed** |
| Q15 | User verification | Register: email verification link; invite: password on accept link | **Confirmed** |
| Q16 | Password reset | Email reset link (1h expiry); Resend in prod, Mailpit locally | **Confirmed** |
| Q17 | Task ownership edit rules | Creator or assignee can edit; creator or admin can delete | Assumed |
| Q18 | Pagination default | 20 tasks per page | Assumed |
| Q19 | API versioning | `/api/v1` prefix | Assumed |
| Q20 | Admin creation | Every registrant becomes account admin + default workspace admin | **Confirmed** |
| Q21 | Invitation delivery | Manual link share for workspace invites; auth emails sent automatically | **Confirmed** |
| Q29 | Auth email delivery | Mailpit (local Docker) + Resend (production) | **Confirmed** |
| Q22 | Workspaces per account | Multiple workspaces; switcher, create, member management | **Confirmed** |
| Q23 | Unverified member login | Blocked until invite accepted and password set | Assumed |
| Q24 | Invitation expiry | 7 days; admin can revoke pending invites | **Confirmed** |
| Q25 | Invite existing verified user | Immediate verified membership; no invite link | **Confirmed** |
| Q26 | Workspace → account membership | Adding to workspace always creates/updates account membership | **Confirmed** |
| Q27 | Multi-account users | One user can belong to many accounts/workspaces | **Confirmed** |
| Q28 | Account / workspace switching | Account + workspace dropdowns in nav + switch-context API | **Confirmed** |

---

## Detailed Questions

---

### Q1 — Single-tenant vs multi-tenant?

**Ambiguity:** Part 1 Q&A discusses multi-tenant MongoDB schema design, but Part 5 (the coding challenge) does not mention tenants, organizations, or workspaces.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| A. Single shared workspace | Fast to build | Doesn't demo multi-tenant patterns |
| B. Multi-tenant with Account + Workspace | Aligns with Q&A; strong SaaS signal | More auth, scoping, and UI complexity |
| C. Multi-tenant stub (schema only) | Shows design thinking | Incomplete UX |

**Assumed answer:** **B — Multi-tenant with Account + Workspace**

**Rationale (user override):** Every registration creates a new **Account** with a **default Workspace**. Data is isolated per account/workspace. This directly demonstrates the multi-tenant schema design from Part 1 Q&A in working code.

**Impact:**
- `Account`, `Workspace`, `AccountMembership`, `WorkspaceMembership`, `Invitation` collections
- All tasks scoped by `workspaceId` (and implicitly `accountId`)
- JWT includes `accountId` and active `workspaceId` for query scoping

**Status:** **Confirmed** (user override 2026-06-06)

---

### Q2 — Who can register?

**Ambiguity:** Assignment requires register/login pages but doesn't define whether all users self-register into one pool or create isolated accounts.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| A. Open registration → new account each time | Clear tenant boundary | Two onboarding paths needed |
| B. Open registration → join shared pool | Simple | Contradicts account model |
| C. Invite-only (no public register) | Controlled | Missing required Register page utility |

**Assumed answer:** **Three onboarding paths:**
1. **Register** (`POST /auth/register`) — creates User + Account + default Workspace; user becomes account admin and workspace admin (verified)
2. **Accept invite — new user** (`POST /invites/:token/accept`) — email not in system (or user globally unverified); sets password; becomes verified member
3. **Admin invite — existing verified user** (`POST /invites`) — user already verified (own registration or prior invite); **immediate** verified account + workspace membership; no invite link required

**Rationale (user override):** "Every new registration is a new account." Joining an existing account is admin-initiated. Existing verified users are added instantly.

**Impact:**
- Public register always provisions a new account (never joins existing)
- Admin invite is the way to add members; flow branches on whether invitee is globally verified

**Status:** **Confirmed** (updated 2026-06-06)

---

### Q3 — Are user roles required?

**Ambiguity:** Part 5 mentions "task assignment" but not roles. User override defines account and workspace admin concepts.

**Assumed answer:** **Yes — role model at two levels:**

| Level | Roles | Who gets it |
|-------|-------|-------------|
| Account | `admin`, `member` | Registrant → account `admin`; invitee → account `member` |
| Workspace | `admin`, `member` | Registrant → default workspace `admin`; invitee → default workspace `member` |

**Rationale (user override):** Registrant is both account admin and workspace admin of the default workspace. Invited users are members at both levels (for the default workspace).

**Impact:**
- `AccountMembership.accountRole` and `WorkspaceMembership.workspaceRole`
- Middleware: `requireAccountAdmin`, `requireWorkspaceAccess`
- Only account admins can create invitations

**Status:** **Confirmed** (user override 2026-06-06)

---

### Q4 — Which tasks can a user see?

**Ambiguity:** Dashboard shows "all tasks" with filters; visibility must be scoped in multi-tenant model.

**Assumed answer:** **Within the active workspace:**
- **Workspace admin** (or account admin): all tasks in the workspace
- **Member**: tasks they created or are assigned to

**Rationale:** Preserves privacy within a team while giving admins full oversight — typical SME pattern within one workspace.

**Impact:** `GET /tasks` filters by `workspaceId` from JWT + role-based visibility rules.

**Status:** **Confirmed** (user review 2026-06-06)

---

### Q5 — Is assignee required when creating a task?

**Assumed answer:** **C — Required in schema; defaults to creator if not provided**

**Impact:** `assignee` must be a verified member of the same workspace.

**Status:** Assumed

---

### Q6 — What are valid task status values?

**Assumed answer:** **A — `todo`, `in_progress`, `done`**

**Rationale:** Three states are enough for filtering demo, map cleanly to UI badges, and need no drag-and-drop board.

**Impact:** Enum on Task model; filter dropdown with three options.

**Status:** **Confirmed** (user review 2026-06-06)

---

### Q7 — Which date field does "filter by date" refer to?

**Assumed answer:** **A — Filter by `dueDate` range (`dueDateFrom`, `dueDateTo`)**

**Status:** Assumed

---

### Q8 — Monorepo or separate repositories?

**Assumed answer:** **A — Monorepo with `server/` and `client/` directories**

**Status:** Assumed

---

### Q9 — TypeScript now or JavaScript with optional migration?

**Assumed answer:** **B — TypeScript on both backend and frontend from day one**

**Status:** Assumed

---

### Q10 — Access token only, or access + refresh tokens?

**Assumed answer:** **B — Short-lived access token + refresh token in httpOnly cookie**

**Impact:** JWT payload includes `userId`, `accountId`, `workspaceId`, `accountRole`.

**Status:** Assumed

---

### Q11 — What does "logout" mean with JWT?

**Assumed answer:** **B — Delete refresh token from DB; clear httpOnly cookie; clear access token from client memory**

**Status:** Assumed

---

### Q12 — Hard delete or soft delete for tasks?

**Assumed answer:** **A — Hard delete**

**Status:** Assumed

---

### Q13 — Who receives real-time task updates?

**Ambiguity:** Real-time updates required; must align with workspace scoping.

**Assumed answer:** **B — Emit to workspace room `workspace:{workspaceId}` only**

**Rationale:** Multi-tenant model requires isolation. Clients join the room for their active workspace after socket auth. No cross-account event leakage.

**Impact:** Socket join on connect: `socket.join('workspace:' + workspaceId)`; task events emitted to that room only.

**Status:** **Confirmed** (user review 2026-06-06)

---

### Q14 — Which users appear in the assignee dropdown?

**Assumed answer:** **Verified members of the current workspace only** (name, email, id — no unverified users)

**Rationale (user override):** Unverified invited members cannot meaningfully be assigned work until they accept the invite. Scoping to workspace enforces account boundary.

**Impact:** `GET /api/v1/users?workspaceId=` returns users with `membershipStatus: 'verified'` in that workspace.

**Status:** **Confirmed** (user override 2026-06-06)

---

### Q15 — User verification

**Ambiguity:** Original assumption deferred email verification entirely.

**Assumed answer:** **Global user verification + per-membership status:**

| User state | On admin invite to new account/workspace | Membership status |
|------------|------------------------------------------|-------------------|
| **New email** (no User record) | Create User stub + Invitation link | Account + workspace memberships **unverified** until link accepted |
| **Globally unverified** (invited, password not set) | Reuse pending invite flow | **unverified** until link accepted |
| **Globally verified** (registered or previously accepted invite) | Add memberships **immediately** | Account + workspace memberships **verified** at once — no link |

- Registrant: **verified** immediately at signup
- New invitee: **unverified** until invite link + password set
- **No email sending** — link manually shared only for new/unverified users

**Rationale (user override):** "Until then the user is an unverified member" applies to new invitees only. Already-verified users join new accounts/workspaces the moment the admin adds them.

**Impact:**
- `User.verificationStatus` is **global** — once `verified`, never reverted
- `AccountMembership.status` / `WorkspaceMembership.status` follow user verification for new adds (verified user → verified memberships)
- Unverified users (globally) cannot log in
- Admin UI distinguishes "Pending invite (link required)" vs "Added (active member)"

**Status:** **Confirmed** (updated 2026-06-06)

---

### Q16 — Password reset flow?

**Assumed answer:** **Not implemented (Deferred)**

**Status:** Deferred

---

### Q17 — Who can edit and delete a task?

**Assumed answer:** **B — Creator or assignee can update; creator or workspace admin can delete**

**Status:** Assumed

---

### Q18 — Default pagination size?

**Assumed answer:** **B — 20 tasks per page**

**Status:** Assumed

---

### Q19 — API versioning?

**Assumed answer:** **`/api/v1` prefix on all routes**

**Status:** Assumed

---

### Q20 — How is the account admin created?

**Ambiguity:** Previous assumption: only first global user is admin.

**Assumed answer:** **Every user who registers via `/auth/register` becomes:**
- Account admin (`AccountMembership.accountRole = admin`, verified)
- Default workspace admin (`WorkspaceMembership.workspaceRole = admin`, verified)
- A new Account and default Workspace are created atomically in the same transaction

**Rationale (user override):** "A registered user becomes an Admin. It creates an account and allocates a default workspace on the account."

**Impact:** Registration service orchestrates Account + Workspace + User + Memberships in one operation.

**Status:** **Confirmed** (user override 2026-06-06)

---

### Q21 — How are invitations delivered?

**Assumed answer:** **Manual link share for new users only — no email integration**

**Flow (branching on invitee):**

`POST /api/v1/invites { email, name?, workspaceId? }`

| Invitee | Server action | API response |
|---------|---------------|--------------|
| Email not found OR user `unverified` | Create/update unverified memberships + `Invitation` token | `{ type: 'pending', inviteUrl, expiresAt }` — admin copies link manually |
| User already `verified` | Create verified `AccountMembership` + `WorkspaceMembership` immediately | `{ type: 'added', user, memberships }` — no link |

**Rationale (user override):** Link is manually shared only when password setup is required. Verified users are added instantly.

**Status:** **Confirmed** (updated 2026-06-06)

---

### Q22 — Workspaces per account and workspace management

**Ambiguity:** Previous assumption deferred multi-workspace UI to a later phase.

**Assumed answer:** **Full multi-workspace support within each account**

**User capabilities (within the active account):**

| Capability | Who |
|------------|-----|
| See all workspaces they belong to (member or admin) | Any verified account member |
| Switch active workspace | Any verified workspace member (dropdown in nav) |
| Create new workspace | Account admin |
| Add member to a workspace | Account admin (any workspace); workspace admin (own workspace(s)) |
| Remove member from a workspace | Account admin (any workspace); workspace admin (own workspace(s)) |

**Workspace switcher UI (`WorkspaceSwitcher`):**
- Dropdown in top nav, next to `AccountSwitcher`
- Lists workspaces in the **current account** where the user has a verified `WorkspaceMembership`
- Shows workspace name, role badge (`Admin` / `Member`), checkmark on active workspace
- Hidden when user belongs to only one workspace in the account; visible when 2+

**Workspace management UI:**
- `/settings/workspaces` — list workspaces (user's memberships) + create form (account admin)
- `/settings/workspaces/:id/members` — add/remove verified account members to/from that workspace

**API (additions):**
- `GET /api/v1/workspaces` — workspaces in current account where user is a verified member
- `POST /api/v1/workspaces` — create workspace (account admin); creator becomes workspace admin
- `GET /api/v1/workspaces/:id/members` — list workspace members
- `POST /api/v1/workspaces/:id/members` — add user to workspace (via `membershipService.addToWorkspace`)
- `DELETE /api/v1/workspaces/:id/members/:userId` — remove workspace membership (not account membership)

**Rules:**
- Registration still creates one **default workspace** (`isDefault: true`); additional workspaces can be created
- Removing from a workspace does **not** remove account membership (user may belong to other workspaces or remain account member)
- Tasks, filters, assignees, and real-time events are always scoped to the **active workspace** in JWT
- Switching account resets to that account's last-used workspace (or default workspace)

**Rationale (user override):** "Workspace switcher should be implemented… see all workspaces… create new workspaces, add/remove members… switch between workspaces."

**Impact:** Significant frontend + API scope; `WorkspaceSwitcher.tsx`, workspace settings pages, workspace CRUD service.

**Status:** **Confirmed** (user override 2026-06-06)

---

### Q23 — Can unverified members log in?

**Assumed answer:** **No — globally unverified users cannot log in**

Only users with `User.verificationStatus === 'unverified'` are blocked. Once verified (via register or invite accept), they can log in and access any account/workspace they belong to.

**Impact:** Login checks global `verificationStatus`, not per-membership status.

**Status:** Assumed (clarified for Q25)

---

### Q24 — Invitation token expiry and revocation?

**Assumed answer:** **Invites expire after 7 days; admin can revoke pending invites**

**Rationale:** Not specified by user; standard security default. Admin invite management UI lists pending/expired invites.

**Impact:** `Invitation.expiresAt`, `Invitation.status`: `pending` | `accepted` | `expired` | `revoked`

**Status:** **Confirmed** (user review 2026-06-06)

---

### Q25 — What happens when admin invites an already-verified user?

**Ambiguity:** Previous model always required invite link acceptance, even if the user already had credentials.

**Assumed answer:** **Immediate membership — no invite link, no password step**

If the email matches a User with `verificationStatus: 'verified'` (from own registration or a prior accepted invitation):
1. Create `AccountMembership` (`member`, `verified`) if not already a member of this account
2. Create `WorkspaceMembership` (`member`, `verified`) for the target workspace
3. Return success immediately — user can access the account on next login or via context switch

**Rationale (user override):** "The moment they are added to a new account or new workspace, they become part of it."

**Impact:** No `Invitation` record for verified users. Idempotent if already a member (return existing membership).

**Status:** **Confirmed** (user override 2026-06-06)

---

### Q26 — Does workspace membership imply account membership?

**Ambiguity:** Account and workspace memberships were modeled separately; relationship rule not explicit.

**Assumed answer:** **Yes — adding a user to a workspace always ensures account membership on the parent account**

Rule enforced in `membershipService.addToWorkspace()`:
1. Resolve workspace → parent `accountId`
2. Upsert `AccountMembership` (create if missing, same verification status as workspace add)
3. Upsert `WorkspaceMembership`
4. Both operations in a single transaction

**You cannot be a workspace member without being an account member.** There is no workspace-only membership.

**Rationale (user override):** "Adding user to a workspace automatically makes them an account member as well."

**Impact:** All invite/add flows go through one service method. A user may remain an **account member** after being removed from a workspace (if they still have account membership from another workspace or direct account invite).

**Status:** **Confirmed** (user override 2026-06-06)

---

### Q27 — Can one user belong to multiple accounts?

**Ambiguity:** v1 doc listed multi-account membership as out of scope.

**Assumed answer:** **Yes — a verified user may belong to many accounts and workspaces**

Examples:
- Priya registers → Account A (admin)
- Rahul registers → Account B (admin)
- Priya invites Rahul (verified) to Account A → Rahul is now member of Account A and admin of Account B

**Impact:**
- Email remains globally unique on `User`
- Membership join tables hold per-account/workspace roles
- User needs a way to switch active account/workspace context (see Q28)

**Status:** **Confirmed** (user override 2026-06-06)

---

### Q28 — How does a multi-account / multi-workspace user switch context?

**Assumed answer:** **Account dropdown + workspace dropdown in the app header + context switch API**

**Backend:**
- `GET /api/v1/auth/memberships` — nested structure: accounts → workspaces (with roles per level)
- `POST /api/v1/auth/switch-context { accountId, workspaceId }` — validate both memberships, issue new JWT, reconnect socket
- Login defaults to user's **own registered account** + default or last-used workspace (`localStorage`: `lastActiveAccountId`, `lastActiveWorkspaceId`)

**Frontend — `AccountSwitcher`:**
- Top nav; hidden when user belongs to only one account
- On account change: switch to last-used workspace in that account, or default workspace

**Frontend — `WorkspaceSwitcher`:**
- Top nav, adjacent to account switcher; hidden when user belongs to only one workspace **in the current account**
- Lists workspaces where user has verified membership in the active account
- On workspace change: `POST /auth/switch-context` with same `accountId`, new `workspaceId` → refetch tasks, rejoin socket room

**Rationale:** Q22 requires workspace switching; Q27 requires account switching — both dropdowns in nav.

**Impact:**
- `AccountSwitcher.tsx` + `WorkspaceSwitcher.tsx` in TopNav
- `authStore.memberships` holds nested account/workspace tree
- Socket client reconnects on any context switch

**Status:** **Confirmed** (updated 2026-06-06)

---

## Override Log

| Date | ID | Original | New Answer | Reason |
|------|----|----------|------------|--------|
| 2026-06-06 | Q1 | Single shared workspace | Account + Workspace multi-tenant | User requirement |
| 2026-06-06 | Q2 | Open registration only | Register = new account; join via invite | User requirement |
| 2026-06-06 | Q3 | Simple admin/member on User | Account + workspace role model | User requirement |
| 2026-06-06 | Q14 | All registered users | Verified workspace members only | User requirement |
| 2026-06-06 | Q15 | No verification | Invite-link verification for members | User requirement |
| 2026-06-06 | Q20 | First global user = admin | Every registrant = account + workspace admin | User requirement |
| 2026-06-06 | Q21 | — | Manual invite link (no email) | User requirement |
| 2026-06-06 | Q15 | All invitees unverified until link | Verified users added immediately; link only for new users | User requirement |
| 2026-06-06 | Q21 | Always returns invite link | Branch: link for new/unverified; instant add for verified | User requirement |
| 2026-06-06 | Q25 | — | Existing verified user → immediate membership | User requirement |
| 2026-06-06 | Q26 | — | Workspace add implies account membership | User requirement |
| 2026-06-06 | Q27 | Multi-account out of scope | User can belong to many accounts | User requirement |
| 2026-06-06 | Q28 | Minimal / assumed UI | Account dropdown in nav when multiple accounts | User requirement |
| 2026-06-06 | Q22 | One default workspace only | Full workspace switcher + CRUD + member mgmt | User requirement |
| 2026-06-06 | Q4,Q6,Q13,Q24 | Assumed | Confirmed on review checklist | User review |

---

## Review Checklist

Before repo creation, confirm or override:

- [x] Q1 — Account + Workspace multi-tenant model
- [x] Q2 — Register creates account; invite joins account
- [x] Q3/Q20 — Registrant = account admin + workspace admin
- [x] Q4 — Task visibility within workspace
- [x] Q6 — Status enum values (`todo`, `in_progress`, `done`)
- [x] Q13 — Workspace-scoped socket rooms
- [x] Q15/Q21 — Invite link for new users; instant add for verified users
- [x] Q22 — **Multi-workspace: switcher, create, add/remove members**
- [x] Q24 — 7-day invite expiry
- [x] Q25/Q26 — Immediate add for verified users; workspace implies account
- [x] Q27 — Multi-account membership
- [x] Q28 — Account + workspace dropdown switchers in nav

**All review items confirmed.** Ready for repo scaffolding.

---

## Document History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-06-06 | Initial ambiguities and assumed answers |
| 2.0 | 2026-06-06 | User override: Account/Workspace model, invite flow, verification states |
| 2.1 | 2026-06-06 | Verified users added immediately; workspace→account membership rule; multi-account |
| 2.2 | 2026-06-06 | Q28 confirmed: account dropdown switcher in UI |
| 2.3 | 2026-06-06 | Q22 override: full workspace switcher + management; checklist complete |
