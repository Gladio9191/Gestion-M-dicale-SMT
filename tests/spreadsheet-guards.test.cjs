'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const file='artifacts/fiche-medicale/src/lib/spreadsheet-guards.ts';
const source=fs.readFileSync(path.join(root,file),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const ctx={exports:{}};
vm.createContext(ctx);
vm.runInContext(js,ctx);
const {spreadsheetUploadError,MAX_SPREADSHEET_BYTES}=ctx.exports;
test('valid Excel and CSV files are accepted below the size cap',()=>{
  assert.equal(spreadsheetUploadError({name:'fictional.xlsx',size:4096}),null);
  assert.equal(spreadsheetUploadError({name:'sample.CSV',size:128}),null);
});
test('extension and size are checked prior to browser parsing',()=>{
  assert.ok(spreadsheetUploadError({name:'untrusted.exe',size:100}));
  assert.ok(spreadsheetUploadError({name:'blank.xlsx',size:0}));
  assert.ok(spreadsheetUploadError({name:'large.xlsx',size:MAX_SPREADSHEET_BYTES+1}));
});
test('both interfaces call the shared guard before using SheetJS',()=>{
  for(const pathPart of ['ImportExcel.tsx','GenererFiches.tsx']){
    const src=fs.readFileSync(path.join(root,'artifacts/fiche-medicale/src/pages',pathPart),'utf8');
    assert.match(src,/spreadsheetUploadError\(file\)/);
    assert.match(src,/sheetRows:\s*MAX_SPREADSHEET_ROWS\s*\+\s*1/);
  }
});
