import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function verifyScrollSettings(tab,cdp){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8')),result={passed:false,time:new Date().toISOString(),scope:'Chrome touch engine, iPhone13ProMax428x879, real stock cmux fullscreen less; not physical-phone acceptance'};
 const box=selector=>tab.playwright.locator(selector).evaluate(e=>e.getBoundingClientRect().toJSON()),text=()=>tab.playwright.locator('.terminal').textContent(),top=async()=>Number((await text()).match(/WHEEL_CANARY_(\d+)/)?.[1]);
 let touching=false;const touch=async(type,points=[])=>{if(type==='touchEnd'&&!touching)return;await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});touching=type!=='touchEnd'||points.length>0};
 const tap=async selector=>{const r=await box(selector);assert.ok(r.y>=0&&r.bottom<=879);await touch('touchStart',[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]);await touch('touchEnd');await tab.getAXState({emit:false})};
 const wait=async predicate=>{const end=Date.now()+5000;while(!await predicate()){assert.ok(Date.now()<end,'Native TUI result arrives');await new Promise(r=>setTimeout(r,25))}};
 const range=async(id,value)=>{const input=tab.playwright.locator('#'+id);await input.press('Home');const n=await input.evaluate((e,value)=>(value-Number(e.min))/Number(e.step),value);for(let i=0;i<n;i++)await input.press('ArrowRight');assert.equal(await input.evaluate(e=>Number(e.value)),value)};
 const settings=async(sensitivity,inertia)=>{await tap('#appActions');await tap('#menuSettings');await range('typingSize',12);await range('scrollSensitivity',sensitivity);await range('scrollInertia',inertia);await tap('#dialogClose')};
 const terminal=()=>tab.playwright.locator('.terminal'),reset=async()=>{await terminal().press('g');await wait(async()=>await top()===0)};
 const swipe=async()=>{const r=await box('.terminalwrap'),x=r.x+r.width/2,y=Math.min(r.bottom-80,r.y+350);await touch('touchStart',[{id:1,x,y}]);for(let i=1;i<=6;i++)await touch('touchMove',[{id:1,x,y:y-i*20}]);await touch('touchEnd');await tab.getAXState({emit:false})};
 try{
  assert.equal(await terminal().getAttribute('data-surface-id'),info.surfaceId);assert.equal(await tab.playwright.locator('#softwareKeyboard').isVisible(),false);
  await terminal().press('z');await wait(async()=>(await text()).includes('RECV:7a'));result.systemInput=true;
  await settings(1,0);await terminal().press('Control+s');await wait(async()=>(await text()).includes('WHEEL_CANARY_0000'));
  await swipe();await wait(async()=>await top()>0);await new Promise(r=>setTimeout(r,350));const one=await top();
  await settings(2,0);await reset();await swipe();await wait(async()=>await top()>0);await new Promise(r=>setTimeout(r,350));const two=await top();Object.assign(result,{oneTimesRows:one,twoTimesRows:two});assert.equal(two,one*2,'Identical finger displacement scrolls twice as far');
  await settings(2,50);await reset();await swipe();await wait(async()=>await top()>two);const coast=await top();
  const r=await box('.terminalwrap'),point={id:1,x:r.x+r.width/2,y:r.y+200};await touch('touchStart',[point]);await tab.getAXState({emit:false});await new Promise(r=>setTimeout(r,150));const stopped=await top();await new Promise(r=>setTimeout(r,300));assert.equal(await top(),stopped,'A new finger stops the coast');await touch('touchEnd');
  await tab.reload();await tab.getAXState({emit:false});assert.equal(await tab.playwright.locator('#softwareKeyboard').isVisible(),false);await tap('#appActions');await tap('#menuSettings');assert.equal(await tab.playwright.locator('#keyboardMode').evaluate(e=>e.value),'native');assert.equal(await tab.playwright.locator('#scrollSensitivity').evaluate(e=>e.value),'2');assert.equal(await tab.playwright.locator('#scrollInertia').evaluate(e=>e.value),'50');
  await writeFile(new URL('proof-scroll-settings.png',root),await tab.screenshot({fullPage:false}));await tap('#dialogClose');await terminal().press('q');await wait(async()=>(await text()).includes('POKEMUX_TEST_READY'));
  Object.assign(result,{passed:true,oneTimesRows:one,twoTimesRows:two,coastRows:coast,stoppedRows:stopped,settingsPersist:true,nativeDefault:true,hash:createHash('sha256').update(await readFile(new URL('index.html',root))).digest('hex')});return result;
 }finally{await touch('touchEnd');await writeFile(new URL('BROWSER_SCROLL_SETTINGS_RESULT.json',root),JSON.stringify(result,null,2)+'\n')}
}
