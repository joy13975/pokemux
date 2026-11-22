import { homedir } from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function verifyMetadata(tab,cdp){
 const info=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8')),checks=[],steps=[];
 assert.ok(info.groupId&&info.groupedWorkspaceId,'Run the owned group fixture');
 const rpc=(method,params)=>JSON.parse(execFileSync('/Applications/cmux.app/Contents/Resources/bin/cmux',['--socket',`${homedir()}/.local/state/cmux/cmux.sock`,'--json','rpc',method,JSON.stringify(params)],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const tap=async selector=>{let last;await wait(async()=>{const r=await tab.playwright.locator(selector).evaluate(e=>e.getBoundingClientRect().toJSON()),stable=last&&['x','y','width','height'].every(k=>Math.abs(r[k]-last[k])<.1);last=r;return stable});const r=await tab.playwright.locator(selector).evaluate(e=>e.getBoundingClientRect().toJSON());assert.ok(r.width&&r.height&&r.top>=0&&r.bottom<=926,'Visible '+selector);const x=r.x+r.width/2,y=r.y+r.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});steps.push({selector,x,y});await tab.getAXState({emit:false})};
 const wait=async f=>{const end=Date.now()+5000;while(!await f()){assert.ok(Date.now()<end,'Expected live metadata change');await new Promise(r=>setTimeout(r,25))}};
 let notice;
 try{
  await tap('#sidebarToggle');await tap(`[data-workspace="${info.groupedWorkspaceId}"]`);assert.equal(await tab.playwright.locator('.surfacetab.active').getAttribute('data-surface'),info.groupedSurfaceId);assert.equal(await tab.playwright.locator('.surfacetab').count(),1);
  await tap('#sidebarToggle');await tap('.groupname');assert.ok(await tab.playwright.locator(`.surfacetab[data-surface="${info.surfaceId}"]`).count());assert.equal(await tab.playwright.locator('.surfacetab').count(),info.shellSurfaceId?3:2);
  checks.push('Actual group header selects its anchor tabs; member selection shows only member tabs.');
  notice=rpc('notification.create_for_target',{window_id:info.windowId,workspace_id:info.workspaceId,surface_id:info.secondSurfaceId,title:'Pokemux owned unread canary',subtitle:'',body:'Disposable verification',effects:{record:true,markUnread:true,reorderWorkspace:false,desktop:false,sound:false,command:false,paneFlash:false}}).id;
  const indicator=`.surfacetab[data-surface="${info.secondSurfaceId}"] .dot.amber`;
  await wait(async()=>await tab.playwright.locator(indicator).count()===1);assert.equal(await tab.playwright.locator(`.surfacetab[data-surface="${info.surfaceId}"] .dot`).count(),0);
  await tap('#sidebarToggle');assert.equal(await tab.playwright.locator('#inboxCount').textContent(),'1');assert.equal(await tab.playwright.locator('.groupname .dot.amber').count(),1);assert.equal(await tab.playwright.locator(`[data-workspace="${info.groupedWorkspaceId}"] .dot`).count(),0);await writeFile(new URL('../proof-metadata-unread.png',import.meta.url),await tab.screenshot({fullPage:false}));await tap('#scrim');
  rpc('notification.mark_read',{id:notice});await wait(async()=>await tab.playwright.locator(indicator).count()===0);
  await tap('#sidebarToggle');assert.equal(await tab.playwright.locator('.groupname .dot').count(),0);assert.equal(await tab.playwright.locator('#inboxCount').textContent(),'0');await tap('#scrim');
  checks.push('Real unread notification streams an orange dot only onto its target tab and workspace; mark-read removes it without reload.');
  const sourceSha256={};for(const file of ['index.html','bridge.mjs'])sourceSha256[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
  const result={passed:true,time:new Date().toISOString(),scope:'Chrome input-engine touches at428x926 with two owned stock-cmux workspaces and isolated notification',sourceSha256,checks,steps};await writeFile(new URL('../BROWSER_METADATA_RESULT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');return result;
 }finally{if(notice)rpc('notification.dismiss',{id:notice})}
}
