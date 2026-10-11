import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function* verifyControls(tab,cdp){
 const info=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8')),checks=[],steps=[];
 const observe=()=>tab.getAXState({emit:false}),box=s=>tab.playwright.locator(s).evaluate(e=>e.getBoundingClientRect().toJSON());
 let contact=false;const touch=async(type,x,y)=>{if(type==='touchEnd'&&!contact)return;await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});contact=type!=='touchEnd';steps.push({type,x,y})};
 const wait=async f=>{const end=Date.now()+8000;while(!await f()){assert.ok(Date.now()<end,'Expected observable control outcome');await new Promise(r=>setTimeout(r,25))}};
 const tap=async s=>{const r=await box(s);assert.ok(r.width&&r.height&&r.top>=0&&r.bottom<=926,'Visible target '+s);await touch('touchStart',r.x+r.width/2,r.y+r.height/2);await touch('touchEnd');await observe()};
 const key=k=>`.typing-layout:not([hidden]) [data-typing-key=${JSON.stringify(k)}]`;
 const bytes=async()=>Buffer.from([...(await readFile(info.log+'-second','utf8')).matchAll(/RECV:([0-9a-f]+)/g)].map(m=>m[1]).join(''),'hex');
 try{
 await tap(`.surfacetab[data-surface="${info.secondSurfaceId}"]`);
 await tap(key('Language'));await tap('#languageEnglish');
 const keyboard=await box('#softwareKeyboard'),terminal=await box('.terminalwrap');let before=(await bytes()).length;
 await tap(key('Language'));await wait(async()=>await tab.playwright.locator('#languagePopover').evaluate(e=>e.matches(':popover-open')));
 const chooser=await box('.language-choices'),anchor=await box(key('Language'));
 assert.ok(chooser.left>=0&&chooser.right<=428&&chooser.top>=0&&chooser.bottom<=anchor.top+1&&anchor.top-chooser.bottom<=16&&chooser.left<=anchor.right&&chooser.right>=anchor.left,'Language choices must be adjacent above their key within the viewport');
 assert.deepEqual(await box('#softwareKeyboard'),keyboard);assert.deepEqual(await box('.terminalwrap'),terminal);
 await touch('touchStart',terminal.x+50,terminal.y+80);await touch('touchEnd');await observe();await wait(async()=>!await tab.playwright.locator('#languagePopover').evaluate(e=>e.matches(':popover-open')));
 await tap(key('Language'));await tab.pressKey(null,'Escape');await observe();await wait(async()=>!await tab.playwright.locator('#languagePopover').evaluate(e=>e.matches(':popover-open')));assert.equal((await bytes()).length,before);
 checks.push({name:'Language popover anchors above its key without moving keyboard/terminal, dismisses outside and owns physical Escape',chooser,anchor});yield checks.at(-1);
 await touch('touchStart',terminal.x+50,terminal.y+80);await touch('touchEnd');await observe();
 await tab.pressKey(null,'x');await wait(async()=> (await bytes()).length===before+1);assert.equal((await bytes()).at(-1),120);
 checks.push('Physical keyboard continues reaching custom terminal input after native focus is released');yield checks.at(-1);
 const move=await box('#cursorJoystick');await touch('touchStart',move.x+move.width/2,move.y+move.height/2);await new Promise(r=>setTimeout(r,430));await touch('touchMove',370,888);await touch('touchEnd');await observe();await wait(async()=>Math.abs((await box('#cursorJoystick')).x+22-370)<2);
 const joy=await box('#cursorJoystick'),x=joy.x+joy.width/2,y=joy.y+joy.height/2,wordEvidence=[];
 for(const [dx,direction,sequence] of [[-100,'Left','\x1bb'],[100,'Right','\x1bf']]){
  const startX=direction==='Left'?x:Math.min(x,300);if(direction==='Right'){await touch('touchStart',x,y);await new Promise(r=>setTimeout(r,430));await touch('touchMove',startX,y);await touch('touchEnd');await observe()}
  before=(await bytes()).length;await touch('touchStart',startX,y);await touch('touchMove',startX+dx,y);await new Promise(r=>setTimeout(r,360));await observe();
  const highlight=await tab.playwright.locator('#cursorJoystick').evaluate(e=>({directions:[...e.querySelectorAll('[data-direction].active')].map(p=>p.dataset.direction),words:[...e.querySelectorAll('[data-word-direction].active')].map(p=>p.dataset.wordDirection),oppositeHidden:[...e.querySelectorAll('[data-word-direction]:not(.active)')].every(p=>getComputedStyle(p).display==='none')}));assert.equal(highlight.directions.join(','),direction);assert.equal(highlight.words.join(','),direction);assert.equal(highlight.oppositeHidden,true);
  await writeFile(new URL('../proof-joystick-'+direction.toLowerCase()+'.png',import.meta.url),await tab.screenshot({fullPage:false}));await touch('touchEnd');await observe();await new Promise(r=>setTimeout(r,180));const delta=(await bytes()).subarray(before).toString();assert.ok(delta.length>=4);assert.equal(delta.split(sequence).join(''),'','Only word-navigation bytes may reach cmux');const stopped=(await bytes()).length;await new Promise(r=>setTimeout(r,200));assert.equal((await bytes()).length,stopped);wordEvidence.push({direction,hex:Buffer.from(delta).toString('hex'),highlight});
 }
 checks.push({name:'Held left/right word movement repeats only native navigation bytes, highlights one side, and stops on release',wordEvidence});yield checks.at(-1);
 before=(await bytes()).length;for(const modifier of ['Ctrl','Alt','Shift'])await tap('.inputdock [data-key="'+modifier+'"]');const modifiedJoy=await box('#cursorJoystick');await touch('touchStart',modifiedJoy.x+22,modifiedJoy.y+22);await touch('touchMove',modifiedJoy.x+22-100,modifiedJoy.y+22);await touch('touchEnd');await observe();await wait(async()=> (await bytes()).length>before);assert.equal((await bytes()).subarray(before).toString(),'\x1b[1;8D');checks.push('Joystick word-left preserves combined Control, Option and Shift modifiers');yield checks.at(-1);
 await tap(`.surfacetab[data-surface="${info.shellSurfaceId}"]`);await tap('.inputdock [data-key="Ctrl"]');await tap(key('u'));
 for(const c of 'one two three')await tap(key(c===' '?'Space':c));
 const currentJoy=await box('#cursorJoystick'),cx=currentJoy.x+22,cy=currentJoy.y+22;await touch('touchStart',cx,cy);await touch('touchMove',cx-100,cy);await touch('touchEnd');await observe();await tap(key('x'));
 await wait(async()=>await tab.playwright.locator('.remote-cursor').evaluate(e=>e.parentElement.textContent.includes('one two xthree')));
 const line=await tab.playwright.locator('.remote-cursor').evaluate(e=>e.parentElement.textContent);assert.ok(line.includes('one two xthree'));await tap('.inputdock [data-key="Ctrl"]');await tap(key('u'));
 checks.push({name:'Actual zsh word-left places following typed text inside the previous word instead of inserting b',line});yield checks.at(-1);
 const result={time:new Date().toISOString(),passed:true,scope:'Actual Chrome touch/physical key input engine 428x926; stock cmux owned workspace only',sourceSha256:createHash('sha256').update(await readFile(new URL('../index.html',import.meta.url))).digest('hex'),checks,steps};await writeFile(new URL('../BROWSER_CONTROLS_RESULT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');return result;
 }finally{await touch('touchEnd')}
}
