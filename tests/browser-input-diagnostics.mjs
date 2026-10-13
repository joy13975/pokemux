import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function verifyInputDiagnostics(tab,cdp){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8'));
 const wait=async predicate=>{const until=Date.now()+7000;while(!await predicate()){assert.ok(Date.now()<until,'Expected diagnostic/UI result');await new Promise(r=>setTimeout(r,25))}};
 const touch=async selector=>{const r=await tab.playwright.locator(selector).evaluate(e=>e.getBoundingClientRect().toJSON());assert.ok(r.width&&r.height);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await tab.getAXState({emit:false})};
 const diagnostics=async()=>((await readFile(new URL('state/diagnostic-fixture.log',root),'utf8')).split('\n').filter(l=>l.startsWith('Pokemux client diagnostic ')).map(l=>JSON.parse(l.slice('Pokemux client diagnostic '.length))));
 const before=(await diagnostics()).length,clipboard=await tab.clipboard.read();
 try{
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:428,height:926,deviceScaleFactor:3,mobile:true});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await touch(`.surfacetab[data-surface="${info.secondSurfaceId}"]`);
  await touch('.typing-layout:not([hidden]) [data-typing-key="Dismiss"]');assert.equal(await tab.playwright.locator('#softwareKeyboard').evaluate(e=>e.hidden),true);
  await touch('.terminalwrap');assert.equal(await tab.playwright.locator('#softwareKeyboard').evaluate(e=>e.hidden),false);
  await touch('.typing-layout:not([hidden]) [data-typing-key="q"]');
  await tab.clipboard.writeText('DIAGNOSTIC_CANARY');await touch('#floatingHandle');await touch('[data-function="2"]');
  await wait(async()=> (await diagnostics()).slice(before).some(e=>e.event==='paste-delivered'));
  const events=(await diagnostics()).slice(before),names=events.map(e=>e.event);
  for(const event of ['tab-switch','terminal-replaced','pointerdown','pointerup','hide','keyboard-state','engage','paste-request','paste-read','paste-send','paste-delivered'])assert.ok(names.includes(event),event);
  assert.ok(events.some(e=>e.event==='keyboard-state'&&e.hidden));assert.ok(events.some(e=>e.event==='keyboard-state'&&!e.hidden));assert.ok(events.some(e=>e.event==='pointerdown'&&e.target==='hide'&&e.trusted));
  assert.equal(JSON.stringify(events).includes('DIAGNOSTIC_CANARY'),false);
  const bytes=[...(await readFile(info.log+'-second','utf8')).matchAll(/RECV:([0-9a-f]+)/g)].map(m=>m[1]).join('');assert.ok(Buffer.from(bytes,'hex').toString().includes('DIAGNOSTIC_CANARY'),'Actual cmux terminal receives clipboard payload');
  const screenshot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(new URL('proof-input-diagnostics.png',root),Buffer.from(screenshot.data,'base64'));
  const sourceSha256={};for(const f of ['index.html','server.mjs'])sourceSha256[f]=createHash('sha256').update(await readFile(new URL(f,root))).digest('hex');
  const result={passed:true,time:new Date().toISOString(),scope:'Chrome real touch input428x926, real clipboard API, real authenticated HTTP logging and isolated stock cmux terminal',events,sourceSha256};await writeFile(new URL('INPUT_DIAGNOSTICS_RESULT.json',root),JSON.stringify(result,null,2)+'\n');return {passed:true,events:names};
 }finally{if(clipboard.length)await tab.clipboard.write(clipboard);else await tab.clipboard.writeText('')}
}
