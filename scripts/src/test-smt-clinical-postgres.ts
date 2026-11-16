/** Isolated PostgreSQL clinical-workflow contract tests using exclusively synthetic records.
 * DATABASE_URL MUST point to disposable CI PostgreSQL. Never execute on real SMT records. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const dbUrl = new URL("../../lib/db/src/index.ts",import.meta.url);
const { db, pool, employeesTable, visitesTable, restrictionsTable, expertisesManuellesTable } = await import(dbUrl.href) as Record<string, any>;
const routerUrl = new URL("../../artifacts/api-server/src/routes/replit-import-sheets.ts",import.meta.url);
const importRouter = (await import(routerUrl.href)).default;
const require = createRequire(new URL("../../artifacts/api-server/package.json",import.meta.url));
const express = require("express");
const { eq } = require("drizzle-orm");
const app = express();
app.use(express.json({limit:"2mb"}));
app.use("/api",importRouter);
const server=app.listen(0,"127.0.0.1");
await new Promise(resolve=>server.once("listening",resolve));
const address=server.address();
if (!address || typeof address==="string") throw Error("Failed to start test server");
const base="http://127.0.0.1:"+address.port;
async function send(sheets:unknown[]) {
 const response=await fetch(base+"/api/employees/import-sheets",{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sheets})
 });
 return {status:response.status,data:await response.json()};
}
try {
 const invalid=await send([{name:"Fake",type:"invalid",rows:[]}]);
 assert.equal(invalid.status,400,"Unsupported sheet types must be blocked");
 const personnel=await send([{name:"Personnel",type:"personnel",rows:[
   {Matricule:"DEMO-0001",Nom:"TEST",Direction:"DEMO-DX",Service:"DEMO-SERVICE",Fonction:"Technicien"},
   {Matricule:"DEMO-0002",Direction:"DEMO-DT"}
 ]}]);
 assert.equal(personnel.status,200,JSON.stringify(personnel));
 const emp=await db.select().from(employeesTable).where(eq(employeesTable.matricule,"DEMO-0001"));
 assert.equal(emp.length,1,"Unique matricule must identify one employee");
 assert.equal(emp[0].direction,"DEMO-DX");
 const visits=await send([{name:"VMS",type:"visites",rows:[
   {Matricule:"DEMO-0001",Dates:"01/10/2025","Type visite":"VM PÉRIODIQUE","Décision aptitude":"APTE", "Examens cliniques":"Examen synthétique"},
   {Matricule:"DEMO-0001",Dates:"2025-10-01","Type visite":"VM PÉRIODIQUE"},
   {Matricule:"DEMO-0002",Dates:"31/02/2026"}
 ]}]);
 assert.equal(visits.status,200,JSON.stringify(visits));
 const missingDate=await send([{name:"VMS",type:"visites",rows:[
   {Matricule:"DEMO-INVALID-009",Dates:"31/02/2026"}
 ]}]);
 assert.equal(missingDate.status,200);
 const ghost=await db.select().from(employeesTable).where(eq(employeesTable.matricule,"DEMO-INVALID-009"));
 assert.equal(ghost.length,0,"Invalid VM must never create a ghost employee");
 const saved=await db.select().from(visitesTable).where(eq(visitesTable.employeeId,emp[0].id));
 assert.equal(saved.length,1,"Duplicate date+matricule should not create two visits in one import");
 assert.equal(saved[0].dateVisite,"2025-10-01","French date should be normalized correctly");
 assert.equal(saved[0].decisionAptitude,"APTE");
 assert.equal(saved[0].examensCliniques,"Examen synthétique");
 const restricted=await send([{name:"Restrictions",type:"restrictions",rows:[
  {Matricule:"DEMO-0001","Nature RM":"TEMPORAIRE","Motif médical":"Motif fictif","Date RM":"02/10/2025"}
 ]}]);
 assert.equal(restricted.status,200,JSON.stringify(restricted));
 const rm=await db.select().from(restrictionsTable).where(eq(restrictionsTable.employeeId,emp[0].id));
 assert.equal(rm.length,1);
 assert.equal(rm[0].typeRestriction,"TEMPORAIRE");
 const campaign=await send([{name:"Campagne-DEMO",type:"campagne",rows:[
  {Matricule:"DEMO-0001",Resultat:"RAS FICTIF"}
 ]}]);
 assert.equal(campaign.status,200,JSON.stringify(campaign));
 const a=await db.select().from(expertisesManuellesTable).where(eq(expertisesManuellesTable.matricule,"DEMO-0001"));
 assert.equal(a.length,1);
 console.log("PASS synthetic PostgreSQL workflow: personnel, visites, duplicate, invalid date, restriction, campagne");
} finally {
 await new Promise(resolve=>server.close(resolve));
 await pool.end();
}
