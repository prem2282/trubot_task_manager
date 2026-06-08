# BUG-004: Password reset success but no email in real inbox (local dev)

**Status:** Fixed  
**Found:** 2026-06-08

## Symptom

On **Forgot password**, the UI showed:

```text
If an account exists for that email, a password reset link has been sent.
```

No email arrived in the user's **real** mailbox (Gmail, etc.).

## Cause

1. **Local dev uses Mailpit**, not real SMTP. Emails go to http://localhost:8025 — they never reach Gmail/Outlook. The UI did not explain this on the forgot-password page (unlike register).
2. **`server/.env` was missing email variables** — defaults worked, but Mailpit must be running (`docker compose up`).
3. **Unverified accounts:** password reset silently did nothing (anti-enumeration message still shown). Now an unverified user with a password receives a **verification email** instead.

## Fix

1. **ForgotPasswordPage** — Mailpit notice before submit + prominent link after success; pre-fill email from login page.
2. **`emailService`** — log dev send success/failure with Mailpit URL.
3. **`requestPasswordReset`** — if user exists but is unverified, send verification email (still generic success message).
4. **API (dev only)** — `devInboxUrl` + `devNote` in forgot-password response when email was sent.
5. **`server/.env`** — added explicit Mailpit SMTP settings.

## Verification

- [ ] Mailpit running: `docker ps` shows `task-manager-mailpit`
- [ ] Forgot password → email appears at http://localhost:8025
- [ ] Server log: `[email] Sent "Reset your Task Manager password" to ... (view at http://localhost:8025)`
- [ ] Login → Forgot password pre-fills email
