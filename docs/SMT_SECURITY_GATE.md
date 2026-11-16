# Gestion SMT — Security gate before database-backed workflows
Date: 2026-11-16
Scope: source review only. No credentials accessed; no database queried or changed.

## Verified source findings

| Finding | Evidence in integration source | Severity |
|---|---|---|
| Sensitive routes are mounted without authentication or authorization middleware | `artifacts/api-server/src/routes/index.ts` mounts employees, medical, stats, hygiene, registre, pointage and Telegram routes immediately after the public health router; `app.ts` uses the router without an authentication guard | **Critical before public API deployment** |
| Fiche Engine proxy occurs before all other middleware | `artifacts/api-server/src/app.ts` mounts `/api/fiche-engine` proxy before JSON, logger and the general router. Adding authentication only to the general router would leave the proxy exposed | **Critical** |
| CORS is unrestricted in source | `app.use(cors())` in `artifacts/api-server/src/app.ts` | **High** |
| Health and employee records can be mutated via currently unguarded API routes | `artifacts/api-server/src/routes/employees.ts` includes POST/PUT operations; `artifacts/api-server/src/routes/medical.ts` includes PUT/DELETE actions; no per-request identity/role check is visible | **Critical** |
| Telegram history API not protected | `artifacts/api-server/src/routes/telegram-sends.ts` has GET/POST and no route-level authorization | **High** |
| Browser multi-sheet preview is read-only | `ImportExcelMultiSheets.tsx` performs local workbook inspection only, with no HTTP requests or database writes | Mitigation in preview only |

**Important limitations:** This is a code-level review. No live penetration test, deployed API discovery, full dependency audit, database credential inspection, or full browser test has been performed. Do not infer which internet endpoints are publicly accessible from source alone.

## Next secure implementation phase

1. Define a deployable trust boundary: Vercel static frontend is not an authentication boundary. The Express API, Fiche Engine proxy and PostgreSQL must not be internet-exposed without proven server-side authorization.
2. Pick one identity/session design and test it end to end. Recommended requirements: unique user accounts, minimum two roles (SMT clinician and administrator), minimum privilege for viewing clinical records, secure server-side session validation, `HttpOnly` + `Secure` + `SameSite` cookie configuration and CSRF protection if cookie-based login is used, login rate limiting, session expiration and revocation.
3. Mount auth guard **before** both `/api/fiche-engine` and `/api` routes; exempt only `GET /api/healthz` and explicitly documented login/session endpoints. Guard *all* methods, not only writes.
4. Add authorization per route and record action: read patient fiches, create/update health record, delete, export, Telegram send, import, backup and restore. A role alone must not bypass server-side field-level and record-scope checks.
5. Replace global `cors()` with restrictive allow-list of exact approved staging origins and correct preflight credential handling. Never use wildcard CORS with credentials.
6. Never put session secrets or Telegram tokens in Git or `VITE_` variables; rotate previously exposed Telegram credentials in provider UI. Add validation and security logging without recording health data or secrets.
7. Write synthetic-data integration tests: unauthenticated calls return 401 before database/proxy access; wrong-role returns 403; authorized operations return intended results; invalid session/cookie/CSRF are rejected; cross-origin access controlled; health check returns minimal non-clinical status.
8. Complete the Replit multi-sheet backend and Telegram parity only after this quality gate passes, and keep a separate test DB with synthetic records.

## Acceptance criteria (not yet achieved)

- All protected API routes enforce real server-side identity and authorization; Fiche Engine cannot bypass the guard.
- Verified automated auth and authorization tests cover unauthorized and cross-role cases.
- No secret leakage in logs, client bundles, code or CI output.
- Full TypeScript workspace typecheck, build and browser workflows pass on isolated staging without touching production or source Replit DB.

## Execution boundaries

- Branch: `security/smt-access-control-20261116` created from `feature/smt-multisheet-preview-20261116`.
- No change to `main`, production deployment, original Replit app, or PostgreSQL.
- This document is a **security audit and implementation contract**, not a claim that authentication has been implemented.
