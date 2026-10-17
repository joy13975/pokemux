import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { isoCBOR } from '@simplewebauthn/server/helpers';
import { Passkeys } from '../auth.mjs';
import { application } from '../server.mjs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
const encode = bytes => Buffer.from(bytes).toString('base64url');
const hash = bytes => createHash('sha256').update(bytes).digest();
test('HTTP authentication verifies signed passkeys, one-use challenge, origin, owner bootstrap and terminal access', async () => {
  const key = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }), jwk = key.publicKey.export({ format: 'jwk' }), id = randomBytes(24);
  const cose = isoCBOR.encode(new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x, 'base64url')], [-3, Buffer.from(jwk.y, 'base64url')]]));
  const file = new URL(`../state/auth-test-${encode(id)}.json`, import.meta.url);
  await mkdir(new URL('../state/', import.meta.url), { recursive: true, mode: 0o700 });
  await writeFile(file, '[]', { mode: 0o600 });
  const bridge = new EventEmitter(); bridge.connected = true; let delivered = 0;
  bridge.action = async body => { delivered++; return { text: body.text }; };
  const auth = new Passkeys({ origin: 'http://localhost', ownerLogin: 'owner@example.invalid', file }); await auth.initialize();
  const server = application({ bridge, auth, origin: 'http://localhost' }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://localhost:${server.address().port}`; auth.origin = origin;
  // The origin object passed to the app only supplies host validation, so use that same runtime origin.
  server.close(); await new Promise(resolve => server.once('close', resolve));
  const app = application({ bridge, auth, origin }); await new Promise(resolve => app.listen(Number(new URL(origin).port), '127.0.0.1', resolve));
  let cookie = '';
  const post = async (path, body = {}, extra = {}) => {
    const r = await fetch(origin + '/api/' + path, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
    if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0];
    return { status: r.status, value: await r.json() };
  };
  try {
    assert.equal((await post('action', { text: 'blocked' })).status, 401); assert.equal(delivered, 0);
    assert.equal((await post('passkey/register-options')).status, 403);
    assert.equal((await post('passkey/register-options', {}, { 'tailscale-user-login': 'wrong@example.invalid' })).status, 403);
    const options = (await post('passkey/register-options', {}, { 'tailscale-user-login': 'owner@example.invalid' })).value;
    const client = Buffer.from(JSON.stringify({ type: 'webauthn.create', origin, challenge: options.challenge }));
    const length = Buffer.alloc(2); length.writeUInt16BE(id.length);
    const data = Buffer.concat([hash('localhost'), Buffer.from([0x45]), Buffer.alloc(4), Buffer.alloc(16), length, id, Buffer.from(cose)]);
    const registration = { id: encode(id), rawId: encode(id), type: 'public-key', response: { clientDataJSON: encode(client), attestationObject: encode(isoCBOR.encode(new Map([['fmt', 'none'], ['authData', data], ['attStmt', new Map()]]))), transports: ['internal'] }, clientExtensionResults: {} };
    assert.equal((await post('passkey/register-verify', registration, { 'tailscale-user-login': 'owner@example.invalid' })).status, 200);
    assert.equal((await post('passkey/register-verify', registration)).status, 400);
    assert.equal((await post('action', { text: 'authorized' }, { Origin: 'https://attacker.invalid' })).status, 403); assert.equal(delivered, 0);
    assert.equal((await post('action', { text: 'authorized' })).status, 200); assert.equal(delivered, 1);
    await post('logout'); assert.equal((await post('action')).status, 401);
    for (const failure of ['signature', 'challenge', 'origin', 'rp', 'verification']) {
      const login = (await post('passkey/login-options')).value;
      const data = Buffer.from(JSON.stringify({ type: 'webauthn.get', origin: failure === 'origin' ? 'https://attacker.invalid' : origin, challenge: failure === 'challenge' ? encode(randomBytes(32)) : login.challenge }));
      const authenticator = Buffer.concat([hash(failure === 'rp' ? 'attacker.invalid' : 'localhost'), Buffer.from([failure === 'verification' ? 1 : 5]), Buffer.from([0,0,0,1])]);
      const privateKey = failure === 'signature' ? generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey : key.privateKey;
      const forged = { id: encode(id), rawId: encode(id), type: 'public-key', response: { clientDataJSON: encode(data), authenticatorData: encode(authenticator), signature: encode(sign('sha256', Buffer.concat([authenticator, hash(data)]), privateKey)), userHandle: null }, clientExtensionResults: {} };
      assert.equal((await post('passkey/login-verify', forged)).status, 403, failure);
      assert.equal((await post('action')).status, 401, failure); assert.equal(delivered, 1);
    }
    const login = (await post('passkey/login-options')).value;
    const loginClient = Buffer.from(JSON.stringify({ type: 'webauthn.get', origin, challenge: login.challenge }));
    const counter = Buffer.alloc(4); counter.writeUInt32BE(1);
    const authenticator = Buffer.concat([hash('localhost'), Buffer.from([5]), counter]);
    const assertion = { id: encode(id), rawId: encode(id), type: 'public-key', response: { clientDataJSON: encode(loginClient), authenticatorData: encode(authenticator), signature: encode(sign('sha256', Buffer.concat([authenticator, hash(loginClient)]), key.privateKey)), userHandle: null }, clientExtensionResults: {} };
    assert.equal((await post('passkey/login-verify', assertion)).status, 200);
    assert.equal((await post('action', { text: 'after-login' })).status, 200);
    assert.equal(auth.credentials[0].counter, 1);
  } finally { app.closeAllConnections(); await new Promise(resolve => app.close(resolve)); await unlink(file); }
});

