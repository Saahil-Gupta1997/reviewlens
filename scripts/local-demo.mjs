// Single-user loopback demo only. Never use this identity adapter in production.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { Miniflare } from 'miniflare';
const root=process.cwd(), state=path.join(root,'.reviewlens-local'), origin='http://127.0.0.1:8788',allowedHosts=new Set(['127.0.0.1:8788','localhost:8788']);
await mkdir(state,{recursive:true});
const secretPath=path.join(state,'encryption-secret');
try{await writeFile(secretPath,randomBytes(48).toString('base64url'),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
const types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
async function asset(request){
 let relative;try{relative=decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '');}catch{return new Response('Not found',{status:404});}const base=path.join(root,'dist/client');
 const file=path.resolve(base,relative);if(!file.startsWith(base+path.sep))return new Response('Not found',{status:404});
 try{return new Response(await readFile(file),{headers:{'Content-Type':types[path.extname(file)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}
}
// Miniflare must be handed every server module explicitly. Using scriptPath with
// modulesRules leaves vinext's dynamic imports unresolved and fails with
// ERR_MODULE_DYNAMIC_SPEC on Node 25+. tests/rendered-html.test.mjs does the same.
const serverRoot=path.resolve('dist/server');
const serverFiles=[];
async function collect(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await collect(file);else if(entry.name.endsWith('.js'))serverFiles.push(file);}}
await collect(serverRoot);
const serverEntry=path.join(serverRoot,'index.js');
const modules=[serverEntry,...serverFiles.filter(f=>f!==serverEntry)].map(file=>({type:'ESModule',path:file}));
const mf=new Miniflare({modules,
 compatibilityDate:'2026-05-01',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'reviewlens-local'},d1Persist:path.join(state,'d1'),
 bindings:{KEY_ENCRYPTION_SECRET:await readFile(secretPath,'utf8'),IDENTITY_GATEWAY:'local-loopback-single-user'},serviceBindings:{ASSETS:asset}});
const db=await mf.getD1Database('DB');
await db.prepare('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)').run();
const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));
for(const entry of journal.entries){
 if(await db.prepare('SELECT name FROM local_migrations WHERE name=?').bind(entry.tag).first())continue;
 const sql=await readFile(`drizzle/${entry.tag}.sql`,'utf8');
 await db.batch([...sql.split('--> statement-breakpoint').filter(s=>s.trim()).map(s=>db.prepare(s)),db.prepare('INSERT INTO local_migrations(name) VALUES(?)').bind(entry.tag)]);
}
const server=createServer(async(req,res)=>{
 try{
  const host=req.headers.host||'';if(!allowedHosts.has(host)){res.writeHead(403);res.end('Local demo accepts same-origin loopback requests only.');return;}const requestOrigin=`http://${host}`;
  if(req.headers.origin){let suppliedOrigin='';try{suppliedOrigin=new URL(req.headers.origin).origin;}catch{res.writeHead(403);res.end('Local demo accepts a valid same-origin loopback request only.');return;}if(suppliedOrigin!==requestOrigin){res.writeHead(403);res.end('Local demo accepts same-origin loopback requests only.');return;}}
  const url=new URL(req.url,requestOrigin);if(url.origin!==requestOrigin){res.writeHead(403);res.end();return;}
  let result;
  if(!url.pathname.startsWith('/api/')&&url.pathname!=='/')result=await asset(new Request(url));
  if(!result||result.status===404){
   let size=0;const pieces=[];for await(const chunk of req){size+=chunk.length;if(size>3*1024*1024){res.writeHead(413);res.end();return;}pieces.push(chunk);}
   const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v&&!k.startsWith('oai-'))headers.set(k,Array.isArray(v)?v.join(','):v);
   headers.set('oai-authenticated-user-id','local-demo-user');
   result=await mf.dispatchFetch(url.href,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(pieces)});
  }
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Local demo request failed. Check the terminal and retry.');}
});
server.listen(8788,'127.0.0.1',()=>console.log(`ReviewLens local demo: ${origin}\nSingle user, no login. Do not expose this server to a network. Ctrl+C to stop.`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close();mf.dispose().finally(()=>process.exit(0));});
