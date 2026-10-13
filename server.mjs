import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { CmuxBridge, RequestError } from './bridge.mjs';
import { Passkeys } from './auth.mjs';
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/setup', ['setup.html', 'text/html; charset=utf-8']],
  ['/setup.mjs', ['setup.mjs', 'text/javascript']],
  ['/grid.mjs', ['grid.mjs', 'text/javascript']],
  ['/vendor/symbols/NotoSansSymbols2-Regular.ttf', ['vendor/symbols/NotoSansSymbols2-Regular.ttf', 'font/ttf']],
  ['/vendor/powerline/PowerlineSymbols.otf', ['vendor/powerline/PowerlineSymbols.otf', 'font/otf']],
  ['/kana.mjs', ['kana.mjs', 'text/javascript']],
  ['/vendor/kana/wanakana.js', ['vendor/kana/wanakana.js', 'text/javascript']],
  ['/passkeys.js', ['node_modules/@simplewebauthn/browser/dist/bundle/index.umd.min.js', 'text/javascript']],
  ['/REVIEW.md', ['REVIEW.md', 'text/plain; charset=utf-8']],
  ['/manifest.webmanifest', ['manifest.webmanifest', 'application/manifest+json']],
  ['/app-icon.png', ['app-icon.png', 'image/png']],
]);
for (const file of ['index.js', 'lookup.js', 'lookup-data.js', 'utilities.js']) assets.set('/vendor/width/' + file, ['node_modules/get-east-asian-width/' + file, 'text/javascript']);
async function body(req) {
  const chunks = []; let bytes = 0;
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 100000) throw new RequestError(413, 'Request too large'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch (error) { if (error instanceof SyntaxError) throw new RequestError(400, 'Invalid JSON'); throw error; }
}
export function application({ bridge, auth }) {
  const streams = new Set();
  bridge.on('event', frame => {
    for (const stream of streams) {
      if (frame.topic !== 'workspace.updated' && frame.payload?.surface_id !== stream.surface) continue;
      if (!auth.session(stream.req)?.authenticated) { stream.res.end(); continue; }
      stream.res.write(`event: ${frame.topic}\ndata: ${JSON.stringify(frame.payload)}\n\n`);
    }
  });
  bridge.on('disconnected', () => { for (const stream of streams) stream.res.end(); });
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    try {
      const url = new URL(req.url, auth.origin), path = url.pathname;
      if (req.headers.host !== new URL(auth.origin).host) throw new RequestError(403, 'Request host rejected');
      if (req.method === 'POST') auth.sameOrigin(req);
      const json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
      if (req.method === 'GET' && path === '/api/auth') return json({ authenticated: !!auth.session(req)?.authenticated, registered: auth.credentials.length > 0 });
      if (req.method === 'POST' && path.startsWith('/api/passkey/')) {
        const action = path.slice('/api/passkey/'.length);
        if (action === 'register-options' || action === 'login-options') return json(await auth.options(req, res, action === 'register-options'));
        if (action === 'register-verify' || action === 'login-verify') return json(await auth.verify(req, res, await body(req), action === 'register-verify'));
        throw new RequestError(404, 'Unknown passkey action');
      }
      if (path.startsWith('/api/')) {
        const session = auth.require(req);
        if (req.method === 'POST' && path === '/api/logout') { auth.sessions.delete(session.id); res.setHeader('Set-Cookie', 'pokemux=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return json({ loggedOut: true }); }
        if (req.method === 'GET' && path === '/api/status') return json(await bridge.status());
        if (req.method === 'POST' && path === '/api/connect') { await bridge.connect(); return json({ connected: true }); }
        if (req.method === 'GET' && path === '/api/events') { await bridge.connect(); bridge.observeMetadata(); }
        if (!bridge.connected) throw new RequestError(409, 'Connect the cmux host first');
        if (req.method === 'GET' && path === '/api/tree') return json(await bridge.tree());
        if (req.method === 'POST' && path === '/api/action') return json(await bridge.action(await body(req)));
        if (req.method === 'POST' && path === '/api/manage') return json(await bridge.manage(await body(req)));
        if (req.method === 'GET' && path === '/api/events') {
          const target = { workspace_id: url.searchParams.get('workspace'), surface_id: url.searchParams.get('surface') };
          await bridge.target(target);
          if (res.destroyed) return;
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' });
          const stream = { req, res, surface: target.surface_id }; streams.add(stream);
          const heartbeat = setInterval(() => { if (!auth.session(req)?.authenticated) res.end(); else if (!res.writableNeedDrain) res.write(': keepalive\n\n'); }, 20000);
          const stop = bridge.watch(target, async frame => {
            if (!auth.session(req)?.authenticated) { res.end(); return; }
            if (!res.write(`event: terminal.render_grid\ndata: ${JSON.stringify(frame)}\n\n`) && !res.destroyed) await new Promise(resolve => {
              const ready = () => { res.off('drain', ready); res.off('close', ready); resolve(); };
              res.once('drain', ready); res.once('close', ready);
            });
          }, error => { console.error('cmux terminal mirror failed:', error.message); res.end(); });
          res.on('close', () => { stop(); clearInterval(heartbeat); streams.delete(stream); });
          return;
        }
        throw new RequestError(404, 'Unknown action');
      }
      const asset = req.method === 'GET' && assets.get(path);
      if (!asset) throw new RequestError(404, 'Not found');
      if (path === '/' && !auth.session(req)?.authenticated) { res.writeHead(302, { Location: '/setup' }); res.end(); return; }
      res.setHeader('Content-Type', asset[1]); res.end(await readFile(new URL(asset[0], import.meta.url)));
    } catch (error) {
      if (!res.headersSent) { res.writeHead(error.status || 502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: error instanceof RequestError ? error.message : 'cmux operation failed; check the bridge diagnostic log' })); }
      else res.end();
      if (!(error instanceof RequestError)) console.error(error);
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { origin, ownerLogin } = JSON.parse(await readFile(new URL('state/server.json', import.meta.url), 'utf8'));
  if (!origin.startsWith('https://') || !ownerLogin) throw new Error('Run node configure.mjs to configure the owner and HTTPS origin');
  const auth = new Passkeys({ origin, ownerLogin, file: new URL(`state/passkeys-${new URL(origin).hostname}.json`, import.meta.url) }); await auth.initialize();
  const bridge = new CmuxBridge(); await bridge.initialize();
  application({ bridge, auth, origin }).listen(4388, '127.0.0.1', () => console.log(`Pokemux bridge listening on loopback:4388 for ${origin}`));
}
