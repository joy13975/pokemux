import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:net';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { CmuxBridge } from '../bridge.mjs';
const until = async predicate => { const end = Date.now() + 3000; while (!predicate()) { assert.ok(Date.now() < end, 'local mirror made progress'); await new Promise(r => setTimeout(r, 10)); } };
test('local mirror needs no vendor account, pushes authoritative changes and stops reading when detached', async () => {
  const path = new URL(`../state/mirror-${randomUUID()}.sock`, import.meta.url).pathname;
  const sockets = new Set(), requests = [], frames = [];
  const target = { workspace_id: randomUUID(), surface_id: randomUUID() };
  let revision = 1, capture = 0;
  const reordered = value => Array.isArray(value) ? value.map(reordered) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reordered(item)])) : value;
  const grid = () => { const value = ({ format:'cmux.render-grid.v1', ...target, render_epoch:'owned', render_revision:++capture, terminal_theme_revision:capture, state_seq:0, full:true, rows:3, columns:30, cursor:{row:1,column:revision,visible:true,style:'bar'}, row_spans:[{row:1,column:0,text:revision===1?'before':'after'}] }); return capture % 2 ? value : reordered(value); };
  const server = createServer(socket => {
    sockets.add(socket);socket.on('close',()=>sockets.delete(socket));
    createInterface({ input:socket }).on('line',line=>{
      const request=JSON.parse(line);requests.push(request);
      assert.ok(['system.ping','terminal.replay','events.stream'].includes(request.method), 'only local APIs');
      if(request.method==='events.stream'){socket.write(JSON.stringify({type:'ack'})+'\n');return;}
      const result=request.method==='system.ping'?{pong:true}:{...target,render_grid:grid()};
      const data=JSON.stringify({id:request.id,ok:true,result})+'\n';
      socket.write(data.slice(0,10));setImmediate(()=>socket.write(data.slice(10)));
    });
  });
  await new Promise(r=>server.listen(path,r));
  const bridge=new CmuxBridge({socketPath:path});
  bridge.execute=async()=>{throw new Error('Local mirroring must not launch a CLI or require a vendor account');};
  let stop;
  try {
    await bridge.initialize();assert.equal((await bridge.status()).connected,true);
    stop=bridge.watch(target,frame=>frames.push(frame),error=>{throw error;});
    await until(()=>frames.length===1);
    assert.equal(frames[0].cursor.column,1);assert.equal(frames[0].full,true);
    revision=2;await until(()=>frames.length===2);
    assert.equal(frames[1].row_spans[0].text,'after');assert.equal(frames[1].cursor.column,2);
    await until(()=>requests.filter(r=>r.method==='terminal.replay').length>=4);
    assert.equal(frames.length,2,'unchanged snapshots are not forwarded');
    assert.ok(requests.filter(r=>r.method==='terminal.replay').every(r=>r.params.anchor==='screen'&&!('viewport_rows' in r.params)&&!('client_id' in r.params)));
    stop();await new Promise(r=>setTimeout(r,100));const count=requests.length;
    await new Promise(r=>setTimeout(r,250));assert.equal(requests.length,count,'no readers survive detached browser');
  } finally {stop?.();bridge.close?.();for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));}
});

test('each action rejects mismatched, missing and non-terminal live targets before delivery',async()=>{
 const workspace_id=randomUUID(),surface_id=randomUUID(),bridge=new CmuxBridge(),received=[];
 let health={workspace_id,surfaces:[{id:surface_id,type:'terminal'}]};
 bridge.rpc=async(method,params)=>{if(method==='surface.health')return health;received.push({method,params});return {ok:true}};
 for(const action of [{action:'input',text:'x'},{action:'paste',text:'a\nb'},{action:'key',key:'Backspace'},{action:'rename',name:'Owned'}]){
  const request={...action,workspace_id,surface_id},before=received.length;
  await bridge.action(request);assert.equal(received.length,before+1);
  await assert.rejects(bridge.action({...request,workspace_id:randomUUID()}),/no longer/);
  health={workspace_id,surfaces:[]};await assert.rejects(bridge.action(request),/no longer/);
  health={workspace_id,surfaces:[{id:surface_id,type:'browser'}]};await assert.rejects(bridge.action(request),/no longer/);
  health={workspace_id,surfaces:[{id:surface_id,type:'terminal'}]};
  assert.equal(received.length,before+1,'Invalid targets must send no mutation');
 }
});

