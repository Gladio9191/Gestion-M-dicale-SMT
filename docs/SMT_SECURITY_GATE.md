# Gestion SMT — Single-owner security decision
Date: 2026-11-16
Status: DECISION CONFIRMED BY USER; implementation pending.

## Product decision

This application is for **one owner only** and will **not be shared with other users**. Reject the previous multi-account/multi-role proposal.

No sign-up, invitations, employee accounts, doctor/nurse/admin role hierarchy, or permissions management UI are required.

## Appropriate minimal access design

- One owner login only, with a strong password (or an equivalent device-backed credential if implemented later). A short PIN by itself is **not** an adequate internet-facing API authentication method.
- No plaintext password in Git, client-side JavaScript, `VITE_*` variables, logs, ZIP exports, or database tables. Store only an approved salted slow password hash or use a vetted identity solution.
- All clinical data access, imports, exports, Telegram sends, and the Flask Fiche Engine proxy must be protected **server-side**, not merely hidden by a React login page.
- The existing premium React UI remains unchanged wherever possible. Any login screen should lead to this original interface, not replace or redesign it.
- Use least-privileged private network/staging deployment; restrict CORS to explicit origins, limit login attempts, use expiring/revocable sessions, and protect against CSRF if cookies are used.
- Separate preview (synthetic data only) from private medical records. Public Vercel frontend preview does **not** mean the clinical API may be exposed without authentication.
- No dependency on Replit accounts for the eventual Windows/Docker installation. Docker installation remains the final phase after UI/functions/security QA.

## Verified source risks requiring a fix

1. `artifacts/api-server/src/app.ts`: `app.use(cors())` permits broad CORS and the `/api/fiche-engine` proxy is registered before the other middleware.
2. `artifacts/api-server/src/routes/index.ts`: employee, visits, stats, hygiene, activities and Telegram routers are registered without an authentication guard.
3. `artifacts/api-server/src/routes/medical.ts`: medical record update/delete routes currently lack identity enforcement.
4. `artifacts/api-server/src/routes/telegram-sends.ts`: Telegram send history is not guarded.
5. Replit's prior audit flagged a Telegram bot token disclosed in task logs. Rotate it before enabling Telegram integration.

The source-level findings do not establish that these routes are currently reachable on the public internet.

## Single-owner acceptance tests (not yet run)

- Unauthenticated requests to all private API paths, including the Flask proxy, return 401 with **no database or Flask call**.
- Owner logs in using a non-hardcoded credential, an expiring and revocable session, and logs out successfully.
- Invalid credentials and brute-force attempts are rate-limited; nothing sensitive is logged.
- Other origins are rejected by CORS; private API responses are not cached.
- All clinical writes and exports require authenticated owner access. Health check may be minimally public.
- The UI is the original Replit premium interface after login.
- Full typecheck/build, synthetic-data functional tests, and browser tests must pass before any production use.

## Work boundary

Branch `security/smt-access-control-20261116` only. No change to `main`, Replit original, production deployments, Docker, or actual PostgreSQL records.

**Security implementation is NOT complete just because this decision has been recorded.**
