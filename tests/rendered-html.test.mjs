import assert from 'node:assert/strict';
import test from 'node:test';
import { Miniflare } from 'miniflare';
import { readFile,readdir } from 'node:fs/promises';
import path from 'node:path';
test('production worker renders the ReviewLens shell and serves private API',async()=>{
 const serverRoot=path.resolve('dist/server');const files=[];async function collect(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await collect(file);else if(entry.name.endsWith('.js'))files.push(file);}}await collect(serverRoot);
 const entry=path.join(serverRoot,'index.js');const modules=[entry,...files.filter(file=>file!==entry)].map(file=>({type:'ESModule',path:file}));
 const mf=new Miniflare({
  modules,
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
  assert.match(r.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);assert.equal(r.headers.get('x-frame-options'),'DENY');assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.ok(r.headers.get('referrer-policy'));
  const denied=await mf.dispatchFetch('http://reviewlens.test/api/workspace');assert.equal(denied.status,401);
 }finally{await mf.dispose();}
});
