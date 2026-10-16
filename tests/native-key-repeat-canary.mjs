import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function* verifyNativeKeyRepeats(app,{points,diagnosticLog}){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/claude-typing-info.json',root),'utf8'));
 const result={passed:false,time:new Date().toISOString(),scope:'Native iPhone13ProMax Simulator iOS26.3 Safari same-location triple taps and alternating s/o; not physical iPhone acceptance',hash:createHash('sha256').update(await readFile(new URL('index.html',root))).digest('hex')};
 try{
 const state=await app.getAXState({emit:false,disableDiffing:true}),address=/(\d+) text field[^\n]*Description: Address/.exec(state);assert.ok(address,'Native Safari must be foreground');
 await app.click(Number(address[1]));const editing=await app.getAXState({emit:false,disableDiffing:true});
 assert.ok(editing.includes(`Value: localhost:4391/#${info.windowId}/${info.workspaceId}/${info.tuiSurfaceId}`),'Native Safari must target this owned fixture');
 const cancel=/(\d+) button Description: Close, ID: CancelBarItemButton/.exec(editing);assert.ok(cancel);await app.click(Number(cancel[1]));await app.getAXState({emit:false});
 const composer=text=>text.split('\n').filter(line=>line.startsWith('❯')).at(-1)?.slice(1).trim();
 const before=JSON.parse(await readFile(new URL('state/claude-native-typing.json',root),'utf8'));
 assert.equal(before.surfaceId,info.tuiSurfaceId);assert.ok(Date.parse(before.time)>Date.now()-15000);assert.match(composer(before.text),/^Try "/,'Start from an empty active Claude composer');
 const contacts=[...Array.from({length:5},()=>({key:'o',count:3})),...[...'so'.repeat(8)].map(key=>({key,count:1}))],expected=contacts.map(({key,count})=>key.repeat(count)).join('');
 const offset=(await readFile(diagnosticLog,'utf8')).length,start=Date.now();
 for(const {key,count} of contacts){assert.ok(points[key]);await app.click(points[key],{clickCount:count})}
 const contactDurationMs=Date.now()-start;await app.getAXState({emit:false});yield {snapshotRequired:'native-key-repeats',expected};
 const native=JSON.parse(await readFile(new URL('state/claude-native-typing.json',root),'utf8'));
 assert.equal(native.surfaceId,info.tuiSurfaceId);assert.ok(Date.parse(native.time)>=start+contactDurationMs);
 assert.equal(composer(native.text),expected,'Every same-key and alternating-key touch must reach the actual Claude composer');
 const rows=(await readFile(diagnosticLog,'utf8')).slice(offset).split('\n').filter(l=>l.startsWith('Pokemux client diagnostic ')).map(l=>JSON.parse(l.slice('Pokemux client diagnostic '.length)));
 const pages=new Set(rows.filter(e=>e.event==='key-down').map(e=>e.page));assert.equal(pages.size,1);
 const events=rows.filter(e=>pages.has(e.page)).sort((a,b)=>a.order-b.order),counts={};
 for(const event of ['touchstart','touchend','key-down','key-up']){counts[event]=events.filter(e=>e.event===event).length;assert.equal(counts[event],expected.length,event+' must account for every injected native touch')}
 assert.ok(events.filter(e=>e.event==='key-up').every(e=>e.accepted));
 const starts=events.filter(e=>e.event==='touchstart'),sameKeyIntervalsMs=starts.slice(1,15).map((e,i)=>e.eventAt-starts[i].eventAt);
 assert.ok(sameKeyIntervalsMs.every(ms=>ms>0&&ms<300),'Exercise repeated same-location contacts inside the double-tap interval');
 await writeFile(new URL('proof-native-key-repeats.png',root),await app.getScreenshot({emit:false}));
 Object.assign(result,{passed:true,characters:expected.length,contactDurationMs,counts,sameKeyIntervalsMs,nativeEcho:true,ownedURLVerified:true,emptyComposerVerified:true});return result;
 }finally{await writeFile(new URL('NATIVE_KEY_REPEAT_RESULT.json',root),JSON.stringify(result,null,2)+'\n')}
}
