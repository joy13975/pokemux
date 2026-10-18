import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {verifyNativeKeyTaps} from './native-shortcut-touch-canary.mjs';

async function fixture(t,duplicate=false){
 const dir=await mkdtemp(join(tmpdir(),'pokemux-tap-'));t.after(()=>rm(dir,{recursive:true}));await mkdir(join(dir,'state'));
 const info={runId:randomUUID(),origin:'http://localhost:4395',route:'/#window/owned/terminal',ownedWorkspaceIds:['owned'],workspaceId:'owned',surfaceId:'terminal',log:join(dir,'state','creation-names-fixture-'+randomUUID()+'-terminal.log')},infoPath=join(dir,'info.json');await writeFile(infoPath,JSON.stringify(info));await writeFile(info.log,'POKEMUX_TEST_READY\n');
 const app={click:async()=>{await writeFile(info.log,'POKEMUX_TEST_READY\nRECV:70\n');if(duplicate)setTimeout(()=>writeFile(info.log,'POKEMUX_TEST_READY\nRECV:70\nRECV:70\n'),100)},getAXState:async()=>'',getScreenshot:async()=>Buffer.alloc(0)};
 return{app,options:{infoPath,steps:[{point:[100,100]}],expectedHex:'70',proofPath:join(dir,'proof.png'),addressGuard:{app,runId:info.runId,url:info.origin+info.route}}};
}
test('native key proof rejects missing or foreign browser guards before input',async t=>{
 const {app,options}=await fixture(t);let clicks=0;app.click=async()=>clicks++;
 for(const addressGuard of [undefined,{...options.addressGuard,url:'http://localhost:4395/#foreign'}])await assert.rejects(verifyNativeKeyTaps(app,{...options,addressGuard}));assert.equal(clicks,0);
});
test('native key proof rejects delayed duplicate input',async t=>{
 const {app,options}=await fixture(t,true);await assert.rejects(verifyNativeKeyTaps(app,options),/delayed duplicate/);
});
test('native key proof records exact settled terminal bytes',async t=>{
 const {app,options}=await fixture(t),result=await verifyNativeKeyTaps(app,options);assert.equal(result.received,'70');assert.equal(result.passed,true);
});
