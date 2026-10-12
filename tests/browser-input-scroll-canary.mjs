import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export async function* verifyInputScroll(tab, cdp) {
 const info=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8'));
 assert.ok((await tab.url()).endsWith(`/${info.workspaceId}/${info.surfaceId}`),'Use the owned raw terminal');
 const steps=[],checks=[],box=selector=>tab.playwright.locator(selector).evaluate(e=>e.getBoundingClientRect().toJSON());
 let touching=false;
 const touch=async(type,touchPoints=[])=>{if(type==='touchEnd'&&!touching)return;touching=type!=='touchEnd'||touchPoints.length>0;steps.push({type,touchPoints});await cdp.send('Input.dispatchTouchEvent',{type,touchPoints})};
 const tap=async selector=>{const r=await box(selector);await touch('touchStart',[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]);await touch('touchEnd');await tab.getAXState({emit:false})};
 const wait=async predicate=>{const until=Date.now()+5000;while(!await predicate()){assert.ok(Date.now()<until,'Observable result arrives');await new Promise(r=>setTimeout(r,30))}};
 const bytes=async()=>Buffer.concat((await readFile(info.log,'utf8')).split('\n').filter(l=>l.startsWith('RECV:')).map(l=>Buffer.from(l.slice(5),'hex')));
 const screen=()=>tab.playwright.locator('.terminal').textContent();
 try {
  const before=(await bytes()).length,a=await box('[data-typing-key="a"]'),b=await box('[data-typing-key="b"]');
  const pa={id:1,x:a.x+a.width/2,y:a.bottom-3},pb={id:2,x:b.x+b.width/2,y:b.y+b.height/2};
  for(let n=0;n<10;n++){await touch('touchStart',[pa]);if(n%5===4)await touch('touchMove',[{...pa,y:a.bottom+2}]);await touch('touchEnd')}
  for(let n=0;n<20;n++){await touch('touchStart',[pa]);await touch('touchStart',[pa,pb]);await touch('touchMove',[{...pa,y:a.bottom+2},pb]);await touch('touchEnd',[pb]);await touch('touchEnd')}
  const expected=Buffer.from('a'.repeat(10)+'ba'.repeat(20));await wait(async()=>(await bytes()).length>=before+expected.length);assert.deepEqual((await bytes()).subarray(before),expected);
  checks.push('50 custom-key characters arrive exactly once, including key-gap drift and overlapping contacts');yield checks.at(-1);
  for(let n=0;n<5;n++){await tap('.typing-layout:not([hidden]) [data-typing-key="Dismiss"]');assert.equal(await tab.playwright.locator('#softwareKeyboard').isVisible(),false);await new Promise(r=>setTimeout(r,300));assert.equal(await tab.playwright.locator('#softwareKeyboard').isVisible(),false);await tap('.terminalwrap');assert.equal(await tab.playwright.locator('#softwareKeyboard').isVisible(),true)}
  checks.push('Five custom Hide/tap cycles remain hidden until deliberate terminal touch; not a reproduction of the intermittent report');yield checks.at(-1);
  await tab.playwright.getByRole('textbox',{name:'Terminal terminal',exact:true}).press('Control+s');await wait(async()=>(await screen()).startsWith('WHEEL_CANARY_0000'));
  const swipe=async(from,to)=>{await touch('touchStart',[{id:1,x:180,y:from}]);for(let n=1;n<=6;n++)await touch('touchMove',[{id:1,x:180,y:from+(to-from)*n/6}]);await touch('touchEnd')};
  await swipe(350,230);await wait(async()=>Number((await screen()).match(/^WHEEL_CANARY_(\d+)/)?.[1])>0);const down=Number((await screen()).match(/^WHEEL_CANARY_(\d+)/)[1]);
  const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:428,height:926,scale:1}});await writeFile(new URL('../proof-input-scroll.png',import.meta.url),Buffer.from(shot.data,'base64'));
  await swipe(230,350);await wait(async()=>Number((await screen()).match(/^WHEEL_CANARY_(\d+)/)?.[1])<down);
  await tab.playwright.getByRole('textbox',{name:'Terminal terminal',exact:true}).press('q');await wait(async()=>(await screen()).includes('POKEMUX_TEST_READY'));
  checks.push('Finger swipes move fullscreen less down and back up through stock cmux wheel input');yield checks.at(-1);
  await tap('#sidebarToggle');const add=`[data-new-workspace="${info.groupId}"]`;await wait(async()=>Math.abs((await box('#sidebar')).left)<.1);
  await tap(add);await wait(async()=>{const fresh=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8'));return fresh.ownedWorkspaceIds.length>info.ownedWorkspaceIds.length});
  const fresh=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8')),created=fresh.ownedWorkspaceIds.filter(id=>!info.ownedWorkspaceIds.includes(id));assert.equal(created.length,1);
  const native=JSON.parse(execFileSync('/Applications/cmux.app/Contents/Resources/bin/cmux',['--socket','/Users/USER/.local/state/cmux/cmux.sock','--json','rpc','workspace.group.list',JSON.stringify({window_id:info.windowId})],{encoding:'utf8'}));assert.ok(native.groups.find(g=>g.id===info.groupId).member_workspace_ids.includes(created[0]));
  await wait(async()=>(await tab.url()).includes('/'+created[0]+'/'));
  await wait(async()=>await tab.playwright.locator('.terminal').getAttribute('aria-readonly')==='false'&&(await screen()).length>0);
  await tap('[data-typing-key="q"]');await wait(async()=>(await screen()).includes('q'));
  await tap('[data-typing-key="Backspace"]');await wait(async()=>!(await screen()).includes('q'));
  await tap('#sidebarToggle');await wait(async()=>Math.abs((await box('#sidebar')).left)<.1);
  const groupShot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:428,height:926,scale:1}});await writeFile(new URL('../proof-group-add.png',import.meta.url),Buffer.from(groupShot.data,'base64'));
  checks.push('Group plus creates exactly one native workspace in the clicked group, selects it, and streams typed q and its deletion');yield checks.at(-1);
  const hashes={};for(const file of ['index.html','bridge.mjs','grid.mjs'])hashes[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
  const result={passed:true,time:new Date().toISOString(),scope:'Chrome input-engine touch, iPhone13ProMax428x926, disposable real cmux workspace; not physical iPhone',checks,hashes,steps};await writeFile(new URL('../BROWSER_INPUT_SCROLL_RESULT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');return result;
 }finally{await touch('touchEnd')}
}
