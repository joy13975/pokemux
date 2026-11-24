import { spawn, execFile } from 'node:child_process';
import { access, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer as portServer } from 'node:net';
import { request } from 'node:http';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { RequestError } from './bridge.mjs';

export class DesktopEngine {
 constructor({ origin }) { this.origin = origin; }
 async start() {
  if (this.stopping) await this.stopping;
  if (this.target) return this.target;
  this.starting ??= this.launch().finally(() => { this.starting = null; });
  return this.starting;
 }
 async launch() {
  const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.resolve('screen-relay')), 'utf8'));
  const engine = join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'screen-relay', 'engine', pkg.version, 'relay-engine');
  try { await access(engine); }
  catch (error) { if (error.code === 'ENOENT') throw new RequestError(503, 'Desktop needs setup on the Mac: run npm run desktop:setup in Pokemux.'); throw error; }
  // ScreenCaptureKit can leave startCapture pending on an idle, awake display.
  await promisify(execFile)('/usr/bin/caffeinate', ['-u', '-t', '1']);
  const available = portServer(); await new Promise((resolve, reject) => { available.once('error', reject); available.listen(0, '127.0.0.1', resolve); });
  const port = available.address().port; await new Promise(resolve => available.close(resolve));
  const token = randomBytes(32).toString('hex');
  const directory = this.directory = await mkdtemp(join(tmpdir(), 'pokemux-desktop-'));
  let diagnostic = '', ended = false, child;
  const exitHook = () => { child?.kill('SIGTERM'); cleanup(); };
  const cleanup = this.cleanup = () => {
   process.off('exit', exitHook);
   if (this.directory === directory) this.directory = null;
   if (this.cleanup === cleanup) this.cleanup = null;
   rmSync(directory, { recursive: true, force: true });
  };
  try {
   const tokenFile = join(directory, 'token'); await writeFile(tokenFile, token, { mode: 0o600 });
   const viewer = fileURLToPath(new URL('../viewer/', import.meta.resolve('screen-relay')));
   child = this.child = spawn(engine, ['--backend', 'macos', '--bind', '127.0.0.1', '--port', String(port), '--fps', '30', '--viewer-dir', viewer, '--token-file', tokenFile, '--allow-origin', this.origin], { stdio: ['ignore', 'ignore', 'pipe'] });
   process.once('exit', exitHook);
   child.stderr.on('data', data => { diagnostic = (diagnostic + data).slice(-6000); });
   child.once('exit', () => { ended = true; if (this.child === child) { this.child = null; this.target = null; } cleanup(); });
   await once(child, 'spawn');
   const deadline = Date.now() + 15000;
   while (!ended && Date.now() < deadline) {
    try {
     const response = await fetch(`http://127.0.0.1:${port}/capabilities`, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(1000) });
     if (!response.ok) throw new Error('Desktop engine status HTTP ' + response.status);
     await response.json(); this.target = { port, token }; return this.target;
    } catch (error) {
     if (error.cause?.code !== 'ECONNREFUSED' && error.name !== 'TimeoutError') throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
   }
   throw new RequestError(503, diagnostic.trim() || 'Desktop engine did not become ready. Check the Mac bridge log.');
  } catch (error) { await this.dispose(); throw error; }
 }
 async clipboard(text) {
  const target = await this.start();
  const response = await fetch(`http://127.0.0.1:${target.port}/clipboard`, { method: 'POST', headers: { Authorization: 'Bearer ' + target.token, 'Content-Type': 'text/plain; charset=utf-8' }, body: text });
  if (!response.ok) throw new RequestError(502, 'The Mac could not accept the pasted text.');
  await response.json();
 }
 async stop() {
  this.stopping ??= (async () => {
   let failure;
   try { await this.starting; } catch (error) { failure = error; }
   await this.dispose();
   if (failure) throw failure;
  })().finally(() => { this.stopping = null; });
  return this.stopping;
 }
 async dispose() {
  const child = this.child, cleanup = this.cleanup; this.child = null; this.target = null;
  if (child?.pid && child.exitCode === null && child.signalCode === null) { const ended = once(child, 'exit'); child.kill('SIGTERM'); await ended; }
  cleanup?.();
 }
}

export function bindDesktopSockets(server, { auth, desktop }) {
 const clients = new Map(); let idle;
 const stopIdle = () => { clearTimeout(idle); idle = setTimeout(() => { if (!clients.size) desktop.stop().catch(error => console.error('Desktop stop failed:', error)); }, 10000); idle.unref(); };
 const retire = socket => { const entry = clients.get(socket); if (!entry) return; clearTimeout(entry.expiry); entry.upstream.destroy(); clients.delete(socket); if (!clients.size) stopIdle(); };
 server.closeDesktopSession = id => { for (const [socket, entry] of clients) if (entry.session === id) socket.destroy(); };
 server.on('close', () => { clearTimeout(idle); for (const socket of clients.keys()) socket.destroy(); desktop.stop().catch(error => console.error('Desktop stop failed:', error)); });
 server.on('upgrade', async (req, socket, head) => {
  let upstream;
  try {
   if (req.headers.host !== new URL(auth.origin).host || req.headers.origin !== auth.origin) throw new RequestError(403, 'Desktop origin rejected');
   const url = new URL(req.url, auth.origin);
   if (url.pathname !== '/api/desktop/stream' || [...url.searchParams].some(([key,value]) => key !== 'take' || value !== '1') || req.headers['sec-websocket-protocol'] !== 'nsl1') throw new RequestError(400, 'Invalid desktop stream');
   const session = auth.require(req), target = await desktop.start();
   if (!auth.session(req)?.authenticated || socket.destroyed) { socket.destroy(); return; }
   clearTimeout(idle);
   upstream = request({ hostname: '127.0.0.1', port: target.port, path: '/stream' + url.search, headers: { Host: `127.0.0.1:${target.port}`, Origin: auth.origin, Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': req.headers['sec-websocket-key'], 'Sec-WebSocket-Protocol': 'nsl1, bearer.' + target.token } });
   upstream.on('upgrade', (response, peer, extra) => {
    if (socket.destroyed) { peer.destroy(); return; }
    const expiry = setTimeout(() => socket.destroy(), Math.max(0, session.expires - Date.now())); expiry.unref();
    clients.set(socket, { upstream: peer, expiry, session: session.id });
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + response.headers['sec-websocket-accept'] + '\r\nSec-WebSocket-Protocol: nsl1\r\n\r\n');
    if (extra.length) socket.write(extra); if (head.length) peer.write(head);
    peer.pipe(socket); socket.pipe(peer);
    peer.on('error', () => socket.destroy()); peer.on('close', () => socket.destroy());
    socket.once('close', () => retire(socket)); socket.on('error', () => peer.destroy());
   });
   upstream.on('response', response => { response.resume(); socket.end('HTTP/1.1 409 Conflict\r\nConnection: close\r\n\r\n'); stopIdle(); });
   upstream.on('error', error => { console.error('Desktop connection failed:', error.message); socket.destroy(); stopIdle(); });
   socket.once('close', () => upstream.destroy()); upstream.end();
  } catch (error) {
   if (!(error instanceof RequestError)) console.error('Desktop upgrade failed:', error);
   if (!socket.destroyed) socket.end(`HTTP/1.1 ${error.status || 502} Desktop unavailable\r\nConnection: close\r\n\r\n`);
  }
 });
 return { stopIdle };
}
