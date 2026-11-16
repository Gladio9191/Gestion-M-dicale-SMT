/** Synthetic-only PDF and DOCX clinical export regression. No private data or deployment. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const appRequire = createRequire(new URL("../../artifacts/fiche-medicale/package.json",import.meta.url));
const React = appRequire("react");
// tsx CLI uses the classic JSX transform; Vite uses its configured React JSX runtime.
Object.assign(globalThis,{React});
const { renderToBuffer } = appRequire("@react-pdf/renderer");
const pdfModule = await import(new URL("../../artifacts/fiche-medicale/src/components/FichePDF.tsx",import.meta.url).href);
const wordModule = await import(new URL("../../artifacts/fiche-medicale/src/components/FicheWord.ts",import.meta.url).href);
const fiche = {
 employee:{matricule:"DEMO-CLINICAL-0001",nom:"FICTIF",prenom:"TEST",age:39,direction:"DEMO",service:"SYNTHETIQUE",posteActuel:"Technicien"},
 antecedents:[{type:"PROFESSIONNEL",description:"Aucun antécédent réel – test synthétique"}],
 restrictions:[{typeRestriction:"TEMPORAIRE",motifMedical:"Restriction fictive sans patient"}],
 expertises:[{typeExpertise:"ORL",dateExpertise:"2026-11-16",resultat:"Résultat purement fictif"}],
 visites:[{dateVisite:"2026-11-16",typeVisite:"VM PERIODIQUE",risque:"Bruit synthétique",examensCliniques:"Examen de démonstration",decisionAptitude:"APTE"}],
 notes:[{sheet:"DEMO",label:"Observation",value:"Donnée non médicale"}],
};
const pdfBuffer = await renderToBuffer(React.createElement(pdfModule.FicheDocument,{fiches:[fiche]}));
assert.ok(Buffer.isBuffer(pdfBuffer));
assert.ok(pdfBuffer.length > 1000);
assert.equal(pdfBuffer.subarray(0,5).toString("ascii"),"%PDF-");
const wordBlob = await wordModule.generateWordBlob([fiche]);
assert.ok(wordBlob.size > 500);
const wordBytes = Buffer.from(await wordBlob.arrayBuffer());
assert.equal(wordBytes.subarray(0,2).toString("ascii"),"PK");
console.log("PASS synthetic fiche PDF magic bytes + DOCX ZIP magic bytes; no private medical data");
