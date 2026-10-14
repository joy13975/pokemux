import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function verifyRawTouches(tab,cdp,{diagnosticLog}){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8'));
 assert.ok((await tab.url()).endsWith(`/${info.workspaceId}/${info.surfaceId}`));
 const logBefore=await readFile(diagnosticLog,'utf8'),offset=logBefore.length,beforeRecords=logBefore.split('\n').filter(l=>l.startsWith('Pokemux client diagnostic ')).map(l=>JSON.parse(l.slice('Pokemux client diagnostic '.length))),bytes=async()=>Buffer.concat((await readFile(info.log,'utf8')).split('\n').filter(l=>l.startsWith('RECV:')).map(l=>Buffer.from(l.slice(5),'hex'))),before=(await bytes()).length;
 const points=await tab.playwright.evaluate(()=>[...'qwer'].map(key=>{const r=document.querySelector(`.typing-layout:not([hidden]) [data-typing-key="${key}"]`).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}));
 for(const point of points){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...point}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
 const events=async()=>(await readFile(diagnosticLog,'utf8')).slice(offset).split('\n').filter(l=>l.startsWith('Pokemux client diagnostic ')).map(l=>JSON.parse(l.slice('Pokemux client diagnostic '.length)));
 const names=['touchstart','touchend','pointerdown','pointerup','key-down','key-up'];let page,records,baseline;
 const until=Date.now()+7000;
 while(true){
  const fresh=await events();page??=fresh.find(e=>e.event==='touchstart'&&Math.abs(e.x-points[0].x)<1&&Math.abs(e.y-points[0].y)<1)?.page;
  records=fresh.filter(e=>e.page===page);baseline=beforeRecords.filter(e=>e.page===page).at(-1)?.inputDelivered||0;
  if(page&&names.every(name=>records.filter(e=>e.event===name).length===4)&&records.some(e=>e.event==='input-counts'&&e.inputDelivered===baseline+4))break;
  assert.ok(Date.now()<until,'All phases and delivery arrive for this tested page');await new Promise(r=>setTimeout(r,25));
 }
 const counts={};for(const name of names){counts[name]=records.filter(e=>e.event===name).length;assert.equal(counts[name],4,name)}
 const starts=records.filter(e=>e.event==='touchstart');assert.ok(starts.every(e=>e.trusted&&e.hasKey&&e.target==='keyboard'&&Number.isFinite(e.eventAt)&&Number.isFinite(e.touch)));
 assert.equal(records.some(e=>['text','value','data','key'].some(k=>k in e)),false);
 assert.deepEqual((await bytes()).subarray(before),Buffer.from('qwer'));
 const sourceSha256={};for(const file of ['index.html','server.mjs'])sourceSha256[file]=createHash('sha256').update(await readFile(new URL(file,root))).digest('hex');
 const result={passed:true,time:new Date().toISOString(),scope:'Chrome actual four rapid finger contacts, authenticated diagnostic HTTP and disposable stock cmux; not a reproduction of remaining iPhone loss',counts,burstDurationMs:starts.at(-1).at-starts[0].at,sourceSha256};
 await writeFile(new URL('RAW_TOUCH_DIAGNOSTICS_RESULT.json',root),JSON.stringify(result,null,2)+'\n');return result;
}
