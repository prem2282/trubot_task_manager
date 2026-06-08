# Email & verification

Plain-English reference for transactional email, email verification, and password reset.

## Overview

| Module | Purpose |
|--------|---------|
| `emailService.ts` | Sends mail via SMTP (Mailpit) or Resend HTTP API |
| `emailTemplates.ts` | HTML + plain-text bodies for verification and reset emails |
| `verificationService.ts` | Creates/consumes tokens; orchestrates verify + reset flows |
| `VerificationToken` model | Stores hashed tokens with TTL |

## Environment

| Variable | Local default | Production |
|----------|---------------|------------|
| `EMAIL_PROVIDER` | `smtp` | `resend` |
| `SMTP_HOST` | `localhost` | — |
| `SMTP_PORT` | `1025` (Mailpit) | — |
| `EMAIL_FROM` | `Task Manager <noreply@localhost>` | Verified domain in Resend |
| `RESEND_API_KEY` | — | Required when `EMAIL_PROVIDER=resend` |
| `EMAIL_VERIFICATION_EXPIRY_HOURS` | `24` | `24` |
| `PASSWORD_RESET_EXPIRY_HOURS` | `1` | `1` |

**Local inbox:** http://localhost:8025 (Mailpit UI)

---

## `emailService.sendEmail(input)`

**What it does:** Sends one transactional email.

**When it runs:** Called by `verificationService` after register, resend, or forgot-password.

**Parameters:** `{ to, subject, html, text }`

**Side effects:** SMTP send or Resend API POST.

**Errors:** Throws if Resend returns non-2xx or SMTP fails.

---

## `verificationService.sendEmailVerification(user)`

**What it does:** Invalidates prior unused verification tokens, creates a new token, emails `{CLIENT_URL}/verify-email/{token}`.

**When it runs:** After successful registration; on resend.

---

## `verificationService.verifyEmailAndLogin(rawToken, buildAuthResult)`

**What it does:** Validates token, marks user + all unverified memberships as verified, consumes token, returns JWT session (auto-login).

**Errors:** `404` invalid/expired link; `403` no membership after verify.

---

## `verificationService.requestPasswordReset(email)`

**What it does:** For verified users with a password, creates reset token and emails `{CLIENT_URL}/reset-password/{token}`.

**Security:** Silent return if email unknown (no enumeration).

---

## `verificationService.resetPassword(rawToken, password)`

**What it does:** Updates password hash, marks token used, deletes all refresh tokens for user.

---

## Auth API routes (added)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/verify-email/:token/validate` | Preview link metadata |
| POST | `/auth/verify-email/:token` | Verify + login |
| POST | `/auth/resend-verification` | Resend verify email |
| POST | `/auth/forgot-password` | Send reset email |
| GET | `/auth/reset-password/:token/validate` | Preview reset link |
| POST | `/auth/reset-password/:token` | Set new password |

Rate limits: auth routes 30/15min; email-sending routes 10/15min.
