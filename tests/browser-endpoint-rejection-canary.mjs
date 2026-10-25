import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function verifyEndpointRejection(tab,cdp,{infoPath,proofPath}){
 const info=JSON.parse(await readFile(infoPath,'utf8'));assert.ok(info.ownedWorkspaceIds.includes(info.workspaceId));assert.equal(await tab.url(),`${info.origin}/#${info.windowId}/${info.workspaceId}/${info.shellSurfaceId}`);
 const before=await tab.playwright.locator('.terminal').innerText();assert.match(before,/Claude Code v/);const prompt=text=>text.split('\n').find(line=>line.startsWith('❯')),initial=prompt(before);assert.ok(initial);
 const checks=[];
 for(const direction of ['Up','Down']){
  const p=await tab.playwright.evaluate(()=>{const r=document.querySelector('#cursorJoystick').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,height:visualViewport.height,width:visualViewport.width,scale:visualViewport.scale}});assert.equal(p.width,428);assert.equal(p.scale,1);
  const sign=direction==='Up'?-1:1,extent=Math.min(118,(sign<0?p.y:p.height-p.y)*.85),dead=Math.min(12,extent/4),y=p.y+sign*(dead+(extent-dead)*.94),key=direction==='Up'?'Ctrl-Home':'Ctrl-End';
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}]});
  try{await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y,id:1}]});await tab.playwright.getByText(`cmux cannot send ${key} as a key; no terminal input was sent`,{exact:true}).waitFor({state:'visible',timeoutMs:3000});for(let repaint=0;repaint<10;repaint++){await new Promise(resolve=>setTimeout(resolve,100));assert.equal(prompt(await tab.playwright.locator('.terminal').innerText()),initial,'The Claude prompt must remain unchanged across delayed repaints');}if(direction==='Up')await writeFile(proofPath.replace('.json','.png'),await tab.screenshot({fullPage:false}));}
  finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
  checks.push({direction,key,visibleError:true,promptUnchanged:true});
 }
 const result={passed:true,scope:'Actual Claude Code in owned empty directory, Chrome428x926 finger primitives; corruption prevented, navigation remains unavailable',runId:info.runId,workspace:info.workspaceId,surface:info.shellSurfaceId,checks,sourceSha256:createHash('sha256').update(await readFile(new URL('../bridge.mjs',import.meta.url))).digest('hex')};await writeFile(proofPath,JSON.stringify(result,null,2)+'\n');return result;
}
