# BUG-005: Page refresh logs user out

**Status:** Fixed  
**Found:** 2026-06-08

## Symptom

After logging in, refreshing the browser redirected to the login page.

## Cause

1. **Access token was memory-only** — stored in a module variable, lost on every page reload.
2. **`fetchMe` relied on refresh cookie** — with `VITE_API_URL=http://localhost:5000`, requests were cross-origin from the Vite app (`5173`), so the httpOnly refresh cookie was often not sent (`SameSite=strict`).
3. **Auth bootstrap race** — `AppLayout` rendered before `fetchMe()` finished. Initial state was `isAuthenticated: false` and `isLoading: false`, so the first paint immediately redirected to `/login` even when a valid token existed in `localStorage`.
4. **Refresh interceptor deadlock** — On a fresh browser (no session), `/auth/refresh` returned 401 and the axios interceptor tried to refresh again, deadlocking on the pending refresh promise and leaving the app stuck on "Loading...".

## Fix

1. **`client/src/services/api.ts`** — persist access token in `localStorage` (`taskManager.accessToken`); restore on load; dedupe refresh requests.
2. **`authStore.fetchMe`** — use stored token first, then refresh + `/auth/me` only if needed; add `authReady` flag; only clear token on 401/403 (not network errors).
3. **`App.tsx`** — bootstrap `fetchMe()` once at app mount; show loading until `authReady`.
4. **`AppLayout.tsx`** — remove `fetchMe` effect; only guard routes after bootstrap completes.
5. **`LoginPage.tsx`** — redirect to dashboard if already authenticated after bootstrap.
6. **`client/.env.example`** — default `VITE_API_URL=/api/v1` so dev uses the Vite proxy (same-origin cookies for refresh).
7. **Server refresh cookie** — `SameSite=lax` in development.
8. **`api.ts` interceptor** — skip auto-refresh retry for `/auth/refresh`, `/auth/login`, and `/auth/register` to avoid deadlock on unauthenticated loads.

## Verification

- [ ] Login → refresh page → still on dashboard
- [ ] Logout clears `localStorage` token
- [ ] After access token expires, refresh cookie restores session (with proxy URL)

## Note

If you have an existing `client/.env` pointing at `http://localhost:5000`, change to:

```env
VITE_API_URL=/api/v1
```

Or rely on localStorage token persistence alone.
