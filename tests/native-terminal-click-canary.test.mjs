import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyNativeClaudeClick} from './native-terminal-click-canary.mjs';

async function fixture(t){
 const directory=await mkdtemp(join(tmpdir(),'pokemux-click-proof-'));t.after(()=>rm(directory,{recursive:true}));
 const info={claude:true,runId:'test-run',origin:'http://localhost:4394',route:'/#window/workspace/surface',workspaceId:'workspace',surfaceId:'surface'},infoPath=join(directory,'info.json');await writeFile(infoPath,JSON.stringify(info));
 const clicks=[],app={typeText:async()=>{},getAXState:async()=>'',getScreenshot:async()=>Buffer.alloc(0),click:async point=>clicks.push(point)};
 const run=verifyNativeClaudeClick(app,{infoPath,workspaceId:info.workspaceId,surfaceId:info.surfaceId,addressGuard:{app,runId:info.runId,url:info.origin+info.route},sourcePath:infoPath});
 const snapshot=(request,column)=>({runId:info.runId,phase:request.snapshot,token:request.token,result:{workspace_id:info.workspaceId,surface_id:info.surfaceId,render_grid:{cursor:{row:32,column},row_spans:[{row:32,text:column===2?'':'abcdef'}]}}});
 return {run,snapshot,clicks};
}
test('native Claude proof rejects a same-run stale phase before typing',async t=>{
 const {run,snapshot}=await fixture(t),request=(await run.next()).value;
 await assert.rejects(run.next({...snapshot(request,2),token:'previous-capture'}));
});
test('native Claude proof rejects a click that cannot distinguish a no-op',async t=>{
 const {run,snapshot,clicks}=await fixture(t);let request=(await run.next()).value;request=(await run.next(snapshot(request,2))).value;await run.next(snapshot(request,8));
 await assert.rejects(run.next({point:[100,100],cell:{row:32,col:8}}));assert.deepEqual(clicks,[]);
});
test('native Claude proof accepts fresh captures with an observed cursor move',async t=>{
 const {run,snapshot,clicks}=await fixture(t);let request=(await run.next()).value;request=(await run.next(snapshot(request,2))).value;await run.next(snapshot(request,8));request=(await run.next({point:[100,100],cell:{row:32,col:5}})).value;
 const result=await run.next(snapshot(request,5));assert.equal(result.done,true);assert.equal(result.value.receipt.afterCursor.column,5);assert.deepEqual(clicks,[[100,100]]);
});
