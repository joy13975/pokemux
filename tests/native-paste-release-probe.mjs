import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join,basename} from 'node:path';

export async function setPasteReleaseVariant(root,variant,{releaseEndpointOnly=false}={}){
 assert.equal(basename(root),'paste-probe','Only the disposable probe artifact may change');let html=await readFile(join(root,'state/feature-index.html'),'utf8');
 const arm="control.dataset.pasteReady=String(choice);syncFloating();armFloating(choice)";assert.equal(html.split(arm).length,2);
 if(variant==='direct')html=html.replace(arm,"runFloating('paste')");
 else if(variant==='click')html=html.replace(arm,"control.querySelector('[data-function=\"'+choice+'\"]').click()");
 else if(variant==='touchend'){
  html=html.replace('let start,hold;\n const finish=', 'let start,hold,pasteOnTouchEnd=false;\n const finish=');
  html=html.replace(arm,'pasteOnTouchEnd=true');
  html=html.replace(' handle.onpointercancel=()=>{finish();expandFloating(false)};'," handle.ontouchend=()=>{if(pasteOnTouchEnd){pasteOnTouchEnd=false;runFloating('paste')}};handle.onpointercancel=()=>{pasteOnTouchEnd=false;finish();expandFloating(false)};");
 }else assert.equal(variant,'control');
 if(releaseEndpointOnly){
  const pointer="e.preventDefault();const {mode,wasOpen}=start;if(mode==='choose')";
  assert.equal(html.split(pointer).length,2);
  html=html.replace(pointer,"e.preventDefault();if(!start.mode&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>28){start.mode='choose';expandFloating(true)}const {mode,wasOpen}=start;if(mode==='choose')");
 }
 await writeFile(join(root,'index.html'),html);
}

export async function beginPasteProbe(root,variant){
 const info=JSON.parse(await readFile(join(root,'state/browser-fixture-info.json'),'utf8')),log=await readFile(join(root,'state/paste-probe.log'),'utf8'),raw=await readFile(info.log,'utf8');
 return {variant,time:new Date().toISOString(),logOffset:log.length,rawOffset:raw.length};
}
export async function finishPasteProbe(root,before,uiState){
 const info=JSON.parse(await readFile(join(root,'state/browser-fixture-info.json'),'utf8')),log=(await readFile(join(root,'state/paste-probe.log'),'utf8')).slice(before.logOffset),events=log.split('\n').filter(l=>l.startsWith('Pokemux client diagnostic ')).map(l=>JSON.parse(l.slice(26))),raw=(await readFile(info.log,'utf8')).slice(before.rawOffset),bytes=Buffer.concat(raw.split('\n').filter(l=>l.startsWith('RECV:')).map(l=>Buffer.from(l.slice(5),'hex')));
 const result={variant:before.variant,time:before.time,releases:events.filter(e=>e.event==='floating-release').map(e=>({choice:e.choice,selecting:e.selecting,moving:e.moving,activation:e.activation})),requests:events.filter(e=>e.event==='paste-request').length,denied:events.filter(e=>e.event==='paste-denied').map(e=>e.error),deliveredKnownProbe:bytes.toString().split('POKEMUX_PASTE_PROBE').length-1,nativePasteBubble:/text Description: Paste,/.test(uiState)};
 assert.ok(result.deliveredKnownProbe<=1,'A release must never paste twice');return result;
}
