import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { mkdtemp, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { isoCBOR } from '@simplewebauthn/server/helpers';
const origin = 'http://localhost:4396', encode = value => Buffer.from(value).toString('base64url');
const hash = value => createHash('sha256').update(value).digest();
const directory = await mkdtemp(new URL('../state/passkey-runtime-', import.meta.url).pathname);
const file = new URL('file://' + directory + '/credentials.json');
const key = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }), id = randomBytes(24);
const jwk = key.publicKey.export({ format: 'jwk' });
const cose = isoCBOR.encode(new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x, 'base64url')], [-3, Buffer.from(jwk.y, 'base64url')]]));
await writeFile(file, JSON.stringify([{ id: encode(id), publicKey: Buffer.from(cose).toString('base64'), counter: 0, transports: ['internal'] }]), { mode: 0o600 });
let child, cookie = '';
const start = async () => {
  child = spawn(process.execPath, ['--input-type=module', '-e', `
    import {Passkeys} from './auth.mjs';import {application} from './server.mjs';import {CmuxBridge} from './bridge.mjs';
    const auth=new Passkeys({origin:${JSON.stringify(origin)},ownerLogin:'owned-runtime-fixture',file:new URL(${JSON.stringify(file.href)})});await auth.initialize();
    const bridge=new CmuxBridge();await bridge.initialize();const app=application({auth,bridge});
    app.listen(4396,'127.0.0.1',()=>console.log('READY'));
    process.on('SIGTERM',()=>{bridge.close();app.closeAllConnections();app.close(()=>process.exit(0))});
  `], { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve, reject) => {
    child.stdout.on('data', data => { if (data.toString().includes('READY')) resolve(); });
    child.once('exit', code => reject(new Error('Fixture exited ' + code)));
    child.once('error', reject);
  });
};
const stop = async () => { const closed = once(child, 'exit'); child.kill('SIGTERM'); await closed; };
const request = async (path, data) => {
  const response = await fetch(origin + path, { redirect: 'manual', headers: { Cookie: cookie, Origin: origin, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(data === undefined ? {} : { method: 'POST', body: JSON.stringify(data) }) });
  const fresh = response.headers.get('set-cookie'); if (fresh) cookie = fresh.split(';')[0];
  return response;
};
try {
  await start();
  assert.equal((await request('/')).status, 302);
  const options = await (await request('/api/passkey/login-options', {})).json();
  const client = Buffer.from(JSON.stringify({ type: 'webauthn.get', origin, challenge: options.challenge }));
  const authenticator = Buffer.concat([hash('localhost'), Buffer.from([5]), Buffer.from([0, 0, 0, 1])]);
  const response = { id: encode(id), rawId: encode(id), type: 'public-key', response: { clientDataJSON: encode(client), authenticatorData: encode(authenticator), signature: encode(sign('sha256', Buffer.concat([authenticator, hash(client)]), key.privateKey)), userHandle: null }, clientExtensionResults: {} };
  assert.equal((await request('/api/passkey/login-verify', response)).status, 200);
  assert.equal((await request('/api/connect', {})).status, 200);
  assert.equal((await request('/')).status, 200);
  const original = cookie;
  const before = JSON.parse(await readFile(new URL(file.href + '.sessions'), 'utf8')).sessions[0][1];
  await stop(); await start();
  assert.equal((await (await request('/api/auth')).json()).authenticated, true);
  assert.equal((await request('/')).status, 200);
  const tree = await (await request('/api/tree')).json(); assert.ok(Array.isArray(tree.windows));
  assert.equal(JSON.parse(await readFile(new URL(file.href + '.sessions'), 'utf8')).sessions[0][1], before);
  assert.equal((await stat(new URL(file.href + '.sessions'))).mode & 0o777, 0o600);
  await request('/api/logout', {}); await stop(); await start(); cookie = original;
  assert.equal((await request('/')).status, 302);
  assert.equal((await request('/api/tree')).status, 401);
  const sourceSha256 = {};
  for (const name of ['auth.mjs', 'setup.mjs', 'server.mjs']) sourceSha256[name] = createHash('sha256').update(await readFile(new URL('../' + name, import.meta.url))).digest('hex');
  await writeFile(new URL('../PASSKEY_RUNTIME_RESULT.json', import.meta.url), JSON.stringify({ passed: true, at: new Date().toISOString(), checks: ['Real signed user-verified WebAuthn login', 'Real process stop/start preserves the browser cookie and original expiry', 'Authenticated terminal HTML and stock-cmux tree accessible after restart', 'Private session file mode0600', 'Logout remains revoked after a second process restart'], sourceSha256 }, null, 2) + '\n');
  console.log('Runtime checks passed; owned Safari fixture ready at ' + origin + '/setup');
  await new Promise(resolve => process.once('SIGTERM', resolve));
} finally { if (child?.exitCode === null) await stop(); await rm(directory, { recursive: true }); }
