/** Synthetic browser smoke checks; no Replit/production access and no patient records. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { chromium }=require("/tmp/smt-playwright/node_modules/playwright");
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const base="http://127.0.0.1:18701";
const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on("pageerror",error=>errors.push(error.message));
 await page.route("**/api/**",async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==="/api/auth/session")
     return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({authenticated:true,csrfToken:"a".repeat(64)})});
   if(["/api/stats/services","/api/stats/recent-visites","/api/stats/aptitude","/api/services"].includes(url.pathname))
     return route.fulfill({status:200,contentType:"application/json",body:"[]"});
   if(url.pathname==="/api/stats/overview")
     return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({totalEmployees:0,totalVisites:0,visitesThisYear:0,inapteCount:0,restrictionsCount:0,servicesCount:0})});
   if(url.pathname==="/api/pointage")
     return route.fulfill({status:200,contentType:"application/json",body:"[]"});
   if(url.pathname==="/api/registre-activites")
     return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({rows:[],total:0,directions:[]})});
   if(url.pathname==="/api/employees")
     return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({employees:[],total:0,page:1,limit:20})});
   return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"Synthetic browser test: service intentionally unavailable"})});
 });
 const routes=["/","/employees","/registre","/generer","/import","/expertises","/hygiene/new","/hygiene/historique","/evaluation","/pointage","/import/multi-feuilles"];
 for(const route of routes) {
   console.log("Checking browser path:",route);
   await page.goto(base+route,{waitUntil:"domcontentloaded"});
   try {
     await page.locator("aside").waitFor({state:"visible",timeout:12000});
     await page.locator("main").waitFor({state:"visible",timeout:12000});
   } catch (error) {
     console.error("Route failed:",route,"title:",await page.title(),"text:",(await page.locator("body").innerText()).slice(0,1000),"page errors:",errors);
     throw error;
   }
   assert.ok((await page.locator("main").innerText()).trim().length>0,"Empty route "+route);
   assert.ok(await page.getByText("Tableau de bord",{exact:true}).count()>0,"Missing premium sidebar "+route);
   await page.waitForTimeout(250);
 }
 await page.goto(base+"/",{waitUntil:"domcontentloaded"});
 assert.ok(await page.getByText("Aperçu visuel uniquement",{exact:false}).count()>0,
   "The Vercel Preview build must visibly label synthetic UI-only mode");
 await page.goto(base+"/import/multi-feuilles",{waitUntil:"domcontentloaded"});
 assert.ok(await page.getByText("Import Excel — multi-feuilles",{exact:false}).count()>0);
 const appRequire=createRequire(new URL("../artifacts/fiche-medicale/package.json",import.meta.url));
 const XLSX=appRequire("xlsx");
 const workbook=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet([
   {Matricule:"DEMO-0001",Dates:"01/10/2025","Type visite":"VM PERIODIQUE"},
   {Matricule:"DEMO-0001",Dates:"31/02/2026"}
 ]),"VMS 2026");
 const workbookBytes=XLSX.write(workbook,{type:"buffer",bookType:"xlsx"});
 await page.locator('input[type="file"]').setInputFiles({
   name:"synthetic-clinical.xlsx",
   mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
   buffer:workbookBytes
 });
 await page.getByText("Feuilles détectées",{exact:true}).waitFor({timeout:12000});
 assert.ok(await page.getByText("date(s) non interprétable(s)",{exact:false}).count()>0,
   "Browser Excel preview must identify invalid dates");
 await page.screenshot({path:"/tmp/smt-browser-preview.png",fullPage:true});
 // Regression: a frontend-only Vite preview returns HTML/non-array data for
 // missing /api/stats endpoints. Dashboard must not crash to a blank page.
 await page.route("**/api/stats/**",route=>route.fulfill({
   status:200,contentType:"application/json",body:JSON.stringify({error:"Backend not connected"})
 }));
 await page.goto(base+"/",{waitUntil:"domcontentloaded"});
 await page.getByText("serveur de données non connecté",{exact:false}).waitFor({timeout:12000});
 assert.ok(await page.getByText("Tableau de bord",{exact:true}).count()>0,
   "Dashboard remains visible with non-array API responses");
 assert.deepEqual(errors,[],"Unhandled React browser runtime errors");
 console.log("PASS synthetic browser navigation "+routes.length+" routes, original premium sidebar, import screen, no JS page errors");
} finally { await browser.close(); }
