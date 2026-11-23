import { createServer } from 'node:http';
import { readFile, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, isAbsolute, join } from 'node:path';
import { homedir } from 'node:os';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import { CmuxBridge, RequestError, maxImageBytes, imageKind } from './bridge.mjs';
import { Passkeys } from './auth.mjs';
const nerdFont = '/vendor/nerd/SymbolsNerdFontMono-v3.5.1.woff2';
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/setup', ['setup.html', 'text/html; charset=utf-8']],
  ['/setup.mjs', ['setup.mjs', 'text/javascript']],
  ['/grid.mjs', ['grid.mjs', 'text/javascript']],
  ['/keyboard.mjs', ['keyboard.mjs', 'text/javascript']],
  ['/vendor/english/model.mjs', ['vendor/english/model.mjs', 'text/javascript']],
  ['/vendor/symbols/NotoSansSymbols2-Regular.ttf', ['vendor/symbols/NotoSansSymbols2-Regular.ttf', 'font/ttf']],
  ['/vendor/powerline/PowerlineSymbols.otf', ['vendor/powerline/PowerlineSymbols.otf', 'font/otf']],
  [nerdFont, [nerdFont.slice(1), 'font/woff2', 'private, max-age=31536000, immutable']],
  ['/kana.mjs', ['kana.mjs', 'text/javascript']],
  ['/vendor/kana/wanakana.js', ['vendor/kana/wanakana.js', 'text/javascript']],
  ['/passkeys.js', ['node_modules/@simplewebauthn/browser/dist/bundle/index.umd.min.js', 'text/javascript']],
  ['/REVIEW.md', ['REVIEW.md', 'text/plain; charset=utf-8']],
  ['/manifest.webmanifest', ['manifest.webmanifest', 'application/manifest+json']],
  ['/app-icon.png', ['app-icon.png', 'image/png']],
]);
for (const file of ['index.js', 'lookup.js', 'lookup-data.js', 'utilities.js']) assets.set('/vendor/width/' + file, ['node_modules/get-east-asian-width/' + file, 'text/javascript']);
async function bytes(req, limit) {
  if (Number(req.headers['content-length']) > limit) throw new RequestError(413, 'Request too large');
  const chunks = []; let bytes = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) { bytes += chunk.length; if (bytes > limit) { req.resume(); throw new RequestError(413, 'Request too large'); } chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function body(req) {
  try { return JSON.parse((await bytes(req, 100000)).toString()); }
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
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
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
        if (req.method === 'POST' && path === '/api/client-diagnostic') {
          const data = await body(req);
          const enums = {gesture:['idle','pinch','pan','wheel'],phase:['initial','tree','ready','pageshow','resize','error'],event:['bootstrap','terminal-gesture','floating-release','floating-action','key-down','key-up','key-cancel','key-lost-capture','key-drift','input-counts','tab-switch','workspace-switch','terminal-replaced','contacts-cancelled','hide','engage','terminal-focus','keyboard-state','pointerdown','pointerup','pointermove','pointercancel','touchstart','touchmove','touchend','touchcancel','keyboard-layout','click','focusin','focusout','paste','beforeinput','input','paste-request','paste-fallback','paste-field-event','paste-read','paste-denied','paste-send','paste-delivered','paste-delivery-failed'],functionKind:['paste','zoom','keyboard','scratchpad','recent','key','snippet'],mode:['custom','native'],language:['english','hiragana','katakana','system'],focus:['hide','keyboard','terminal','paste-field','floating','shortcut','other'],target:['hide','keyboard','terminal','paste-field','floating','shortcut','other'],hit:['hide','keyboard','terminal','paste-field','floating','shortcut','other'],error:['NotAllowedError','SecurityError','other']};
          const numbers = ['order','at','width','height','scale','detail','x','y','contacts','pointer','button','inputQueued','inputDelivered','choice','touch','eventAt'], flags = ['typing','native','hidden','connected','secure','activation','selected','trusted','hasClipboard','nonempty','primary','accepted','contact','hasKey','matched','preedit','moving','selecting','prevented'];
          const entries=Array.isArray(data)?data:[data];
          if (!entries.length || entries.length>64 || !entries.every(entry=>entry && !Array.isArray(entry) && /^[a-f0-9-]{36}$/.test(entry.page) && enums.event.includes(entry.event) && Object.entries(entry).every(([key,value]) => key === 'page' || (Object.hasOwn(enums,key) ? enums[key].includes(value) : numbers.includes(key) ? Number.isFinite(value) : flags.includes(key) ? typeof value === 'boolean' : key === 'callsite' ? Array.isArray(value) && value.length <= 4 && value.every(Number.isInteger) : key === 'rects' && Array.isArray(value) && value.length<=64 && value.every(rect=>Array.isArray(rect)&&rect.length===4&&rect.every(Number.isFinite)))))) throw new RequestError(400, 'Invalid content-free diagnostic');
          for(const entry of entries)console.info('Pokemux client diagnostic', JSON.stringify({receivedAt:new Date().toISOString(),...entry}));
          return json({recorded:true});
        }
        if (req.method === 'POST' && path === '/api/logout') { await auth.logout(session.id); res.setHeader('Set-Cookie', 'pokemux=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return json({ loggedOut: true }); }
        if (req.method === 'GET' && path === '/api/status') return json(await bridge.status());
        if (req.method === 'POST' && path === '/api/connect') { await bridge.connect(); return json({ connected: true }); }
        if (req.method === 'GET' && path === '/api/events') { await bridge.connect(); bridge.observeMetadata(); }
        const terminalAction = req.method === 'POST' && path === '/api/action';
        const command = terminalAction ? await body(req) : null;
        if (!bridge.connected && command?.action === 'viewport') await bridge.connect();
        if (!bridge.connected) throw new RequestError(409, 'Connect the cmux host first');
        if (req.method === 'GET' && path === '/api/file') {
          await bridge.target({ workspace_id: url.searchParams.get('workspace'), surface_id: url.searchParams.get('surface') });
          const requested = url.searchParams.get('path'), selected = requested?.startsWith('~/') ? join(homedir(), requested.slice(2)) : requested;
          if (!selected || !isAbsolute(selected) || /[\0\r\n]/u.test(selected)) throw new RequestError(400, 'Select a full Mac file path');
          let file;
          try {
            file = await open(selected, constants.O_RDONLY | constants.O_NONBLOCK);
            const stat = await file.stat();
            if (!stat.isFile()) throw new RequestError(400, 'Select a regular file');
            const header = Buffer.alloc(16); await file.read(header, 0, header.length, 0);
            const type = imageKind(header)?.type || 'application/octet-stream';
            const filename = encodeURIComponent(basename(selected)).replace(/['()*]/gu, char => '%' + char.charCodeAt(0).toString(16));
            res.setHeader('Content-Type', type); res.setHeader('Content-Length', stat.size);
            res.setHeader('Content-Disposition', `${type === 'application/octet-stream' ? 'attachment' : 'inline'}; filename*=UTF-8''${filename}`);
            res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox allow-same-origin");
            await pipeline(file.createReadStream({ start: 0, autoClose: false }), res);
            return;
          } catch (error) {
            if (['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) throw new RequestError(404, 'Selected file is unavailable on the Mac');
            if (error.code === 'ERR_STREAM_PREMATURE_CLOSE') return;
            throw error;
          } finally { await file?.close(); }
        }
        if (req.method === 'POST' && path === '/api/image') return json(await bridge.action({ action: 'image', workspace_id: url.searchParams.get('workspace'), surface_id: url.searchParams.get('surface'), type: req.headers['content-type']?.split(';')[0].trim().toLowerCase(), bytes: await bytes(req, maxImageBytes) }));
        if (req.method === 'GET' && path === '/api/tree') return json(await bridge.tree());
        if (terminalAction) return json(await bridge.action(command));
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
      if (asset[2]) res.setHeader('Cache-Control', asset[2]);
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
