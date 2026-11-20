# Security audit — Gestion Médicale SMT (2026-11-20)

Scope: static Python/Express/React code review, mock HTTP regression tests, Node build, dependency audit on `audit/security-hardening-20261120`. No real clinical data or production credentials accessed. This is NOT a penetration test.

## Fixed and verified by CI
- Flask fiche-engine restricted to local proxy callers, origin allowlist, 32MiB upload cap, redacted error responses, prior in-memory database preserved on failed import.
- Telegram target must match `FICHE_TELEGRAM_ALLOWED_CHAT_IDS`, otherwise refused.
- Express wildcard CORS removed; opt-in `SMT_ALLOWED_ORIGINS`, privacy headers and body size cap.
- Medical visit PUT update validates allowlisted fields and rejects `employeeId` mass assignment.
- Browser Excel inputs check extension, file size (20 MiB) and row count (20,000), catch parser failures. These limits are mitigation, NOT a fix for SheetJS vulnerabilities.
- Patched and locked safe transitive versions: proxy-addr 2.0.8, body-parser 2.4.0, path-to-regexp 8.4.2, picomatch 2.3.2, nanoid 5.1.16.
- Code checks: https://github.com/Gladio9191/Gestion-M-dicale-SMT/actions/runs/44815125187 (passed).
- Security dependency scan: https://github.com/Gladio9191/Gestion-M-dicale-SMT/actions/runs/44815125213 (FAILED: 8 advisories, 3 high, 5 moderate). Before patches 16 advisories, including 1 critical.

## HIGH / CRITICAL outstanding engineering issues — block production approval
1. **No demonstrated authentication/authorization on Express medical routes.** Restricting CORS is NOT authentication. Need an institution-approved access control and server-side RBAC/session architecture before any public exposure.
2. **Unpatched SheetJS xlsx 0.18.5 (2 high advisories):** prototype pollution and ReDoS. Need reviewed migration to supported version/vendor or different Excel parser; size restrictions do not eliminate vulnerability.
3. **Vulnerable Zod version (<4.6.6; 1 high advisory)**: requires API compatibility tests and major-version migration.
4. The repository is public and includes 18 `attached_assets` files (images, Word, spreadsheet, text). Content classification not completed. **Cannot confirm** whether sensitive information is exposed; review authorization and repository history before public use.
5. User/role permissions, encryption of the medical DB and backups, actual host network exposure, remote security, and integration/pentesting remain unverified.

Do not merge/deploy to production. Keep this Pull Request as draft; actual decisions about auth and data classification must be made before release.
