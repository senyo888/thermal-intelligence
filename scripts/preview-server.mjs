// SPDX-License-Identifier: GPL-3.0-only
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.TI_PREVIEW_PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid TI_PREVIEW_PORT.');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const route = path === '/' ? '/tests/fixtures/index.html' : path;
    if (!['GET', 'HEAD'].includes(request.method) || !(/^\/tests\/fixtures\/[a-z0-9/-]+\.(html|js|css)$/.test(route) || route === '/dist/thermal-intelligence.js')) {
      response.writeHead(404); response.end('Not found'); return;
    }
    const file = resolve(root, `.${route}`);
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('Invalid path');
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Synthetic TI preview: http://127.0.0.1:${port}`));
