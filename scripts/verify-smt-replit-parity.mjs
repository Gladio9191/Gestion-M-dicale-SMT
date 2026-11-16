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
 // Dashboard was intentionally adapted to tolerate unavailable/non-array API responses.
 // Original Replit blob: 02fefbfd73275d4e4e7b3db4fe5320c3cde28691
 // Modified preview-safe dashboard is tracked separately below.
 ["artifacts/fiche-medicale/src/pages/EmployeeList.tsx","9ba55f71f8bb1796e5b018120bd4215035639f4e"],
 ["artifacts/fiche-medicale/src/pages/FicheTechnique.tsx","214e173e5946c52497237f9d7867c55cba3ecc7d"],
 ["artifacts/fiche-medicale/src/components/FicheWord.ts","01a03fa1bcd43172564d72446061e4a35d1bde42"],
 ["artifacts/fiche-medicale/src/components/VisiteHygieneWord.ts","711907517054cf851583abc46089ad88e3be6f66"],
 ["artifacts/fiche-medicale/src/pages/EvaluationObjectifs.tsx","e58fcf0daa575faf82cce0205ead9a698d0f2b83"]
];
const read = path => readFileSync(new URL("../"+path,import.meta.url));
const dashboardPath="artifacts/fiche-medicale/src/pages/Dashboard.tsx";
const dashboardBytes=read(dashboardPath);
const dashboardSha=createHash("sha1").update("blob "+dashboardBytes.length+"\0").update(dashboardBytes).digest("hex");
assert.equal(dashboardSha,"fec74e400bf936d046e1064ec07eec9ccfc52296",
  "Changed approved dashboard safety patch: "+dashboardPath);
assert.match(dashboardBytes.toString(),/Array\.isArray\(aptitudeStats\)/);
/* Additional original ZIP source hashes: audited directly against user ZIP
 * 2026-11-16. Only paths proven byte-identical on the integration branch
 * are pinned here. Divergent files require functional tests, not false hashes. */
const additionalVerifiedOriginalFiles = [
  [
    "artifacts/api-server/src/routes/expertises-manual.ts",
    "72e3876bb75ceed8c18fc10ad0b7b65e42cf095e"
  ],
  [
    "artifacts/api-server/src/routes/health.ts",
    "c0a144626055cbc728d5d813d63b389ae1e82bee"
  ],
  [
    "artifacts/api-server/src/routes/hygiene.ts",
    "c85f5226e69c1e6c27f8dd979c4852c9d2ecca6b"
  ],
  [
    "artifacts/api-server/src/routes/medical.ts",
    "2c9854b9cfdc37ffd00cf9eb99ffbae65c1fe2b9"
  ],
  [
    "artifacts/api-server/src/routes/pointage.ts",
    "43757c3a7a1e9151b21a1ce57f17ee893b09e1af"
  ],
  [
    "artifacts/api-server/src/routes/registre.ts",
    "49caf2b09b38e85876ef5b9807ec123edb850c67"
  ],
  [
    "artifacts/api-server/src/routes/stats.ts",
    "dfccf68c7fdd850555ed1af24c46de11ff04e2ac"
  ],
  [
    "artifacts/fiche-medicale/src/pages/NewEmployee.tsx",
    "560780a4154532c0bd465d81c02f4628ad34999d"
  ],
  [
    "artifacts/fiche-medicale/src/pages/VisiteHygiene.tsx",
    "95301afaa03b679d6068ec6c415b0a113f19f865"
  ],
  [
    "artifacts/fiche-medicale/src/pages/not-found.tsx",
    "dba9f8316f8e796e2808090c4f6cf770e6b90c4a"
  ],
  [
    "artifacts/mockup-sandbox/src/App.tsx",
    "d9c2317f0d952aefe737473c57dc4afe359048a0"
  ],
  [
    "artifacts/mockup-sandbox/src/index.css",
    "53b9b028ddbeeaf35a42470b4bff8387e1d08a6b"
  ]
];
for (const [path, expected] of additionalVerifiedOriginalFiles) {
  const bytes = readFileSync(new URL("../" + path, import.meta.url));
  const actual = createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
  assert.equal(actual, expected, "Original Replit source regression: " + path);
}

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
console.log("PASS " + (roots.length + additionalVerifiedOriginalFiles.length) + " exact original Replit blob hashes + source integration invariants");
