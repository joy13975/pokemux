import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function* verifyDock(tab,cdp){
 const info=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8'));assert.ok((await tab.url()).includes('/'+info.workspaceId+'/'));
 const before=await readFile(info.log,'utf8'),steps=[],checks=[];
 const box=selector=>tab.playwright.locator(selector).evaluate(e=>e.getBoundingClientRect().toJSON());
 const state=()=>tab.playwright.locator('.inputdock').evaluate(e=>({hidden:e.classList.contains('strip-hidden'),height:e.getBoundingClientRect().height,expanded:document.querySelector('#dialog').open}));
 let touching=false;
 const touch=async(type,x,y)=>{if(['touchEnd','touchCancel'].includes(type)&&!touching)return;touching=!['touchEnd','touchCancel'].includes(type);const touchPoints=['touchEnd','touchCancel'].includes(type)?[]:[{id:1,x,y}];steps.push({type,touchPoints});await cdp.send('Input.dispatchTouchEvent',{type,touchPoints})};
 const pull=async(selector,offsets,cancel=false)=>{const b=await box(selector),x=b.x+b.width/2,y=b.y+Math.min(10,b.height/2);await touch('touchStart',x,y);for(const offset of offsets)await touch('touchMove',x,y+offset);await touch(cancel?'touchCancel':'touchEnd');await tab.getAXState({emit:false})};
 try{
 assert.equal((await state()).hidden,false);const full=(await state()).height,b=await box('.shortcut-grip'),x=b.x+b.width/2,y=b.y+b.height/2;
 await touch('touchStart',x,y);await touch('touchMove',x,y+28);const halfway=(await state()).height;assert.ok(halfway<full&&halfway>32,'Collapse follows finger before release');await touch('touchMove',x,y+2);await touch('touchEnd');await tab.getAXState({emit:false});assert.equal((await state()).hidden,false);
 await pull('.shortcut-grip',[28,60]);assert.equal((await state()).hidden,true);assert.equal(await tab.playwright.locator('.inputdock [data-key="Esc"]').isVisible(),false);assert.equal(await tab.playwright.locator('.shortcut-grip').isVisible(),true);
 await writeFile(new URL('../proof-dock-hidden.png',import.meta.url),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:428,height:926,scale:1}})).data,'base64'));
 checks.push('Downward pull hides the keys while preserving a reachable handle; reversal cancels');yield checks.at(-1);
 await pull('.shortcut-grip',[-30,-60,-2]);assert.equal((await state()).hidden,true);
 await pull('.shortcut-grip',[-30,-60],true);assert.equal((await state()).hidden,true);
 await pull('.shortcut-grip',[-30,-60]);assert.deepEqual({hidden:(await state()).hidden,expanded:(await state()).expanded},{hidden:false,expanded:false});
 checks.push('Upward pull restores strip first; reversal and cancelled contact retain hidden state');yield checks.at(-1);
 await pull('.shortcut-grip',[-30,-90]);assert.equal((await state()).expanded,true);
 await pull('.shortcut-grip',[30,100]);assert.equal((await state()).expanded,false);assert.equal((await state()).hidden,false);
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:320,height:926,deviceScaleFactor:3,mobile:true});await tab.getAXState({emit:false});
 const rail=await box('.keygroups'),left=await tab.playwright.locator('.keygroups').evaluate(e=>e.scrollLeft);await touch('touchStart',rail.right-40,rail.y+20);await touch('touchMove',rail.right-140,rail.y+20);await touch('touchEnd');await tab.getAXState({emit:false});assert.ok(await tab.playwright.locator('.keygroups').evaluate(e=>e.scrollLeft)>left);
 assert.equal(await readFile(info.log,'utf8'),before,'Dock gestures send no terminal input');
 checks.push('Next pull expands; down stows to strip; horizontal key scrolling remains intact without terminal input');yield checks.at(-1);
 const result={passed:true,time:new Date().toISOString(),scope:'Chrome input-engine touch:428x926 dock and320px overflow on owned real cmux workspace',sourceSha256:createHash('sha256').update(await readFile(new URL('../index.html',import.meta.url))).digest('hex'),checks,steps};await writeFile(new URL('../BROWSER_DOCK_RESULT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');return result;
 }finally{await touch('touchCancel');await cdp.send('Emulation.setDeviceMetricsOverride',{width:428,height:926,deviceScaleFactor:3,mobile:true})}
}
