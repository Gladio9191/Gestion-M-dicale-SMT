# Deep Replit parity review — 2026-11-16
Reference: user-supplied `Projet-fiches-techniques-medicales.zip`; SHA256 `e484ca0e2f0f070bad0a44d3627ccba6e97f6c2552ba32102c07259b0618e6f5`. Original ZIP CRC: PASS (1,581 entries).

Comparison target: integration/mus-mos-replit-fusion-20261116 (NOT main). Of 33 strategic source files compared using Git blob hashes against the original ZIP, **19 byte-identical**, **14 different**. Different is not necessarily wrong but requires a tested justification.

### Confirmed source-preserved areas
Premium `Layout.tsx`, `index.css`, `Dashboard.tsx`, `EmployeeList.tsx`, `FicheTechnique.tsx`, `FicheWord.ts`, `EvaluationObjectifs.tsx`, `NewEmployee.tsx`, `VisiteHygiene.tsx`, core medical/stat routes, plus other unmodified files. Automated hash gate extended on this audit branch.

### Confirmed differing source paths requiring a semantic and UX check
`employees.ts`, `routes/index.ts`, `telegram-sends.ts`, `App.tsx`, `FichePDF.tsx`, `TopBar.tsx`, `GenererFiches.tsx`, `HistoriqueHygiene.tsx`, `ImportExcel.tsx`, `PointageMensuel.tsx`, `RegistreActivites.tsx`, `SaisieExpertises.tsx`, `vite.config.ts`, `mockup-sandbox/vite.config.ts`.

### CI (previous integration head e02d0a351693e9b813a3171ade83a1e3d94fb742)
[GitHub Actions run 43910766398](https://github.com/Gladio9191/Gestion-M-dicale-SMT/actions/runs/43910766398) had **4 successful jobs**: source/preview gate, workspace Typecheck+Build+synthetic PDF/Word, synthetic PostgreSQL clinical import, Playwright browser smoke test of 11 routes. This does **not** establish pixel parity with original Replit.

### Release-blocking gaps in proof
- No side-by-side visual baseline captured from two live apps under identical synthetic datasets (desktop/mobile, all windows/modals/tables/charts).
- Original `/import` UI and `GenererFiches` differ; need per-control parity rather than only a smoke test.
- PDF rendering has not been pixel-compared; signature and opening are insufficient.
- Import retry/idempotence across **separate requests** and transactional rollback are not established. The imported route lacked an explicit transaction during this inspection.
- Telegram test sends and confidential recipient control not proven in a sandbox.
- Independent Express + Flask + PostgreSQL runtime startup, browser API integration and secure local backup/restore are not yet verified.
- Never test with real clinical files or real patients.

### Decision
**Not ready for 'identical to Replit' sign-off.** Keep PRs draft and main untouched until all criteria have executable evidence. Exact file-hash parity is a regression guard, not proof of behavioral equivalence.