/**
 * Static server for the on-device harness.
 *
 * Serves the shipped public/ worker and the harness page from ONE origin, so
 * `new Worker('/semantic-worker.js', { type: 'module' })` loads exactly as it does in the
 * app. Model and runtime still come from Hugging Face and jsDelivr over the network - that
 * is the point of the exercise.
 *
 *   node scripts/device-harness/serve.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const port = Number(process.argv[2] || 8799);
const root = process.cwd();

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

// Harness page at /, shipped worker files at /*.js, fixtures under /data/.
const routes = {
  '/': 'scripts/device-harness/index.html',
  '/experiment': 'scripts/device-harness/experiment.html',
  '/semantic-worker.js': 'public/semantic-worker.js',
  '/semantic-core.js': 'public/semantic-core.js',
  '/data/ReviewLens_Validation_Reviews.json':
    'examples/validation/ReviewLens_Validation_Reviews.json',
  '/data/golden-set.json': 'eval/golden-set.json',
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const target = routes[url.pathname];
  if (!target) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const body = await readFile(path.join(root, target));
    res.writeHead(200, {
      'Content-Type': types[path.extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
}).listen(port, '127.0.0.1', () => {
  console.log('Device harness on http://127.0.0.1:' + port);
});
