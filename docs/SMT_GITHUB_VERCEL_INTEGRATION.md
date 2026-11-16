# Gestion SMT — GitHub/Vercel staging contract (2026-11-16)

## Scope

This staging change preserves the **original Replit premium React UI** by telling Vercel to build `@workspace/fiche-medicale` in the existing monorepo instead of using an unrelated static app or its workspace root. It adds explicit SPA rewrites only for routes declared in `App.tsx`. **It does not deploy or reproduce the full clinical app on Vercel.**

### Guarantees and explicit limitations

- Main, production, original Replit workspace, database, clinical records, and Docker are **untouched**.
- The frontend remains React + Vite + Wouter; `Layout.tsx`, `Dashboard.tsx`, CSS, and medical forms are unchanged.
- `vercel.json` builds the premium app to `artifacts/fiche-medicale/dist/public`.
- No `/api/*` rewrite to `index.html` is installed: APIs are still provided by the Express backend outside the static host. An unconfigured API will fail/404. **Do not test with real medical data or public users.**
- Before a functional preview, the frontend/API contract and a separately hosted **secured** Express + PostgreSQL + Flask deployment must be configured. The Replit branch `agent/safe-portability` reportedly contains `VITE_API_BASE_URL` support; it is **not merged here** until its exact source is available and verified.
- Never point a browser preview at a backend without authentication/authorization. Rotate the Telegram token reported as exposed in Replit Agent logs before using Telegram.

## Steps for Vercel Preview (not production)

1. Review the GitHub branch and ensure the Vercel project is connected to `Gladio9191/Gestion-M-dicale-SMT`, **root directory = repository root**, with framework preset `Other` if auto-detection would override `vercel.json`.
2. Keep the Production Branch as the existing `main`, and work only on the integration branch. Check preview build metadata: build command and Output Directory must match `vercel.json`.
3. Before any deployment, run `node scripts/verify-smt-preview.mjs` and, with dependencies installed, `PORT=18971 BASE_PATH=/ pnpm --filter @workspace/fiche-medicale run typecheck` and `PORT=18971 BASE_PATH=/ pnpm --filter @workspace/fiche-medicale run build`.
4. Review Preview UI visually against the original Replit screenshots: sidebar, four KPI cards, statistics graphs, and forms. No clinical data should be present in this preview.
5. Integrate the exact *source* of the Replit `agent/safe-portability` branch separately, resolving conflicts instead of overwriting files, then run full monorepo quality gates.
6. Only **after** security, functional QA, backup, and release review should local Docker deployment be considered.

## Known baseline gaps

- The old GitHub `main` (inspected via GitHub) did not have `vercel.json`, `.env.example` or the Replit branch's central API helper; the premium UI source files **did exist**.
- The latest Replit branch reportedly fixed `mockup-sandbox` build defaults and passed root typecheck/build, but those changes are **not accessible** on the GitHub branch as of this report.
- Offline fonts, local PostgreSQL, Python engine, SMTP, and Telegram are postponed to the final Windows/Docker phase.
- Replit Agent reported viewing sensitive API output and a Telegram secret in logs. Inspect exposure and rotate secrets through the service provider; do not copy tokens into Git.

## Reproducible verification

```
node scripts/verify-smt-preview.mjs
python -m json.tool vercel.json
```

These are **static configuration checks**, not a successful Vercel deployment or a medical workflow test.
