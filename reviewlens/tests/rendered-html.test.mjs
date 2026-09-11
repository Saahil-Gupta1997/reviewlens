import assert from 'node:assert/strict';
import test from 'node:test';
import { Miniflare } from 'miniflare';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
test('production worker renders the ReviewLens shell and serves private API',async()=>{
 const mf=new Miniflare({
  modules:true,
  modulesRules:[{type:"ESModule",include:["**/*.js"]}],
  scriptPath:'dist/server/index.js',
  compatibilityDate:'2026-05-01',
  compatibilityFlags:['nodejs_compat'],
  d1Databases:{DB:'production-smoke'},
  serviceBindings:{ASSETS:async request=>{
   try{const p=new URL(request.url).pathname;return new Response(await readFile(path.join('dist/client',p)));}
   catch{return new Response('Not found',{status:404});}
  }}
 });
 try{
  const r=await mf.dispatchFetch('http://reviewlens.test/',{headers:{accept:'text/html'}});
  const html=await r.text();assert.equal(r.status,200);assert.match(html,/From reviews to reasons/);assert.match(html,/ReviewLens/);assert.doesNotMatch(html,/Starter Project|codex-preview/);
  const denied=await mf.dispatchFetch('http://reviewlens.test/api/workspace');assert.equal(denied.status,401);
 }finally{await mf.dispose();}
});
