# Gestion SMT — Private one-owner authentication
Date: 2026-11-16

## Implemented on isolated feature branch

- Owner-only password authentication (scrypt salted hash, no sign-ups and no role tables).
- Server-side ephemeral session kept in process memory, with HttpOnly cookie, 8h absolute expiry, one active session and logout revocation.
- Request CSRF token from owner session; mutation guard covers ALL protected Express routes and Flask reverse proxy.
- Five login failures per socket IP within 15 minutes trigger a rate limit. HTTP requests never log the password or medical URL segments.
- CORS has an exact configured origin allow-list; no wildcard.
- React shows a personal login screen before it mounts the **unchanged** Dashboard and Layout. Generated API client and direct API client both send credentials and CSRF headers.
- Public health check only at GET /api/healthz. Login at POST /api/auth/login; session GET /api/auth/session; logout POST /api/auth/logout.

## Provision owner password locally (when setting up a private backend later)

```bash
node --experimental-strip-types scripts/hash-smt-owner-password.mjs
```

The terminal prompts for a 12+ character secret with hidden input and prints a salted `scrypt$...` hash. Copy the HASH (not the plaintext password) into the backend's private `SMT_OWNER_PASSWORD_HASH` runtime secret. Never paste the password, hash or a DB connection string in GitHub, chat, ZIP backups or Vercel frontend variables.

Configure `DATABASE_URL` only in the secure backend environment, `SMT_ALLOWED_ORIGINS` with the exact trusted frontend origin(s), `NODE_ENV=production`, `SMT_COOKIE_SECURE=true`. `SMT_COOKIE_SAME_SITE=strict` is ideal when the API shares the same site. Separately hosted HTTPS frontend/API may need `SMT_COOKIE_SAME_SITE=none` and should use a same-site reverse proxy if browsers block third-party cookies. Treat this as deployment architecture requiring further browser testing.

**Do NOT set `SMT_OWNER_PASSWORD_HASH` in `VITE_*` or any public frontend environment variable.** The frontend may set `VITE_API_BASE_URL` to the API origin; that URL is not a secret.

## Implementation and QA limits

- No password hash, API secret, or real medical file was generated or processed for live use in this task.
- No actual PostgreSQL connection was made, no schema migration, no webhook/Telegram request, and no original Replit or production deployment was changed.
- The intended private deployment is a single Node process. Sessions are in-memory: they disappear on restart and do NOT support horizontally scaled replicas. A durable session store is required for multi-node hosting.
- Independent end-to-end test of Express, proxy, database, browser login, logout and Vercel API connectivity is **pending**, despite source-level and isolated crypto/session unit tests.
- Full workspace typecheck/build must pass CI before enabling real health records; GitHub/Vercel deployment status alone is not proof.

## Security acceptance gate

1. Unauthenticated GET /api/employees, /api/stats/overview and /api/fiche-engine/status must return 401.
2. Wrong password returns 401 and 6th consecutive attempt per socket address returns 429.
3. Only after a valid owner login may the API serve records; missing/incorrect CSRF gives 403 for write methods.
4. Logout invalidates session both in server memory and client query caches.
5. Only the approved origin may read authenticated responses with cross-origin cookies; no unknown-origin access.
6. The premium Replit Dashboard, Sidebar and all medical UI components render unchanged once logged in.
7. A private staging database with *synthetic records* is tested before any real medical information is used.

## Remaining work

Full build and browser QA, independent private Express+Flask+PostgreSQL staging, complete multi-sheet import and Telegram parity, secure backup/restore, and Docker Desktop Windows packaging at the final stage.