test('input wakes an idle watched terminal without overlapping replays or surviving detach',async()=>{
 const workspace_id=randomUUID(),surface_id=randomUUID(),bridge=new CmuxBridge(),frames=[];let value='',captures=0,maximum=0,active=0;
 bridge.target=async()=>({});bridge.rpc=async(method)=>{if(method==='terminal.input'){value='a';return {ok:true}}if(method==='terminal.replay'){active++;maximum=Math.max(maximum,active);captures++;await new Promise(r=>setTimeout(r,8));active--;return {workspace_id,surface_id,render_grid:{format:'cmux.render-grid.v1',full:true,rows:1,columns:10,render_epoch:'input-wake',render_revision:captures,row_spans:[{row:0,column:0,text:value}]}}}throw new Error(method)};
 const stop=bridge.watch({workspace_id,surface_id},frame=>frames.push(frame),error=>{throw error});
 try{
  await until(()=>frames.length===1);await new Promise(r=>setTimeout(r,1600));const idleCapture=captures;await until(()=>captures>idleCapture&&active===0);
  const before=captures,at=Date.now();await bridge.action({action:'input',workspace_id,surface_id,text:'a'});await until(()=>frames.some(f=>f.row_spans[0].text==='a'));assert.ok(Date.now()-at<100,'Idle input should wake immediately rather than wait for idle poll');assert.ok(captures>before);assert.equal(maximum,1);
  stop();const detached=captures;await bridge.action({action:'input',workspace_id,surface_id,text:'a'});await new Promise(r=>setTimeout(r,100));assert.equal(captures,detached);
 }finally{stop();bridge.close()}
});

test('a rapid input burst during capture delivers its final echo on the next turn without overlapping captures',async({mock})=>{
 mock.timers.enable({apis:['setTimeout','Date']});
 const target={workspace_id:randomUUID(),surface_id:randomUUID()},bridge=new CmuxBridge(),frames=[];
 let release,value='',captures=0,active=0,maximum=0;
 bridge.target=async()=>({});
 bridge.rpc=async(method,params)=>{
  if(method==='terminal.input'){value+=params.text;return {ok:true}}
  if(method!=='terminal.replay')throw new Error(method);
  captures++;active++;maximum=Math.max(maximum,active);const captured=value;
  if(captures===1)await new Promise(resolve=>{release=resolve});
  active--;return {...target,render_grid:{full:true,render_epoch:'burst',render_revision:captures,row_spans:[{row:0,column:0,text:captured}]}};
 };
 const stop=bridge.watch(target,frame=>frames.push(frame),error=>{throw error});
 try{
  await Promise.all([... 'abc'].map(text=>bridge.action({action:'input',...target,text})));
  assert.equal(captures,1,'Input must not start a second capture while the first is pending');
  release();await new Promise(setImmediate);mock.timers.tick(0);await new Promise(setImmediate);
  assert.deepEqual(frames.map(frame=>frame.row_spans[0].text),['','abc'],'The burst must not wait for the ordinary poll interval');
  assert.equal(maximum,1);assert.equal(captures,2,'One follow-up capture coalesces the burst');
 }finally{stop();bridge.close();mock.timers.reset()}
});

test('detach during capture suppresses a late frame or error and cannot be woken by later input',async({mock})=>{
 mock.timers.enable({apis:['setTimeout','Date']});
 try{for(const failed of [false,true]){
  const target={workspace_id:randomUUID(),surface_id:randomUUID()},bridge=new CmuxBridge(),frames=[],errors=[];
  let resolve,reject,captures=0;
  bridge.target=async()=>({});bridge.rpc=async method=>{
   if(method==='terminal.input')return {ok:true};
   if(method!=='terminal.replay')throw new Error(method);
   captures++;return new Promise((a,b)=>{resolve=a;reject=b});
  };
  const stop=bridge.watch(target,frame=>frames.push(frame),error=>errors.push(error));
  try{
   stop();if(failed)reject(new Error('late capture failure'));else resolve({...target,render_grid:{full:true}});
   await new Promise(setImmediate);await bridge.action({action:'input',...target,text:'a'});mock.timers.tick(10000);await new Promise(setImmediate);
   assert.deepEqual(frames,[]);assert.deepEqual(errors,[]);assert.equal(captures,1,'Detached watches cannot resume or deliver late results');
  }finally{stop();bridge.close()}
 }}finally{mock.timers.reset()}
});

