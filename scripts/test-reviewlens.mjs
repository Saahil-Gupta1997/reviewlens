import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('work',{recursive:true});
for(const name of ['intelligence','ingest','evaluate','device-answer','provider-errors'])await build({entryPoints:[`lib/reviewlens/${name}.ts`],bundle:true,platform:'node',format:'esm',outfile:`work/${name}.mjs`});
await writeFile('work/api-entry.ts',`import {GET,POST} from '../app/api/workspace/route';export default {fetch(request:Request){return request.method==='GET'?GET(request):POST(request);}};`);
await build({entryPoints:['work/api-entry.ts'],bundle:true,platform:'browser',format:'esm',external:['cloudflare:workers'],outfile:'work/api-worker.mjs'});
const r=spawnSync(process.execPath,['--test','tests/reviewlens-engine.test.mjs','tests/reviewlens-api.test.mjs','tests/device-search.test.mjs','tests/eval-timing.test.mjs'],{stdio:'inherit'});process.exit(r.status??1);
