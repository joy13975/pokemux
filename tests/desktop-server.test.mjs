import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer, request } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { application } from '../server.mjs';
import { RequestError } from '../bridge.mjs';

test('desktop is independent of cmux and proxies only authenticated same-origin desktop sockets',async()=>{
 let starts=0,received,upstreamSocket;const remote=createServer();remote.on('upgrade',(req,socket)=>{received=req.headers;upstreamSocket=socket;const key=createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Protocol: nsl1\r\nSec-WebSocket-Accept: '+key+'\r\n\r\n');socket.on('data',data=>socket.write(data))});await new Promise(r=>remote.listen(0,'127.0.0.1',r));
 const auth={origin:'http://localhost',session:req=>req.headers.cookie==='pokemux=owned'?{id:'owned',authenticated:true,expires:Date.now()+60000}:null,require(req){const s=this.session(req);if(!s)throw new RequestError(401,'Locked');return s},sameOrigin(req){if(req.headers.origin!==this.origin)throw new RequestError(403,'Wrong origin')}};
 const desktop={start:async()=>{starts++;return{port:remote.address().port,token:'private-engine-token'}},stop:async()=>{},clipboard:async()=>{throw Error('not used')}};
 const bridge=new EventEmitter();bridge.connected=false;const app=application({bridge,auth,desktop});await new Promise(r=>app.listen(0,'127.0.0.1',r));auth.origin=`http://localhost:${app.address().port}`;
 const upgrade=(cookie='pokemux=owned',origin=auth.origin)=>new Promise((resolve,reject)=>{const req=request(auth.origin+'/api/desktop/stream',{headers:{Cookie:cookie,Origin:origin,Connection:'Upgrade',Upgrade:'websocket','Sec-WebSocket-Version':'13','Sec-WebSocket-Key':randomBytes(16).toString('base64'),'Sec-WebSocket-Protocol':'nsl1'}});req.on('upgrade',(res,socket)=>resolve({status:res.statusCode,socket}));req.on('response',res=>{res.resume();resolve({status:res.statusCode})});req.on('error',reject);req.end()});
 try{
  assert.equal((await upgrade('')).status,401);assert.equal((await upgrade('pokemux=owned','https://foreign.invalid')).status,403);assert.equal(starts,0);
  const live=await upgrade();assert.equal(live.status,101);assert.ok(received['sec-websocket-protocol'].includes('bearer.private-engine-token'));assert.equal(received.cookie,undefined,'Phone cookies never reach the engine');assert.equal(received.origin,auth.origin);
  const echoed=new Promise(r=>live.socket.once('data',r));live.socket.write(Buffer.from('owned-proxy-roundtrip'));assert.equal((await echoed).toString(),'owned-proxy-roundtrip');live.socket.destroy();
 }finally{upstreamSocket?.destroy();app.closeAllConnections();await new Promise(r=>app.close(r));remote.closeAllConnections();await new Promise(r=>remote.close(r))}
});
