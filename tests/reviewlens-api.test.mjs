import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
const handlers=new Map();
const provider={intercept:({path})=>({reply:(status,handler)=>{handlers.set(path,{status,handler});return {persist(){}};}})};
const mf=new Miniflare({modules:true,outboundService:async request=>{assert.equal(new URL(request.url).origin,'https://api.openai.com');assert.equal(request.method,'POST');const mock=handlers.get(new URL(request.url).pathname);assert.ok(mock,'Unexpected external request');return Response.json(mock.handler({body:await request.text()}),{status:mock.status});},scriptPath:'work/api-worker.mjs',compatibilityDate:'2026-05-01',d1Databases:{DB:'reviewlens-test'},bindings:{KEY_ENCRYPTION_SECRET:'test-only-encryption-secret-not-for-production'},log:undefined});
const db=await mf.getD1Database('DB');
for(const sql of (await readFile('drizzle/0000_eager_lucky_pierre.sql','utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
after(()=>mf.dispose());
async function request(action,owner='alice',query=''){const r=await mf.dispatchFetch('http://reviewlens.test/api/workspace'+query,{method:action?'POST':'GET',headers:{...(owner?{'oai-authenticated-user-id':owner}:{}),...(action?{'Content-Type':'application/json'}:{})},body:action?JSON.stringify(action):undefined});return {status:r.status,body:await r.json()};}
async function rawPost(body,owner='alice'){const r=await mf.dispatchFetch('http://reviewlens.test/api/workspace',{method:'POST',headers:{'oai-authenticated-user-id':owner,'Content-Type':'application/json'},body});return {status:r.status,body:await r.json()};}
let id='integration-demo';
test('private workspace rejects unauthenticated access',async()=>{assert.equal((await request(undefined,'')).status,401);});
test('demo import is durable and idempotent',async()=>{const a=await request({action:'demo',uploadId:id});assert.equal(a.status,201);assert.equal(a.body.accepted,20);assert.equal((await request({action:'demo',uploadId:id})).status,200);const d=await request(undefined,'alice','?dataset='+id);assert.equal(d.body.dataset.reviews.length,20);});
test('ownership blocks reads, answers, deletions, and upload-id collisions',async()=>{for(const action of [undefined,{action:'ask',datasetId:id,question:'Most common complaints?'},{action:'delete',datasetId:id}])assert.equal((await request(action,'bob',action?'':'?dataset='+id)).status,404);assert.equal((await request({action:'demo',uploadId:id},'bob')).status,409);assert.deepEqual((await request(undefined,'bob')).body.datasets,[]);});
test('core question produces prevalence and stored source evidence',async()=>{const r=await request({action:'ask',datasetId:id,question:'What negative do most people point to?'});assert.equal(r.status,200);assert.equal(r.body.intent,'Complaint ranking');assert.ok(r.body.findings.length);assert.equal(r.body.count,20);assert.ok(r.body.citations.length);const h=await request(undefined,'alice','?dataset='+id);assert.equal(h.body.history.length,1);assert.equal(h.body.history[0].id,r.body.id);assert.equal((await request({action:'feedback',datasetId:id,answerId:r.body.id,feedback:'useful'})).status,200);});
test('EU natural language filters are enforced',async()=>{const r=await request({action:'ask',datasetId:id,question:'What are EU customers saying about login?'});assert.equal(r.body.count,8);assert.ok(r.body.citations.length);assert.ok(r.body.citations.every(x=>x.region==='EU'));});
test('unknown and malformed inputs fail without server errors',async()=>{assert.equal((await request({action:'ask',datasetId:id,question:''})).status,400);assert.equal((await request({action:'import',filename:'bad.csv',name:'Bad',content:'review_text,rating\nbad,comma,1',mapping:{text:'review_text',rating:'rating'}})).status,400);});
test('null request bodies and non-string identifiers return validation errors',async()=>{assert.equal((await rawPost('null')).status,400);assert.equal((await request({action:'feedback',datasetId:id,answerId:{},feedback:'useful'})).status,400);assert.equal((await request({action:'delete',datasetId:{}})).status,400);});
test('invalid API filter values are rejected',async()=>{
 for(const filters of [{rating:'six'},{rating:'6'},{from:'2026-02-30'},{to:'tomorrow'},{from:'2026-09-02',to:'2026-09-01'}]){
  const r=await request({action:'ask',datasetId:id,question:'How many reviews?',filters});assert.equal(r.status,400,JSON.stringify(filters));
 }
});
test('partial import preserves valid reviews',async()=>{const r=await request({action:'import',uploadId:'partial-test',filename:'partial.csv',name:'Partial',content:'review_text,rating\n"Great checkout, works well",5\nBroken login,NaN',mapping:{text:'review_text',rating:'rating'}});assert.equal(r.status,201);assert.equal(r.body.accepted,1);assert.equal(r.body.issues.length,1);});
test('API key is encrypted and never returned',async()=>{const key='sk-test-key-for-integration-only-012345';assert.equal((await request({action:'settings',key,model:'gpt-4.1-mini'})).status,200);const stored=await db.prepare('SELECT encrypted_key FROM settings WHERE owner=?').bind('alice').first();assert.ok(stored.encrypted_key);assert.ok(!stored.encrypted_key.includes(key));const r=await request();assert.equal(r.body.settings.configured,true);assert.ok(!JSON.stringify(r.body).includes(key));await request({action:'settings',removeKey:true});assert.equal((await request()).body.settings.configured,false);});
test('an undecryptable saved key does not lock the workspace',async()=>{await db.prepare("UPDATE settings SET encrypted_key='not-valid-ciphertext' WHERE owner=?").bind('alice').run();const r=await request();assert.equal(r.status,200);assert.equal(r.body.settings.configured,true);assert.equal(r.body.settings.keyInvalid,true);assert.equal((await request({action:'index',datasetId:id})).status,400);await request({action:'settings',removeKey:true});});
test('empty scopes do not invoke a paid provider',async()=>{const r=await request({action:'ask',datasetId:id,question:'What are customers saying?',filters:{region:'MISSING'},useAI:true,searchMode:'openai'});assert.equal(r.status,200);assert.equal(r.body.status,'limited');assert.equal((await request()).body.usage,null);});
test('acceptance evaluation runs and is saved',async()=>{const r=await request({action:'evaluate'});assert.equal(r.status,200);assert.equal(r.body.passed,r.body.total);assert.equal((await request()).body.evaluation.id,r.body.id);});
test('evaluation history is bounded and stale imports are cleaned up',async()=>{for(let i=0;i<11;i++)assert.equal((await request({action:'evaluate'})).status,200);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM evaluations WHERE owner=?').bind('alice').first()).n,10);await db.prepare("INSERT INTO datasets (id,owner,name,filename,created_at,count,rejected,duplicates,method,status) VALUES ('stale-import','alice','Stale','x.csv','2000-01-01T00:00:00.000Z',0,0,0,'rules-v2','processing')").run();assert.equal((await request()).status,200);assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM datasets WHERE id='stale-import'").first()).n,0);});
test('semantic indexing is resumable and AI citations are validated',async()=>{
 await request({action:'settings',key:'sk-test-key-for-integration-only-012345'});
 provider.intercept({path:'/v1/embeddings',method:'POST'}).reply(200,options=>{const body=JSON.parse(options.body);return {data:body.input.map((_,i)=>({index:i,embedding:Array(256).fill(0).map((_,j)=>j===0?1:0)})),usage:{total_tokens:20}};}).persist();
 const indexed=await request({action:'index',datasetId:id});assert.equal(indexed.status,200);assert.equal(indexed.body.indexed,20);assert.equal((await request({action:'index',datasetId:id})).body.batch,0);
 provider.intercept({path:'/v1/chat/completions',method:'POST'}).reply(200,options=>{const body=JSON.parse(options.body),input=JSON.parse(body.messages[1].content),r=input.reviews.find(x=>/login/i.test(x.text))||input.reviews[0];return {choices:[{message:{content:JSON.stringify({findings:[{reviewId:r.id,quote:r.text,claim:'This review discusses its product experience.'},{reviewId:r.id,quote:'This quote does not exist in any review.',claim:'Unsupported'}]})}}],usage:{prompt_tokens:100,completion_tokens:30}};});
 const a=await request({action:'ask',datasetId:id,question:'What are EU customers saying about login?',useAI:true});assert.equal(a.status,200);assert.equal(a.body.intent,'Semantic review evidence');assert.equal(a.body.findings.length,1);assert.ok(a.body.citations.every(r=>r.region==='EU'));assert.equal(a.body.model,'gpt-4.1-mini');
 const usage=(await request()).body.usage;assert.ok(usage.input_tokens>=140);assert.equal(usage.output_tokens,30);
});
test('daily budget blocks provider requests before an external call',async()=>{
 await db.prepare('UPDATE usage SET requests=100 WHERE owner=?').bind('alice').run();
 const r=await request({action:'ask',datasetId:id,question:'What are customers saying about login?',useAI:true});assert.equal(r.status,429);
});
test('device evidence works without a paid key or budget and is saved with validated scope',async()=>{
 await request({action:'settings',removeKey:true});
 const data=(await request(undefined,'alice','?dataset='+id)).body.dataset.reviews;
 const eu=data.find(r=>r.region==='EU'),na=data.find(r=>r.region==='NA');
 const a=await request({action:'ask',datasetId:id,question:'What are EU customers saying about login?',searchMode:'device',useAI:true,
 deviceHits:[{reviewId:eu.id,quote:eu.text.slice(0,100)},{reviewId:na.id,quote:na.text.slice(0,100)}]});
 assert.equal(a.status,200);assert.equal(a.body.intent,'On-device semantic evidence');assert.equal(a.body.citations.length,1);
 assert.equal(a.body.citations[0].region,'EU');assert.equal((await request()).body.usage.requests,100);
 assert.ok((await request(undefined,'alice','?dataset='+id)).body.history.some(h=>h.id===a.body.id));
});
test('rating conditions remain deterministic through every answer mode',async()=>{
 const data=(await request(undefined,'alice','?dataset='+id)).body.dataset.reviews;
 for(const searchMode of ['basic','device','openai'])for(const [question,expected] of [
  ['How many reviews are not five-star?',data.filter(r=>r.rating!==null&&r.rating!==5).length],
  ['How many reviews are three-star or five-star?',data.filter(r=>r.rating===3||r.rating===5).length]
 ]){
  const a=await request({action:'ask',datasetId:id,question,searchMode,useAI:searchMode==='openai'});
  assert.equal(a.status,200);assert.equal(a.body.metric.value,expected);assert.equal(a.body.intent,'Dataset calculation');
 }
 assert.equal((await request()).body.usage.requests,100);
});
test('deletion cascades to reviews and answers',async()=>{assert.equal((await request({action:'delete',datasetId:id})).status,200);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM reviews WHERE dataset_id=?').bind(id).first()).n,0);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM answers WHERE dataset_id=?').bind(id).first()).n,0);assert.equal((await request(undefined,'alice','?dataset='+id)).status,404);});