test('client diagnostics require authentication and origin and reject content-bearing fields',async t=>{
 const bridge=new EventEmitter();bridge.connected=false;
 const auth=new Passkeys({origin:'http://localhost',ownerLogin:'fixture',file:new URL('../state/unused-diagnostic-fixture.json',import.meta.url)});auth.credentials=[];
 const session='a'.repeat(64);auth.sessions.set(session,{authenticated:true,expires:Date.now()+60000});
 const app=application({bridge,auth});await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));auth.origin=`http://localhost:${app.address().port}`;
 const logged=[];t.mock.method(console,'info',(...values)=>logged.push(values));
 const data={page:'12345678-1234-1234-1234-123456789abc',event:'hide',mode:'custom',focus:'terminal',hidden:false,typing:true,order:1,at:3,callsite:[73,187]};
 const post=(value,headers={})=>fetch(auth.origin+'/api/client-diagnostic',{method:'POST',headers:{Origin:auth.origin,Cookie:'pokemux='+session,'Content-Type':'application/json',...headers},body:JSON.stringify(value)});
 try{
  assert.equal((await post(data,{Cookie:''})).status,401);assert.equal(logged.length,0);
  assert.equal((await post(data,{Origin:'https://other.invalid'})).status,403);assert.equal(logged.length,0);
  for(const bad of [{...data,text:'PRIVATE_CLIPBOARD'}, {...data,event:'PRIVATE_TERMINAL'}, {...data,focus:'PRIVATE_TEXT'}, {...data,toString:'PRIVATE_TEXT'}])assert.equal((await post(bad)).status,400);
  assert.equal(logged.length,0);
  const response=await post(data);assert.equal(response.status,200);assert.equal((await response.json()).recorded,true);
  assert.equal(logged.length,1);assert.deepEqual(JSON.parse(logged[0][1]).callsite,data.callsite);assert.equal(JSON.stringify(logged).includes('PRIVATE_'),false);
  for(const event of ['touchstart','touchend','touchcancel']){
   const raw={...data,event,target:'keyboard',hit:'keyboard',touch:4,eventAt:1,x:192,y:602,contacts:1,hasKey:true,prevented:false};
   assert.equal((await post(raw)).status,200);assert.equal((await post({...raw,key:'PRIVATE_TYPED_KEY'})).status,400);
  }
  assert.equal(logged.length,4);assert.equal(JSON.stringify(logged).includes('PRIVATE_'),false);
  const layout={...data,event:'keyboard-layout',rects:[[0,550,428,329],[1,556,42,58]]},move={...data,event:'touchmove',touch:2,x:22,y:583,eventAt:140};
  for(const bad of [[],Array(65).fill(data),[data,{...move,text:'PRIVATE_TYPED_TEXT'}],[{...layout,rects:[['PRIVATE_TEXT',0,1,1]]}],[{...layout,rects:[[0,1,2]]}],[{...layout,rects:Array(65).fill([0,0,1,1])}]])assert.equal((await post(bad)).status,400);
  assert.equal(logged.length,4,'Reject the entire batch before recording any valid prefix');
  assert.equal((await post([layout,move])).status,200);assert.equal(logged.length,6);assert.deepEqual(JSON.parse(logged[4][1]).rects,layout.rects);assert.equal(JSON.parse(logged[5][1]).touch,2);assert.equal(JSON.stringify(logged).includes('PRIVATE_'),false);

 }finally{app.closeAllConnections();await new Promise(resolve=>app.close(resolve))}
});
