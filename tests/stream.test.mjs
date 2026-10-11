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
