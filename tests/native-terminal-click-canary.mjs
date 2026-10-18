import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';

export async function verifyNativeFixtureAddress(app, infoPath, path='/') {
 const info=JSON.parse(await readFile(infoPath,'utf8')),expected=info.origin+path+info.route.slice(1);
 let state=await app.getAXState({emit:false,disableDiffing:true});
 for(let attempt=0;attempt<2&&!/ID: URL/.test(state);attempt++){
  const address=state.split('\n').find(line=>/text field.*Description: Address/.test(line));
  assert.ok(address,'Safari address must be visible');
  await app.click(Number(address.trim().match(/^\d+/)[0]));
  state=await app.getAXState({emit:false,disableDiffing:true});
 }
 const address=state.split('\n').find(line=>/text field.*ID: URL/.test(line));
 assert.ok(address,'Safari expanded address must be readable');
 const url=address.match(/Value: (.*?)(?:, Placeholder:|, ID:|$)/)?.[1].replaceAll('\u200e','');
 assert.equal(url,expected.replace(/^http:\/\//,''),'Native input must target the exact owned fixture URL');
 const cancel=state.split('\n').find(line=>line.includes('ID: CancelBarItemButton'));
 assert.ok(cancel);await app.click(Number(cancel.trim().match(/^\d+/)[0]));
 await app.getAXState({emit:false});
 return {app,runId:info.runId,url:expected};
}

export async function probeNativeTerminalGesture(app, {infoPath, workspaceId, surfaceId, sourcePath, gesture, proofPath, addressGuard, path='/'}) {
 const info=JSON.parse(await readFile(infoPath,'utf8'));
 assert.equal(info.workspaceId,workspaceId);assert.equal(info.surfaceId,surfaceId);
 assert.ok(info.runId,'Use a fresh guarded fixture run');
 assert.equal(addressGuard?.app,app);assert.equal(addressGuard.runId,info.runId);assert.equal(addressGuard.url,info.origin+path+info.route.slice(1));
 const read=async()=>{try{return await readFile(info.log)}catch(error){if(error.code==='ENOENT')return Buffer.alloc(0);throw error}};
 const before=await read();
 if(gesture.type==='tap')await app.click(gesture.point);
 else if(gesture.type==='longpress')await app.click(gesture.point,{durationMs:700});
 else if(gesture.type==='drag')await app.drag(gesture.from,gesture.to);
 else throw new Error('Unknown native gesture');
 const state=await app.getAXState({emit:false});
 const screenshot=await app.getScreenshot({emit:false});
 if(proofPath)await writeFile(proofPath,screenshot);
 let delta;
 for(let attempt=0;attempt<20;attempt++){
  const bytes=await read();assert.ok(bytes.subarray(0,before.length).equals(before),'Fixture byte log must remain append-only');
  delta=bytes.subarray(before.length);
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 const raw=delta.toString('latin1'),reports=[...raw.matchAll(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/g)].map(match=>({button:Number(match[1]),col:Number(match[2])-1,row:Number(match[3])-1,pressed:match[4]==='M'}));
 assert.equal(raw.replace(/\x1b\[<\d+;\d+;\d+[Mm]/g,''),'','Only native mouse reports may reach the test TUI');
 const clicks=reports.filter(report=>report.button===0);
 if(gesture.type==='tap')assert.deepEqual(clicks,gesture.cell?[{button:0,...gesture.cell,pressed:true},{button:0,...gesture.cell,pressed:false}]:[]);
 else assert.deepEqual(clicks,[],'Selection and scrolling must not click the TUI');
 return {receipt:{runId:info.runId,url:addressGuard.url,workspaceId,surfaceId,gesture,sourceSha256:createHash('sha256').update(await readFile(sourcePath)).digest('hex'),bytesHex:delta.toString('hex'),reports,passed:true},state,screenshot};
}

export async function* verifyNativeClaudeClick(app,{infoPath,workspaceId,surfaceId,addressGuard,sourcePath,proofPath}) {
 const info=JSON.parse(await readFile(infoPath,'utf8'));assert.equal(info.claude,true);assert.equal(info.workspaceId,workspaceId);assert.equal(info.surfaceId,surfaceId);
 assert.equal(addressGuard.app,app);assert.equal(addressGuard.runId,info.runId);assert.equal(addressGuard.url,info.origin+info.route);
 const request=snapshot=>({snapshot,token:randomUUID()}),frame=(snapshot,phase)=>{assert.equal(snapshot.runId,info.runId);assert.equal(snapshot.phase,phase.snapshot);assert.equal(snapshot.token,phase.token);assert.equal(snapshot.result.workspace_id,workspaceId);assert.equal(snapshot.result.surface_id,surfaceId);return snapshot.result.render_grid};
 const beforeRequest=request('before'),initial=frame(yield beforeRequest,beforeRequest),text='abcdef';
 await app.typeText(text);await app.getAXState({emit:false});
 const typedRequest=request('typed'),typed=frame(yield typedRequest,typedRequest);assert.equal(typed.cursor.row,initial.cursor.row);assert.equal(typed.cursor.column,initial.cursor.column+text.length);
 assert.ok(typed.row_spans.filter(span=>span.row===typed.cursor.row).map(span=>span.text).join('').includes(text));
 const tap=yield {typedCursor:typed.cursor,screenshot:await app.getScreenshot({emit:false})};
 assert.ok(tap.cell.col!==typed.cursor.column||tap.cell.row!==typed.cursor.row,'Choose a cell that proves the cursor moved');
 await app.click(tap.point);await app.getAXState({emit:false});
 const clickedRequest=request('clicked'),after=frame(yield clickedRequest,clickedRequest);assert.equal(after.cursor.row,tap.cell.row);assert.equal(after.cursor.column,tap.cell.col);
 const screenshot=await app.getScreenshot({emit:false});if(proofPath)await writeFile(proofPath,screenshot);
 return {receipt:{runId:info.runId,url:addressGuard.url,workspaceId,surfaceId,text,typedCursor:typed.cursor,tap,afterCursor:after.cursor,sourceSha256:createHash('sha256').update(await readFile(sourcePath)).digest('hex'),passed:true},screenshot};
}
