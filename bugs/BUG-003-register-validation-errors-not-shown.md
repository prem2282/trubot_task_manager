# BUG-003: Register shows generic "Validation failed" with no field details

**Status:** Fixed  
**Found:** 2026-06-07

## Symptom

On the Register page, submitting the form showed only:

```text
Validation failed
```

No indication of which field failed or why. Password rules were not shown in the UI.

Example input that triggered the error: password with **7 characters** (below the 8-character minimum).

## Cause

1. **Server** returned a structured `errors` array (`field`, `message`) via `AppError`, but messages were generic Zod defaults.
2. **Client** (`RegisterPage`) only read `response.data.message` and ignored `response.data.errors`.
3. **UI** did not document password requirements before submit.

## Fix

1. **`server/src/utils/validators.ts`** — clear messages for register/accept-invite fields; treat empty optional `accountName` as omitted.
2. **`client/src/utils/apiErrors.ts`** — shared `parseApiError` / `formatApiError` helpers.
3. **`RegisterPage`** — per-field error text, red borders, password hint ("At least 8 characters"), summary banner with field details.
4. **`AcceptInvitePage`** — same validation error handling for consistency.

## Verification

- [ ] Register with 7-character password shows: `Password: Password must be at least 8 characters`
- [ ] Password field shows hint before submit
- [ ] Invalid email shows under email field
- [ ] Empty optional account name does not fail validation
- [ ] Register with valid data succeeds
