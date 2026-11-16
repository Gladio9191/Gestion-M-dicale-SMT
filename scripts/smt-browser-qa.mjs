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
   if(url.pathname==="/api/employees")
     return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({employees:[],total:0,page:1,limit:20})});
   return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({employees:[],visites:[],items:[],data:[],total:0,statistics:[],stats:[]})});
 });
 const routes=["/","/employees","/registre","/generer","/import","/expertises","/hygiene/new","/hygiene/historique","/evaluation","/pointage","/import/multi-feuilles"];
 for(const route of routes) {
   await page.goto(base+route,{waitUntil:"domcontentloaded"});
   await page.locator("aside").waitFor({state:"visible",timeout:12000});
   await page.locator("main").waitFor({state:"visible",timeout:12000});
   assert.ok((await page.locator("main").innerText()).trim().length>0,"Empty route "+route);
   assert.ok(await page.getByText("Tableau de bord",{exact:true}).count()>0,"Missing premium sidebar "+route);
   await page.waitForTimeout(250);
 }
 await page.goto(base+"/import/multi-feuilles",{waitUntil:"domcontentloaded"});
 assert.ok(await page.getByText("Import Excel — multi-feuilles",{exact:false}).count()>0);
 await page.screenshot({path:"/tmp/smt-browser-preview.png",fullPage:true});
 assert.deepEqual(errors,[],"Unhandled React browser runtime errors");
 console.log("PASS synthetic browser navigation "+routes.length+" routes, original premium sidebar, import screen, no JS page errors");
} finally { await browser.close(); }
