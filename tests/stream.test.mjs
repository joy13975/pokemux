import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CmuxBridge } from '../bridge.mjs';
import { application } from '../server.mjs';
import { RenderGrid } from '../grid.mjs';
test('SSE cold attach delivers ordered full snapshots and releases its local reader on close', async () => {
  const bridge = new CmuxBridge(); bridge.connected = true; bridge.target = async () => {}; bridge.connect = async () => {}; bridge.observeMetadata = () => {};
  let replay, requested, count = 0;
  const waiting = new Promise(resolve => replay = resolve);
  const baseline = { format:'cmux.render-grid.v1', surface_id:'owned', render_epoch:'owned-epoch', full:true, render_revision:1, rows:3, columns:20, row_spans:[{row:0,column:0,text:'before'}] };
  bridge.rpc = async (method, params) => { requested = params; return ++count === 1 ? waiting : {workspace_id:'owned',surface_id:'owned',render_grid:{...baseline, render_revision:2, row_spans:[{row:0,column:0,text:'after'}]}}; };
  const auth = { origin: 'http://localhost', session: () => ({ authenticated: true }), require: () => ({ authenticated: true }) };
  const server = application({ bridge, auth }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  auth.origin = `http://localhost:${server.address().port}`;
  const abort = new AbortController();
  try {
    const fetching = fetch(auth.origin + '/api/events?workspace=owned&surface=owned', { signal: abort.signal });
    const deadline = Date.now() + 1000;
    while (!requested && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 1));
    assert.ok(requested, 'Replay requested by accepted SSE connection'); assert.equal(count,1);
    replay({workspace_id:'owned',surface_id:'owned',render_grid:baseline});
    const response = await fetching, reader = response.body.getReader();
    let text='', events=[];
    const timer=setTimeout(()=>abort.abort(),1000);
    try { while(events.length<2){text+=new TextDecoder().decode((await reader.read()).value);events=text.split('\n\n').filter(s=>s.startsWith('event: terminal.render_grid')).map(s=>JSON.parse(s.split('data: ')[1]));} }
    finally {clearTimeout(timer);}
    assert.equal(events[0].full, true); assert.equal(requested.anchor, 'screen');
    const grid=new RenderGrid();for(const frame of events)grid.apply(frame);
    assert.equal(grid.revision,2);assert.equal(grid.screen[0][0].text,'after');
    abort.abort();await new Promise(r=>setTimeout(r,100));assert.equal(bridge.watches.size,0);
  } finally { abort.abort(); bridge.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('an SSE request disconnected during target validation never starts a terminal reader', async () => {
  const bridge = new CmuxBridge(); bridge.connected = true; bridge.connect = async () => {}; bridge.observeMetadata = () => {};
  let releaseTarget, enteredTarget, readers = 0;
  const entered = new Promise(resolve => enteredTarget = resolve);
  bridge.target = () => { enteredTarget(); return new Promise(resolve => releaseTarget = resolve); };
  bridge.watch = () => { readers++; return () => readers--; };
  const auth = { origin:'http://localhost', session:()=>({authenticated:true}), require:()=>({authenticated:true}) };
  const server = application({bridge,auth}); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  auth.origin = `http://localhost:${server.address().port}`;
  const abort = new AbortController();
  const closed = new Promise(resolve=>server.once('request',(_req,res)=>res.once('close',resolve)));
  const fetching = fetch(auth.origin+'/api/events?workspace=owned&surface=owned',{signal:abort.signal}).catch(error=>error);
  try {
    await entered; abort.abort(); await closed; releaseTarget();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(readers,0,'Disconnected requests must not start a polling reader');
  } finally { releaseTarget?.(); abort.abort(); await fetching; bridge.close(); server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
});

test('large cold replay remains connected and delivers subsequent terminal changes', async () => {
  const bridge = new CmuxBridge(); bridge.connected = true; bridge.target = async () => {}; bridge.connect = async () => {}; bridge.observeMetadata = () => {};
  let captures=0;
  bridge.rpc = async () => ({workspace_id:'owned',surface_id:'owned',render_grid:{format:'cmux.render-grid.v1',surface_id:'owned',render_epoch:'large',render_revision:++captures,full:true,rows:3,columns:80,history_rows:4000,scrollback_rows:4000,scrollback_spans:Array.from({length:4000},(_,row)=>({row,column:0,text:'x'.repeat(80)})),row_spans:[{row:0,column:0,text:captures===1?'before':'after'}]}});
  const auth={origin:'http://localhost',session:()=>({authenticated:true}),require:()=>({authenticated:true})};
  const server=application({bridge,auth}); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));auth.origin=`http://localhost:${server.address().port}`;
  const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),3000);
  try {
    const response=await fetch(auth.origin+'/api/events?workspace=owned&surface=owned',{signal:abort.signal}),reader=response.body.getReader();
    let output='',events=[];
    while(events.length<2){const chunk=await reader.read();assert.equal(chunk.done,false,'Backpressure must not end a healthy stream');output+=new TextDecoder().decode(chunk.value);events=output.split('\n\n').slice(0,-1).filter(s=>s.startsWith('event: terminal.render_grid')).map(s=>JSON.parse(s.split('data: ')[1]));}
    assert.equal(events[0].scrollback_spans.length,4000);assert.equal(events[1].row_spans[0].text,'after');
  } finally {clearTimeout(timeout);abort.abort();bridge.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('phone sizing covers a background gap and stops after Mac reclaim, expiry or explicit release',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});
 const advance=async seconds=>{for(let i=0;i<seconds;i++){t.mock.timers.tick(1000);await new Promise(setImmediate)}};
 const bridge=new CmuxBridge(),calls=[];
 const target={workspace_id:'11111111-1111-4111-8111-111111111111',surface_id:'22222222-2222-4222-8222-222222222222'};
 const client_id='33333333-3333-4333-8333-333333333333';
 const mac={id:'mac',priority_key:'owner/mac/desktop',counts:true};
 let policy={mode:'smallest',priority:[]},phone,phoneReportedAt;
 const state=(cols=99,rows=35)=>({policy,cols,rows,participants:phone?[mac,phone]:[mac]});
 bridge.target=async()=>({});
 bridge.rpc=async(method,params)=>{
  calls.push([method,params]);
  if(method==='terminal.size_policy.set')policy={mode:params.mode,priority:params.priority??[]};
  if(method==='terminal.replay'){
   phoneReportedAt=Date.now();
   phone={id:'mobile',priority_key:'owner/iphone/'+params.device_id,counts:params.counts_override===true||phone?.counts===true};
   const owns=policy.mode==='priority'&&policy.priority[0]===phone.priority_key;
   const cols=owns?params.viewport_columns:Math.min(params.viewport_columns,99);
   const rows=owns?params.viewport_rows:Math.min(params.viewport_rows,35);
   return {size_state:state(cols,rows),self_participant_id:phone.id};
  }
  return {size_state:state()};
 };
 const action={...target,action:'viewport',client_id,viewport_columns:55,viewport_rows:46};
 const claim=async(generation)=>{
  const first=await bridge.action({...action,viewport_generation:generation,claim:true});
  return first.pending?bridge.action({...action,viewport_generation:generation+1,claim:true}):first;
 };
 assert.deepEqual(await claim(1),{columns:55,rows:46});
 assert.ok(calls.some(([method,params])=>method==='terminal.replay'&&params.counts_override===true));
 assert.ok(calls.every(([method,params])=>method!=='terminal.viewport'||params.clear===true),'A view report must expire without keepalives');
 assert.deepEqual(await bridge.action({...action,viewport_columns:121,viewport_rows:16,viewport_generation:3}),{columns:121,rows:16});
 const beforeBackground=calls.length;
 await advance(6);
 const backgroundCalls=calls.slice(beforeBackground);
 assert.ok(Date.now()-phoneReportedAt<5000,'Sizing survives past the stock five-second cmux lease when the phone stops polling');
 assert.ok(backgroundCalls.every(([method,params])=>method==='terminal.replay'&&params.viewport_columns===121&&params.viewport_rows===16&&!params.counts_override));
 policy={...policy,priority:[mac.priority_key,...policy.priority]};
 const before=calls.length;
 await advance(6);
 const afterReclaim=calls.length;
 await advance(6);
 assert.equal(calls.length,afterReclaim,'Background refresh stops after Mac reclaim');
 assert.deepEqual(await bridge.action({...action,viewport_generation:4,resume:true}),{released:true});
 assert.ok(calls.slice(afterReclaim).every(([,params])=>!params.counts_override),'Resuming cannot count against the Mac override');
 assert.ok(calls.slice(before).every(([method])=>method!=='terminal.size_policy.set'));
 assert.deepEqual(await claim(5),{columns:55,rows:46});
 await advance(40);
 const afterExpiry=calls.length;
 await advance(6);
 assert.equal(calls.length,afterExpiry,'An abandoned phone view stops renewing on its own');
 phone=undefined;
 assert.deepEqual(await bridge.action({...action,viewport_generation:7,resume:true}),{columns:55,rows:46},'Returning after expiry can restore only the same phone’s sizing priority');
 await bridge.action({...target,action:'viewport',client_id,viewport_generation:8,clear:true});
 assert.deepEqual(calls.at(-1),['terminal.viewport',{...target,client_id,viewport_generation:8,clear:true}]);
 const afterRelease=calls.length;
 await advance(6);
 assert.equal(calls.length,afterRelease,'A delayed renew cannot reattach after explicit release');
 bridge.close();
});
