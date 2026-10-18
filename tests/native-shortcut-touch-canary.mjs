import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';

const bytes=text=>text.split('\n').filter(line=>line.startsWith('RECV:')).map(line=>line.slice(5)).join('');
// Supply coordinates from the current Simulator screenshot, in an owned fixture only.
export async function verifyNativeKeyTaps(app,{infoPath,steps,expectedHex,proofPath,addressGuard}){
 const info=JSON.parse(await readFile(infoPath,'utf8'));
 assert.ok(info.ownedWorkspaceIds.includes(info.workspaceId));
 assert.ok(info.runId);assert.equal(addressGuard?.app,app);assert.equal(addressGuard.runId,info.runId);assert.equal(addressGuard.url,info.origin+info.route);
 assert.match(info.log,/\/state\/creation-names-fixture-[a-f0-9-]+-terminal\.log$/);
 const before=bytes(await readFile(info.log,'utf8'));
 for(const {point,count=1,durationMs} of steps){await app.click(point,{clickCount:count,...(durationMs===undefined?{}:{durationMs})});await app.getAXState({emit:false})}
 const deadline=Date.now()+5000;let after;
 do{after=bytes(await readFile(info.log,'utf8'));if(after===before+expectedHex)break;assert.ok(Date.now()<deadline,`Native terminal received ${after.slice(before.length)}, expected ${expectedHex}`);await new Promise(resolve=>setTimeout(resolve,50))}while(true);
 await new Promise(resolve=>setTimeout(resolve,1000));assert.equal(bytes(await readFile(info.log,'utf8')),before+expectedHex,'No delayed duplicate input may follow the completed tap');
 await writeFile(proofPath,await app.getScreenshot({emit:false}));
 return{runId:info.runId,url:addressGuard.url,workspace:info.workspaceId,surface:info.surfaceId,before,received:after.slice(before.length),expected:expectedHex,passed:true};
}
