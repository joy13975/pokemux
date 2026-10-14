import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function verifyFloatingPaste(tab,cdp){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8')),log=new URL('state/paste-final-fixture.log',root),offset=(await readFile(log,'utf8')).length;
 const records=async()=>(await readFile(log,'utf8')).slice(offset).split('\n').filter(l=>l.startsWith('Pokemux client diagnostic ')).map(l=>JSON.parse(l.slice('Pokemux client diagnostic '.length)));
 const wait=async check=>{const until=Date.now()+7000;while(!await check()){assert.ok(Date.now()<until,'Expected paste outcome');await new Promise(r=>setTimeout(r,25))}};
 const box=selector=>tab.playwright.locator(selector).evaluate(e=>e.getBoundingClientRect().toJSON());
 const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x,y}]});
 const tap=async selector=>{const b=await box(selector);await touch('touchStart',b.x+b.width/2,b.y+b.height/2);await touch('touchEnd');await tab.getAXState({emit:false})};
 const clipboard=await tab.clipboard.read();
 try{
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:428,height:926,deviceScaleFactor:3,mobile:true});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await tab.goto(info.origin+'/fixture');await tab.getAXState({emit:false});
  await tab.clipboard.writeText('POKEMUX_FRESH_TAP');const before=(await readFile(info.log,'utf8')).length;
  const h=await box('#floatingHandle'),cx=h.x+h.width/2,cy=h.y+h.height/2;
  await touch('touchStart',cx,cy);await touch('touchMove',cx-32,cy);await tab.getAXState({emit:false});
  const b=await box('[data-function="2"]');await touch('touchMove',b.x+b.width/2,b.y+b.height/2);await new Promise(r=>setTimeout(r,1141));await touch('touchEnd');await tab.getAXState({emit:false});
  assert.equal(await tab.playwright.locator('#nativePaste').count(),0);assert.equal(await tab.playwright.locator('[data-function="2"]').textContent(),'Tap to paste');assert.equal(await tab.playwright.locator('[data-function="2"]').getAttribute('aria-pressed'),'true');
  await wait(async()=>(await records()).some(e=>e.event==='floating-release'&&e.choice===2));const page=(await records()).find(e=>e.event==='floating-release'&&e.choice===2).page;
  assert.equal((await records()).filter(e=>e.page===page&&e.event==='paste-request').length,0);assert.equal((await readFile(info.log,'utf8')).length,before);
  const exposed=await tab.playwright.locator('[data-function]').evaluateAll(bs=>bs.every(b=>{const r=b.getBoundingClientRect();return [r.left+12,r.right-12].every(x=>document.elementFromPoint(x,r.top+r.height/2)?.closest('[data-function]')===b)}));assert.ok(exposed,'Expanded floating actions stay above the joystick');
  const ready=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(new URL('proof-floating-paste-ready.png',root),Buffer.from(ready.data,'base64'));
  await tap('[data-function="2"]');await wait(async()=>(await records()).some(e=>e.page===page&&e.event==='paste-delivered'));
  const fresh=(await records()).filter(e=>e.page===page);assert.equal(fresh.filter(e=>e.event==='paste-request').length,1);assert.equal(fresh.filter(e=>e.event==='paste-denied').length,0);
  const hex=[...(await readFile(info.log,'utf8')).slice(before).matchAll(/RECV:([0-9a-f]+)/g)].map(m=>m[1]).join('');assert.equal(Buffer.from(hex,'hex').toString(),'\x1b[200~POKEMUX_FRESH_TAP\x1b[201~');assert.equal(await tab.playwright.locator('#floatingHandle').getAttribute('aria-expanded'),'false');
  const sourceSha256={};for(const f of ['index.html','server.mjs'])sourceSha256[f]=createHash('sha256').update(await readFile(new URL(f,root))).digest('hex');
  const result={passed:true,time:new Date().toISOString(),scope:'Chrome actual touch428x926, real clipboard and isolated stock cmux; physical-phone before trace separate',checks:['1141ms drag preserves highlighted Paste without requesting clipboard','one fresh tap sends exact clipboard bytes once without fallback','panel closes after paste; no separate hint'],sourceSha256};await writeFile(new URL('BROWSER_FLOATING_PASTE_RESULT.json',root),JSON.stringify(result,null,2)+'\n');return result;
 }finally{if(clipboard.length)await tab.clipboard.write(clipboard);else await tab.clipboard.writeText('')}
}
