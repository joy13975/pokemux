import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function* verifyNativeClaudeTyping(app,{points,diagnosticLog,prefix=''}){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/claude-typing-info.json',root),'utf8')),expected='asdf'.repeat(9),offset=(await readFile(diagnosticLog,'utf8')).length;
 const before=Date.now();for(const key of expected){assert.ok(points[key]);await app.click(points[key])}const contactDurationMs=Date.now()-before;await app.getAXState({emit:false});yield {snapshotRequired:'native-safari',expected:prefix+expected,contactDurationMs};
 const native=JSON.parse(await readFile(new URL('state/claude-native-typing.json',root),'utf8'));assert.equal(native.surfaceId,info.tuiSurfaceId);assert.ok(Date.parse(native.time)>=before+contactDurationMs,'Native snapshot must follow this exact burst');assert.ok(native.text.includes(prefix+expected),'Native Claude composer must preserve every Simulator contact');
 const rows=(await readFile(diagnosticLog,'utf8')).slice(offset).split('\n').filter(l=>l.startsWith('Pokemux client diagnostic ')).map(l=>JSON.parse(l.slice('Pokemux client diagnostic '.length))),page=rows.find(e=>e.event==='key-down')?.page,events=rows.filter(e=>e.page===page),counts=Object.fromEntries(['touchstart','touchend','key-down','key-up'].map(name=>[name,events.filter(e=>e.event===name).length]));
 for(const count of Object.values(counts))assert.equal(count,expected.length,'Native Safari captures every contact phase');assert.ok(events.filter(e=>e.event==='key-up').every(e=>e.accepted));
 await writeFile(new URL('proof-native-claude-typing.png',root),await app.getScreenshot({emit:false}));
 const result={passed:true,time:new Date().toISOString(),scope:'Native iPhone13ProMax Simulator iOS26.3 Safari coordinate clicks converted to single-finger contacts; no overlapping physical thumbs',characters:expected.length,contactDurationMs,counts,nativeEcho:true,hash:createHash('sha256').update(await readFile(new URL('index.html',root))).digest('hex')};await writeFile(new URL('NATIVE_CLAUDE_TYPING_RESULT.json',root),JSON.stringify(result,null,2)+'\n');return result;
}
