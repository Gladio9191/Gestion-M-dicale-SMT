'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('medical visit update uses allowlisted schema instead of user-controlled mass assignment',()=>{
  const source=read('artifacts/api-server/src/routes/medical.ts');
  assert.match(source,/insertVisiteSchema\.omit\(\{\s*employeeId:\s*true\s*\}\)\.partial\(\)\.strict\(\)/);
  assert.match(source,/UpdateVisiteBody\.safeParse\(req\.body\)/);
  assert.match(source,/\.set\(parsed\.data\)/);
  assert.doesNotMatch(source,/\.set\(req\.body\)/);
});
test('Express and Flask do not advertise wildcard cross-origin medical access',()=>{
  const expressSource=read('artifacts/api-server/src/app.ts');
  const flaskSource=read('artifacts/fiche-engine/app.py');
  assert.doesNotMatch(expressSource,/app\.use\(cors\(\)\)/);
  assert.match(expressSource,/SMT_ALLOWED_ORIGINS/);
  assert.doesNotMatch(flaskSource,/CORS\(app,\s*origins\s*=\s*["']\*["']\)/);
  assert.match(flaskSource,/is_loopback_peer\(request\.remote_addr\)/);
});
test('sensitive exception text is not included verbatim in client 500 responses',()=>{
  const source=read('artifacts/fiche-engine/app.py');
  assert.doesNotMatch(source,/return jsonify\(\{"error": str\(e\)\}\), 500/);
});
