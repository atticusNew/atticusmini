// Minimal static-file server for Render Web Services.
// Serves dist/ with SPA fallback to index.html. Zero deps.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { attachMatchRelay } from './relay.mjs';
import { registerPlayer, listPlayers } from './directory.mjs';

const ROOT = resolve(process.cwd(), 'dist');
const PORT = parseInt(process.env.PORT ?? '3000', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const safeJoin = (urlPath) => {
  // Strip query string + decode + collapse '..'
  const clean = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const normalized = normalize(clean).replace(/^\/+/, '');
  const target = resolve(ROOT, normalized);
  if (!target.startsWith(ROOT)) return null;
  return target;
};

const tryFile = async (path) => {
  try {
    const s = await stat(path);
    return s.isFile() ? path : null;
  } catch {
    return null;
  }
};

const send = async (res, status, path) => {
  if (status !== 200 || !path) {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(status === 404 ? 'Not Found' : 'Server Error');
    return;
  }
  const ext = extname(path).toLowerCase();
  const type = MIME[ext] ?? 'application/octet-stream';
  const headers = { 'Content-Type': type };
  if (path.includes(`${ROOT}/assets/`)) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  }
  try {
    const body = await readFile(path);
    res.writeHead(200, headers);
    res.end(body);
  } catch (e) {
    console.error('read failed', path, e);
    await send(res, 500);
  }
};

const indexFallback = join(ROOT, 'index.html');

const readJson = (req, max) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > max) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });

const sendJson = (res, status, obj) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
};

const server = createServer(async (req, res) => {
  const url = req.url ?? '/';
  const reqPath = (url.split('?')[0]) || '/';

  // Player directory API (the swipe deck of real signed-up players).
  if (reqPath === '/api/players') {
    if (req.method === 'GET') {
      let exclude = '';
      try { exclude = new URL(req.url, 'http://localhost').searchParams.get('exclude') || ''; } catch { /* ignore */ }
      sendJson(res, 200, { players: listPlayers(exclude, 30) });
      return;
    }
    if (req.method === 'POST') {
      try {
        const card = await readJson(req, 400_000);
        sendJson(res, 200, { ok: registerPlayer(card) });
      } catch {
        sendJson(res, 400, { ok: false });
      }
      return;
    }
    res.writeHead(405).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  const target = safeJoin(url);
  if (!target) {
    await send(res, 404);
    return;
  }
  // 1. exact file match
  let path = await tryFile(target);
  if (path) {
    await send(res, 200, path);
    return;
  }
  // 2. directory → index.html
  path = await tryFile(join(target, 'index.html'));
  if (path) {
    await send(res, 200, path);
    return;
  }
  // 3. SPA fallback to root index.html
  path = await tryFile(indexFallback);
  if (path) {
    await send(res, 200, path);
    return;
  }
  await send(res, 404);
});

// Attach the bitMATCH P2P relay (WebSocket) on the same origin:
//   /matchmake  and  /room/:matchId
attachMatchRelay(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`atticusmini static server + match relay listening on :${PORT} (root=${ROOT})`);
});
