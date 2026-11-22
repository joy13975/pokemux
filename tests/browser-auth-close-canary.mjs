import { homedir } from 'node:os';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export async function* verifyAuthAndClose(tab,cdp){
 const info=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8')),checks=[],steps=[];
 const wait=async f=>{const end=Date.now()+7000;while(!await f()){assert.ok(Date.now()<end,'Expected terminal navigation/close outcome');await new Promise(r=>setTimeout(r,25))}};
 const touch=async(type,x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x,y}]});steps.push({type,x,y})};
 const press=async(selector,hold=0)=>{let last;await wait(async()=>{const r=await tab.playwright.locator(selector).evaluate(e=>e.getBoundingClientRect().toJSON()),stable=last&&['x','y','width','height'].every(k=>Math.abs(r[k]-last[k])<.1);last=r;return stable});assert.ok(last.width&&last.top>=0&&last.bottom<=926,'Visible '+selector);await touch('touchStart',last.x+last.width/2,last.y+last.height/2);if(hold)await new Promise(r=>setTimeout(r,hold));await touch('touchEnd');await tab.getAXState({emit:false})};
 const tree=()=>JSON.parse(execFileSync('/Applications/cmux.app/Contents/Resources/bin/cmux',['--socket',`${homedir()}/.local/state/cmux/cmux.sock`,'--json','rpc','system.tree','{"all_windows":true}'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 await tab.goto(info.origin+'/fixture');await tab.getAXState({emit:false});await tab.goto(info.origin+'/setup');
 await wait(async()=>new URL(await tab.url()).pathname==='/');await tab.getAXState({emit:false});assert.equal(await tab.playwright.locator('.surfacetab').count(),3);
 checks.push('Authenticated setup automatically connects and opens real terminals without pressing Open terminals');yield checks.at(-1);
 await press(`.surfacetab[data-surface="${info.secondSurfaceId}"]`,650);await press('#tabClose');await wait(async()=>await tab.playwright.locator(`.surfacetab[data-surface="${info.secondSurfaceId}"]`).count()===0);assert.equal(await tab.playwright.locator('.surfacetab').count(),2);assert.ok(tree().windows.flatMap(w=>w.workspaces).some(w=>w.id===info.workspaceId));
 checks.push('Closing an ordinary tab removes only that surface and preserves its workspace and sibling tabs');yield checks.at(-1);
 await press('#sidebarToggle');await press(`[data-workspace="${info.groupedWorkspaceId}"]`);assert.equal(await tab.playwright.locator('.surfacetab').count(),1);await press('.surfacetab',650);await press('#tabClose');
 await wait(async()=>!tree().windows.flatMap(w=>w.workspaces).some(w=>w.id===info.groupedWorkspaceId));await wait(async()=>await tab.playwright.locator(`.surfacetab[data-surface="${info.surfaceId}"]`).count()===1);assert.equal(await tab.playwright.locator('#dialog').evaluate(e=>e.open),false);assert.equal(await tab.playwright.locator('.surfacetab').count(),2);
 await wait(async()=>await tab.playwright.locator('.inputdock [data-key="Tab"]').getAttribute('disabled')===null);assert.equal(await tab.playwright.locator('.notice').isVisible(),false,'Reconnected terminal must not falsely claim input is disabled');
 const before=await readFile(info.log,'utf8');await press('.typing-layout:not([hidden]) [data-typing-key="q"]');await wait(async()=>/RECV:[0-9a-f]+/.test((await readFile(info.log,'utf8')).slice(before.length)));assert.equal([...((await readFile(info.log,'utf8')).slice(before.length)).matchAll(/RECV:([0-9a-f]+)/g)].map(m=>m[1]).join(''),'71');
 const capture=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:428,height:926,scale:1}});await writeFile(new URL('../proof-auth-close-after.png',import.meta.url),Buffer.from(capture.data,'base64'));
 checks.push('Closing the final tab closes only its owned workspace, dismisses controls and shows remaining workspace tabs with live typing and no stale pause banner');yield checks.at(-1);
 const sourceSha256={};for(const f of ['setup.mjs','setup.html','bridge.mjs','index.html'])sourceSha256[f]=createHash('sha256').update(await readFile(new URL('../'+f,import.meta.url))).digest('hex');
 const result={passed:true,time:new Date().toISOString(),scope:'Chrome input-engine touch428x926, authenticated setup with isolated test session and real stock-cmux terminals; physical passkey dialog not certified',checks,steps,sourceSha256};await writeFile(new URL('../BROWSER_AUTH_CLOSE_RESULT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');return result;
}
