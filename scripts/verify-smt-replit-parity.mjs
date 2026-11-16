/** Replit ZIP 2026-11-16: immutable appearance and document source parity gate.
 * Verified original ZIP SHA256: e484ca0e2f0f070bad0a44d3627ccba6e97f6c2552ba32102c07259b0618e6f5.
 * This test does NOT prove visual/browser/database parity. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const roots = [
 ["artifacts/fiche-medicale/public/favicon.svg","4373d3cd2f3dad5ca6f33b5cdcccc61edaef8eb7"],
 ["artifacts/fiche-medicale/public/opengraph.jpg","f1512ffde436f312ea597d1ca50236996851e30b"],
 ["artifacts/fiche-medicale/src/components/Layout.tsx","adc33b42e69576ec93b810cf53f06a471acc01ac"],
 ["artifacts/fiche-medicale/src/index.css","4083c4cc4121268c1262af5c6325296653aa30f1"],
 ["artifacts/fiche-medicale/src/pages/Dashboard.tsx","02fefbfd73275d4e4e7b3db4fe5320c3cde28691"],
 ["artifacts/fiche-medicale/src/pages/EmployeeList.tsx","9ba55f71f8bb1796e5b018120bd4215035639f4e"],
 ["artifacts/fiche-medicale/src/pages/FicheTechnique.tsx","214e173e5946c52497237f9d7867c55cba3ecc7d"],
 ["artifacts/fiche-medicale/src/components/FicheWord.ts","01a03fa1bcd43172564d72446061e4a35d1bde42"],
 ["artifacts/fiche-medicale/src/components/VisiteHygieneWord.ts","711907517054cf851583abc46089ad88e3be6f66"],
 ["artifacts/fiche-medicale/src/pages/EvaluationObjectifs.tsx","e58fcf0daa575faf82cce0205ead9a698d0f2b83"]
];
const read = path => readFileSync(new URL("../"+path,import.meta.url));
for(const [path, expected] of roots) {
 const bytes=read(path);
 const sha=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
 assert.equal(sha,expected,"Changed original Replit component: "+path);
}
const ui=read("artifacts/fiche-medicale/src/pages/ImportExcelMultiSheets.tsx").toString();
const router=read("artifacts/api-server/src/routes/index.ts").toString();
const app=read("artifacts/api-server/src/app.ts").toString();
const pdf=read("artifacts/fiche-medicale/src/components/FichePDF.tsx").toString();
const original=read("artifacts/fiche-medicale/src/pages/GenererFiches.tsx").toString();
assert.match(ui,/apiFetch\("\/api\/employees\/import-sheets"/);
assert.match(ui,/setConfirmed/);
assert.match(router,/router\.use\(replitImportSheetsRouter\)/);
assert.match(router,/router\.use\(replitTelegramRouter\)/);
assert.match(app,/app\.use\("\/api", requireOwner, requireOwnerCsrf, router\)/);
assert.match(original,/sendSingleViaTelegram/);
assert.match(original,/generateSingleWord/);
assert.match(original,/sendViaTelegram/);
assert.match(pdf,/FicheDocument/);
assert.match(read("artifacts/api-server/src/routes/replit-import-sheets.ts").toString(),/router\.post\("\/employees\/import-sheets"/);
assert.match(read("artifacts/api-server/src/routes/replit-telegram.ts").toString(),/router\.post\("\/employees\/:matricule\/send-telegram"/);
console.log("PASS 10 exact original Replit component/asset blob hashes + source integration invariants");
