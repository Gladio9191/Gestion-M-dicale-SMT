'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const lock=fs.readFileSync(path.join(root,'pnpm-lock.yaml'),'utf8');
const config=fs.readFileSync(path.join(root,'pnpm-workspace.yaml'),'utf8');
const required=[
  ['proxy-addr','2.0.8'],
  ['picomatch','2.3.2'],
  ['path-to-regexp','8.4.2'],
  ['body-parser','2.4.0'],
  ['nanoid','5.1.16'],
];
test('reviewed transitive patches are captured in the locked install',()=>{
  for(const [name,version] of required){
    assert.ok(lock.includes(name+'@'+version),name+' '+version+' missing from lockfile');
  }
});
test('patch override requirements remain explicit',()=>{
  for(const selector of ['express>proxy-addr','express>body-parser',
    'router>path-to-regexp','micromatch>picomatch','docx>nanoid']){
    assert.ok(config.includes('"'+selector+'"'),selector+' override removed');
  }
});
