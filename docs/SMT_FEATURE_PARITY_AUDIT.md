# Gestion SMT — Replit ↔ GitHub Feature Parity Audit
Date: 2026-11-16
Status: **Important functional gaps confirmed; deployment is not release-ready.**

## Sources and verification
- Canonical UI/function source: user-exported `Projet-fiches-techniques-medicales.zip` and portable candidate with the original Replit `agent/safe-portability` changes.
- Target: `Gladio9191/Gestion-M-dicale-SMT` branch `integration/smt-replit-portability-20261116`.
- Examined current source via the GitHub integration and original Replit files via the user-supplied source ZIP.
- Only source/route analysis: no medical records, database queries, production changes, or authenticated browser workflow tests.

## Confirmed differences (high priority)

| Capability | Original Replit | GitHub integration branch | Impact |
|---|---|---|---|
| Excel multi-sheet import | `ImportExcel.tsx` detects `visites`, `personnel`, `restrictions`, `campagne` and posts to `POST /api/employees/import-sheets` | `ImportExcel.tsx` uses column mapping and posts to `POST /api/employees/import`; its API server has no `/employees/import-sheets` route | Replit's multi-sheet import workflow is not preserved on GitHub |
| Multi-sheet import backend | Replit `employees.ts` includes `POST /employees/import-sheets` plus regular `POST /employees/import` | GitHub `employees.ts` includes only `POST /employees/import` | Copying Replit UI without its server route would break imports |
| Per-agent Telegram delivery | Replit `employees.ts` includes `POST /employees/:matricule/send-telegram` | GitHub `employees.ts` lacks this route | Replit direct Telegram workflow cannot work against GitHub API |
| Telegram sending history UI | Replit `GenererFiches.tsx` references `loadTgHistory`, `tgHistory`, and `/api/telegram-sends` | GitHub `GenererFiches.tsx` has no corresponding history-loading function; it has a `telegram-sends` API router | Replit history feature not fully wired in the GitHub UI |
| UI design | Premium `Layout.tsx`, `Dashboard.tsx`, colors and navigation in Replit | Matching premium components exist in GitHub | Preserve UI; do not rebuild or replace with a simple screen |
| API base URL | New Replit helper `apiFetch`, `VITE_API_BASE_URL` | Merged and source-verified on GitHub | Portable client routing prepared, not functional proof |
| Vercel SPA rewrites | Original Replit suggested a wildcard | Integration uses explicit screen rewrites, excludes `/api/*` | Intentionally preserve the safer Vercel configuration |

## Important interpretation
The previous patch fusion deliberately preserved the diverged GitHub `GenererFiches.tsx` and `ImportExcel.tsx`, resolving API URL calls. **That is not equivalent to preserving all Replit functions**. This audit confirms concrete missing Replit workflows and requires additional semantic porting across frontend, Express routes, data validation, and export behavior.

## Required implementation order
1. Port Replit's multi-sheet Excel import **frontend and Express endpoint as a matched pair**, preserving GitHub's existing import form. Avoid overwriting the original import workflow; expose both modes or an equivalent verified unified flow.
2. Reconcile per-agent Telegram action, API route, and send-history UI. Do not transmit Telegram tokens in public logs; rotate the token previously flagged as exposed.
3. Add authentication, server-side authorization/roles and restrictive CORS before using actual medical records or a publicly reachable API. Schema writes and production database operations remain out of scope.
4. Add automated contract tests for both import routes and Telegram routes; test Excel parsing, validations, PDF/Word output with wholly synthetic data.
5. Verify full workspace typecheck and build. The earlier GitHub Actions workflow is installed but its success was **not independently demonstrated** by the available connector; successful Vercel deployment checks alone do not prove this QA.
6. Run browser visual/functional regression tests on a non-production preview, comparing sidebar, dashboard, upload flow and medical fiche generation to Replit.
7. Keep Docker/Windows localization as the **last** stage, as requested.

## Release gate
**Do not merge to `main` or use real patient/employee health information until all above critical gaps and security requirements are validated.**