test('a failed capture reports once and ends polling even when input was queued during capture',async({mock})=>{
 mock.timers.enable({apis:['setTimeout','Date']});
 const target={workspace_id:randomUUID(),surface_id:randomUUID()},bridge=new CmuxBridge(),frames=[],errors=[];let reject,captures=0;
 bridge.target=async()=>({});bridge.rpc=async method=>{
  if(method==='terminal.input')return {ok:true};
  if(method!=='terminal.replay')throw new Error(method);
  captures++;return new Promise((_,b)=>{reject=b});
 };
 const stop=bridge.watch(target,frame=>frames.push(frame),error=>errors.push(error));
 try{
  await bridge.action({action:'input',...target,text:'a'});const failure=new Error('capture failure');reject(failure);await new Promise(setImmediate);
  await bridge.action({action:'input',...target,text:'b'});mock.timers.tick(10000);await new Promise(setImmediate);
  assert.deepEqual(errors,[failure]);assert.deepEqual(frames,[]);assert.equal(captures,1,'Capture failure must cancel the pending wake and later polls');
 }finally{stop();bridge.close();mock.timers.reset()}
});

test('input wakes only its watched terminal within a workspace and across workspaces',async({mock})=>{
 mock.timers.enable({apis:['setTimeout','Date']});
 try{for(const sharedWorkspace of [true,false]){
  const a={workspace_id:randomUUID(),surface_id:randomUUID()};
  const b={workspace_id:sharedWorkspace?a.workspace_id:randomUUID(),surface_id:randomUUID()};
  const bridge=new CmuxBridge(),framesA=[],framesB=[],values=new Map([[a.surface_id,''],[b.surface_id,'']]),captures=new Map([[a.surface_id,0],[b.surface_id,0]]);
  bridge.target=async()=>({});bridge.rpc=async(method,params)=>{
   if(method==='terminal.input'){values.set(params.surface_id,values.get(params.surface_id)+params.text);return {ok:true}}
   if(method!=='terminal.replay')throw new Error(method);
   const revision=captures.get(params.surface_id)+1;captures.set(params.surface_id,revision);
   return {workspace_id:params.workspace_id,surface_id:params.surface_id,render_grid:{full:true,render_epoch:params.surface_id,render_revision:revision,row_spans:[{row:0,column:0,text:values.get(params.surface_id)}]}};
  };
  const stopA=bridge.watch(a,frame=>framesA.push(frame),error=>{throw error}),stopB=bridge.watch(b,frame=>framesB.push(frame),error=>{throw error});
  try{
   await new Promise(setImmediate);const beforeA=captures.get(a.surface_id),beforeB=captures.get(b.surface_id);
   await bridge.action({action:'input',...a,text:'a'});await new Promise(setImmediate);mock.timers.tick(0);await new Promise(setImmediate);
   assert.deepEqual(framesA.map(frame=>frame.row_spans[0].text),['','a'],'Target A must echo without waiting for a scheduled poll');
   assert.equal(captures.get(a.surface_id),beforeA+1);assert.equal(captures.get(b.surface_id),beforeB,'Input A must not capture terminal B');
   assert.deepEqual(framesB.map(frame=>frame.row_spans[0].text),['']);
   await bridge.action({action:'input',...b,text:'b'});await new Promise(setImmediate);
   assert.deepEqual(framesB.map(frame=>frame.row_spans[0].text),['','b'],'Terminal B remains independently live');
   assert.equal(captures.get(a.surface_id),beforeA+1,'Input B must not capture terminal A');
  }finally{stopA();stopB();bridge.close()}
 }}finally{mock.timers.reset()}
});

test('rapid terminal input does not exhaust the native snapshot budget',async()=>{
 const target={workspace_id:randomUUID(),surface_id:randomUUID()},bridge=new CmuxBridge();let snapshots=0,received='';
 bridge.rpc=async(method,params)=>{
  if(method==='system.tree'){
   if(++snapshots>9)throw new Error('cmux system.tree rejected (rate_limited)');
   return {windows:[{workspaces:[{id:target.workspace_id,panes:[{surfaces:[{id:target.surface_id,type:'terminal'}]}]}]}]};
  }
  if(method==='surface.health')return {workspace_id:target.workspace_id,surfaces:[{id:target.surface_id,type:'terminal'}]};
  if(method==='terminal.input'){
   assert.deepEqual({workspace_id:params.workspace_id,surface_id:params.surface_id},target);
   received+=params.text;return {ok:true};
  }
  throw new Error(method);
 };
 const text='thequickbrownfox'.repeat(4);
 for(const character of text)await bridge.action({action:'input',...target,text:character});
 assert.equal(received,text,'All characters must reach the native input handler');
});
