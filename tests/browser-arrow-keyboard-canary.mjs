import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function verifyArrowKeyboard(tab,cdp){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8'));assert.ok((await tab.url()).endsWith('/'+info.surfaceId));
 const state=()=>tab.playwright.evaluate(()=>{const h=document.querySelector('#cursorJoystick'),p=document.querySelector('.terminal'),w=p.closest('.terminalwrap');return{keyboardHidden:document.querySelector('#softwareKeyboard').hidden,typing:document.querySelector('#viewportDock').classList.contains('typing'),focus:document.activeElement===p,terminal:w.getBoundingClientRect().toJSON(),control:h.getBoundingClientRect().toJSON(),canvas:p.parentElement.style.width,scale:visualViewport.scale}}),bytes=async()=>[...(await readFile(info.log,'utf8')).matchAll(/^RECV:(.+)$/gm)].map(m=>m[1]).join('');
 const tap=async(type,point)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:point?[{id:1,x:point.x,y:point.y}]:[]});
 const initial=await state();assert.equal(initial.keyboardHidden,false,'Start with Pokemux keyboard visible');
 await tap('touchStart',{x:initial.control.x+22,y:initial.control.y+22});await tap('touchEnd');await tab.playwright.domSnapshot();
 const before=await state(),prior=await bytes(),point=await tab.playwright.locator('[data-cursor-direction="Left"][data-cursor-step="near"]').evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
 await tap('touchStart',point);
 const deadline=Date.now()+5000;
 while((await bytes()).length<prior.length+12){assert.ok(Date.now()<deadline,'Held arrows must repeat into stock cmux');await new Promise(r=>setTimeout(r,25))}
 const held=await state();assert.equal(held.keyboardHidden,false);assert.equal(held.typing,true);assert.equal(held.focus,before.focus);assert.deepEqual(held.terminal,before.terminal);assert.deepEqual(held.control,before.control);assert.equal(held.canvas,before.canvas);assert.equal(held.scale,1);
 await writeFile(new URL('ARROW_KEEP_KEYBOARD.png',root),await tab.screenshot({fullPage:false}));await tap('touchEnd');await tab.playwright.domSnapshot();
 const after=await state();assert.equal(after.keyboardHidden,false);assert.equal(after.typing,true);assert.deepEqual(after.terminal,before.terminal);assert.match((await bytes()).slice(prior.length),/^(1b5b44){2,}$/);
 const result={passed:true,time:new Date().toISOString(),scope:'Actual finger hold/release at iPhone13ProMax layout through authenticated app to disposable stock cmux, Pokemux keyboard',before,held,after,sourceSha256:createHash('sha256').update(await readFile(new URL('index.html',root))).digest('hex')};await writeFile(new URL('ARROW_KEEP_KEYBOARD_RESULT.json',root),JSON.stringify(result,null,2)+'\n');return result;
}
