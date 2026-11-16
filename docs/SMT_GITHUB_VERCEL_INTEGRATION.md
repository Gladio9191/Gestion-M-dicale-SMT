# Gestion SMT — GitHub/Vercel staging contract (2026-11-16)

## Scope

This staging change preserves the **original Replit premium React UI** by telling Vercel to build `@workspace/fiche-medicale` in the existing monorepo instead of using an unrelated static app or its workspace root. It adds explicit SPA rewrites only for routes declared in `App.tsx`. **It does not deploy or reproduce the full clinical app on Vercel.**

### Guarantees and explicit limitations

- Main, production, original Replit workspace, database, clinical records, and Docker are **untouched**.
- The frontend remains React + Vite + Wouter; `Layout.tsx`, `Dashboard.tsx`, CSS, and medical forms are unchanged.
- `vercel.json` builds the premium app to `artifacts/fiche-medicale/dist/public`.
- No `/api/*` rewrite to `index.html` is installed: APIs are still provided by the Express backend outside the static host. An unconfigured API will fail/404. **Do not test with real medical data or public users.**
- Before a functional preview, the frontend/API contract and a separately hosted **secured** Express + PostgreSQL + Flask deployment must be configured. The uploaded `SMT-Replit-Portability.patch` was inspected and integrated on this branch on 2026-11-16. The `VITE_API_BASE_URL` helper, generated client initialization, and Replit Vite build fixes are present. Two source files (`GenererFiches.tsx`, `ImportExcel.tsx`) required semantic merging because their GitHub baseline had diverged; existing GitHub workflows were preserved, but full Replit-vs-GitHub feature parity for those screens is NOT yet independently verified.
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
- The Replit patch includes the `mockup-sandbox` build defaults; the corresponding source blob was independently verified in GitHub. Replit Agent previously reported successful root typecheck/build, but the merged GitHub branch has not completed an independently verified full build.
- Offline fonts, local PostgreSQL, Python engine, SMTP, and Telegram are postponed to the final Windows/Docker phase.
- Replit Agent reported viewing sensitive API output and a Telegram secret in logs. Inspect exposure and rotate secrets through the service provider; do not copy tokens into Git.

## Reproducible verification

```
node scripts/verify-smt-preview.mjs
python -m json.tool vercel.json
```

These are **static configuration checks**, not a successful Vercel deployment or a medical workflow test.

## Patch intake audit — 2026-11-16

- Uploaded patch: 12 changed paths, of which 11 were integrated; the `vercel.json` wildcard SPA rewrite was intentionally rejected because it could intercept `/api` requests.
- Nine file blobs match Replit's exact target Git SHA prefixes; `GenererFiches.tsx` and `ImportExcel.tsx` are semantically reconciled rather than wholesale replaced.
- All changes are on the `integration/smt-replit-portability-20261116` branch only. No production deployment, database migration, or Replit source mutation was requested or executed.
- A local static audit of the original Replit patched source passed 12/12 checks; **this is not a runtime/browser/full build pass**.
- Vercel GitHub status checks may report success for the integration branch, but the actual live premium UI and backend data flow have not been visually or functionally verified.
- **Remaining work**: inspect feature-level differences in the two divergent fiche/Excel components, provision an appropriately secured API backend in staging, and run complete automated/build/browser tests before any medical use.
