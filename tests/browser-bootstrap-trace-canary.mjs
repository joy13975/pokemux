import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function verifyBootstrapTrace(tab,cdp){
 const log=new URL('../state/bootstrap-trace-fixture.log',import.meta.url),before=(await readFile(log,'utf8')).length;
 await tab.goto('http://localhost:4392/setup');await tab.playwright.getByRole('textbox',{name:'Glyph probe terminal',exact:true}).waitFor({state:'visible',timeoutMs:10000});
 const state=()=>tab.playwright.evaluate(()=>({width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale,terminal:document.querySelector('.terminal').getBoundingClientRect().toJSON(),sidebar:document.querySelector('#shell').classList.contains('sidebar-open')}));
 const initial=await state();assert.equal(initial.width,428);assert.equal(initial.height,926);assert.equal(initial.scale,1);assert.equal(initial.sidebar,false);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id}))});
 await touch('touchStart',[[100,200],[300,400]]);let pinched;
 try{await touch('touchMove',[[170,270],[230,330]]);pinched=await state();assert.ok(pinched.terminal.width<initial.terminal.width);assert.equal(pinched.scale,1)}finally{await touch('touchEnd')}
 const deadline=Date.now()+3000;let frames;
 do{frames=(await readFile(log,'utf8')).slice(before).split('\n').filter(line=>line.startsWith('Pokemux client diagnostic ')).map(line=>JSON.parse(line.slice('Pokemux client diagnostic '.length)));if(frames.some(f=>f.event==='bootstrap'&&f.phase==='ready'))break;await new Promise(resolve=>setTimeout(resolve,25))}while(Date.now()<deadline);
 const startup=frames.filter(f=>f.event==='bootstrap'),phases=startup.map(f=>f.phase);for(const phase of ['initial','tree','ready'])assert.ok(phases.includes(phase));for(const frame of startup){assert.equal(frame.width,428);assert.equal(frame.scale,1);assert.equal(frame.rects.length,5);assert.equal(frame.rects.every(rect=>rect.length===4&&rect.every(Number.isFinite)),true)}
 const sourceSha256={};for(const file of ['index.html','server.mjs'])sourceSha256[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
 await writeFile(new URL('../BOOTSTRAP_TRACE_RESULT.png',import.meta.url),await tab.screenshot({fullPage:false}));const result={passed:true,scope:'Tracing only; isolated renderer, authenticated setup transition428x926 and actual finger pinch. Does not reproduce or fix physical first-auth half-scale or emoji regression.',initial,pinched,startup,sourceSha256};await writeFile(new URL('../BOOTSTRAP_TRACE_RESULT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');return result;
}
