import { homedir } from 'node:os';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

export async function snapshotClaudeTyping(){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/claude-typing-info.json',root),'utf8'));
 const rpc=(method,params)=>JSON.parse(execFileSync('/Applications/cmux.app/Contents/Resources/bin/cmux',['--socket',`${homedir()}/.local/state/cmux/cmux.sock`,'--json','rpc',method,JSON.stringify(params)],{encoding:'utf8'}));
 const params={workspace_id:info.workspaceId,surface_id:info.tuiSurfaceId},inventory=rpc('surface.list',{workspace_id:info.workspaceId});assert.ok(inventory.surfaces.some(s=>s.id===info.tuiSurfaceId));
 const native=rpc('surface.read_text',params);await writeFile(new URL('state/claude-native-typing.json',root),JSON.stringify({time:new Date().toISOString(),surfaceId:info.tuiSurfaceId,text:native.text},null,2)+'\n');
}

export async function* verifyClaudeTyping(tab,cdp,{diagnosticLog}){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/claude-typing-info.json',root),'utf8'));
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:428,height:879,deviceScaleFactor:3,mobile:true});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 assert.ok((await tab.url()).endsWith(`/${info.workspaceId}/${info.tuiSurfaceId}`));
 const text=()=>tab.playwright.locator('.terminal').textContent();assert.match(await text(),/Claude Code v/);
 const rects=await tab.playwright.locator('.typing-layout:not([hidden]) [data-typing-key]').evaluateAll(es=>Object.fromEntries(es.map(e=>{const r=e.getBoundingClientRect();return [e.dataset.typingKey,{x:r.x+r.width/2,y:r.y+r.height/2}]})));
 const touch=(type,touchPoints=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
 const tap=async key=>{await touch('touchStart',[{id:1,...rects[key]}]);await touch('touchEnd')};
 const events=async offset=>(await readFile(diagnosticLog,'utf8')).slice(offset).split('\n').filter(l=>l.startsWith('Pokemux client diagnostic ')).map(l=>JSON.parse(l.slice('Pokemux client diagnostic '.length)));
 const wait=async test=>{const until=Date.now()+10000;while(!await test()){assert.ok(Date.now()<until,'Typing result must arrive');await new Promise(r=>setTimeout(r,25))}};
 const checks=[];await tab.playwright.locator('.terminal').press('Control+u');await wait(async()=>!(await text()).includes('asdfasdf'));
 for(const [mode,word] of [['single','qwerasdfzxcv'],['two-overlapping','tyuighjkvbnm'],['four-overlapping','poiulkjhmnbv']]){
  const expected=word.repeat(3),offset=(await readFile(diagnosticLog,'utf8')).length,start=Date.now();
  if(mode==='single'){for(const key of expected)await tap(key)}else{
   const count=mode==='two-overlapping'?2:4;
   for(let i=0;i<expected.length;i+=count){const group=[...expected.slice(i,i+count)].map((key,j)=>({id:j+1,...rects[key]}));
    for(let j=0;j<group.length;j++)await touch('touchStart',group.slice(0,j+1));
    for(const point of group)await touch('touchEnd',[point]);
   }
  }
  await wait(async()=>(await text()).includes(expected));
  const burstToDisplayMs=Date.now()-start;yield {snapshotRequired:mode,expected,burstToDisplayMs};
  const native=JSON.parse(await readFile(new URL('state/claude-native-typing.json',root),'utf8'));assert.equal(native.surfaceId,info.tuiSurfaceId);assert.ok(Date.parse(native.time)>=start+burstToDisplayMs,'Native snapshot must follow this exact burst');assert.ok(native.text.includes(expected),`Native Claude composer must contain every ${mode} character`);
  await wait(async()=>(await text()).includes(expected));const fresh=await events(offset),page=fresh.find(e=>e.event==='key-down')?.page;assert.ok(page);const es=fresh.filter(e=>e.page===page),counts=Object.fromEntries(['touchstart','touchend','key-down','key-up'].map(name=>[name,es.filter(e=>e.event===name).length]));const until=Date.now()+3000;let records=es;while(Object.values(counts).some(count=>count<expected.length)&&Date.now()<until){await new Promise(r=>setTimeout(r,25));records=(await events(offset)).filter(e=>e.page===page);for(const name of Object.keys(counts))counts[name]=records.filter(e=>e.event===name).length}
  await writeFile(new URL('state/claude-typing-phase.json',root),JSON.stringify({mode,counts,expected:expected.length,nativeEcho:true,phoneEcho:true},null,2)+'\n');for(const count of Object.values(counts))assert.equal(count,expected.length,'Every contact phase must survive the diagnostic transport');assert.ok(records.filter(e=>e.event==='key-up').every(e=>e.accepted),'Every completed key is accepted');
  checks.push({mode,characters:expected.length,counts,burstToDisplayMs,nativeEcho:true,phoneEcho:true});
  if(mode==='four-overlapping'){const screenshot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(new URL('proof-claude-typing.png',root),Buffer.from(screenshot.data,'base64'))}
  for(let i=0;i<expected.length;i++)await tap('Backspace');await wait(async()=>!(await text()).includes(word));await tab.getAXState({emit:false});
 }
 const result={passed:true,time:new Date().toISOString(),scope:'Chrome428x879 input-engine finger contacts through Pokemux to disposable stock cmux Claude Code composer; not physical iPhone acceptance',checks,hash:createHash('sha256').update(await readFile(new URL('index.html',root))).digest('hex')};await writeFile(new URL('BROWSER_CLAUDE_TYPING_RESULT.json',root),JSON.stringify(result,null,2)+'\n');return result;
}
