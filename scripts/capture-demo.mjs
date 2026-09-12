// Captures real HTTP responses from the local production-build adapter.
// Run `npm run build` first. Starts its own loopback adapter; fictional data only.
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const server = spawn(process.execPath, ['scripts/local-demo.mjs'], {stdio:['ignore','pipe','pipe']});
try {
 await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Demo server did not start')),30000);
  server.stdout.on('data',chunk=>{if(chunk.toString().includes('ReviewLens local demo:')){clearTimeout(timeout);resolve();}});
  server.once('error',e=>{clearTimeout(timeout);reject(e);});
  server.once('exit',code=>{clearTimeout(timeout);reject(Error('Demo server exited: '+code));});
 });
const base = 'http://127.0.0.1:8788/api/workspace';
const datasetId = 'walkthrough-' + randomUUID();
const steps = [];
async function request(title, payload, query = '') {
 const response = await fetch(base + query, payload ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)} : undefined);
 const body = await response.json();
 assert.ok(response.ok, `${title}: HTTP ${response.status}`);
 steps.push({title,method:payload?'POST':'GET',request:payload||query,status:response.status,response:body});
 return body;
}
const imported = await request('Load fictional release reviews',{action:'demo',uploadId:datasetId});
assert.equal(imported.accepted,20);
const loaded = await request('Read the persisted dataset',null,'?dataset='+datasetId);
assert.equal(loaded.dataset.reviews.length,20);
const percentage = await request('Calculate a proportion',{action:'ask',datasetId,question:'What percentage of reviews are two-star?',searchMode:'basic'});
assert.equal(percentage.metric.numerator,loaded.dataset.reviews.filter(r=>r.rating===2).length);
assert.equal(percentage.metric.denominator,20);assert.equal(percentage.metric.value,20);
const ranking = await request('Rank complaints across the corpus',{action:'ask',datasetId,question:'What negative do most people point to?',searchMode:'basic'});
assert.ok(ranking.citations.length);
for(const citation of ranking.citations){ const source=loaded.dataset.reviews.find(r=>r.id===citation.reviewId||r.id===citation.id); assert.ok(source,'Cited review exists'); assert.equal(citation.text,source.text,'Citation matches stored source exactly'); }
const scoped = await request('Inspect EU login evidence',{action:'ask',datasetId,question:'What are EU customers saying about login?',searchMode:'basic'});
assert.equal(scoped.count,8);assert.ok(scoped.citations.length);assert.ok(scoped.citations.every(c=>c.region==='EU'));
const history = await request('Verify saved answer history',null,'?dataset='+datasetId);
assert.ok(history.history.some(a=>a.id===percentage.id));assert.ok(history.history.some(a=>a.id===ranking.id));
await mkdir('docs/demo',{recursive:true});
await writeFile('docs/demo/captured-workflow.json',JSON.stringify({captured_at:new Date().toISOString(),scope:'Actual local production-build HTTP requests. Fictional built-in reviews. Basic analysis only. No browser UI or model inference is claimed.',steps},null,2)+'\n');
console.log(JSON.stringify({percentage,ranking,scoped},null,2));

} finally { server.kill("SIGTERM"); }
