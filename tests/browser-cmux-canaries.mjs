import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function* verifyRealCmux(tab,cdp) {
 const info=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8'));
 const checks=[],steps=[],timings=[];
 const observe=()=>tab.getAXState({emit:false});
 const box=s=>tab.playwright.locator(s).evaluate(e=>e.getBoundingClientRect().toJSON());
 const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
 const tap=async s=>{const r=await box(s);assert.ok(r.width>0&&r.height>0&&r.y>=0&&r.bottom<=926,'Visible touch target');const x=r.x+r.width/2,y=r.y+r.height/2;await touch('touchStart',x,y);await touch('touchEnd');steps.push({tap:s,x,y});await observe()};
 const key=k=>`.typing-layout:not([hidden]) [data-typing-key=${JSON.stringify(k)}]`;
 const bytes=async second=>{const text=await readFile(info.log+(second?'-second':''),'utf8');return Buffer.from([...text.matchAll(/RECV:([0-9a-f]+)/g)].map(m=>m[1]).join(''),'hex')};
 const wait=async f=>{const end=Date.now()+10000;while(!await f()){assert.ok(Date.now()<end,'Expected real cmux delivery/render');await new Promise(r=>setTimeout(r,25))}};
 const select=async id=>{await tap(`.surfacetab[data-surface="${id}"]`);await wait(async()=>await tab.playwright.locator('.surfacetab.active').getAttribute('data-surface')===id)};
 const output=()=>tab.playwright.locator('.terminal').textContent();
 const typing=async text=>{for(const c of text)await tap(key(c===' '?'Space':c))};
 await wait(async()=> (await output()).includes('POKEMUX_TEST_READY'));
 assert.equal(await tab.playwright.locator('.terminal').getAttribute('contenteditable'),'false');
 assert.equal((await bytes(false)).length,0);assert.equal((await bytes(true)).length,0);
 for(const c of 'sync'){const start=Date.now();await tap(key(c));await wait(async()=> (await bytes(false)).toString().endsWith(c)&&(await output()).includes('RECV:'+Buffer.from(c).toString('hex')));timings.push(Date.now()-start)}
 assert.equal((await bytes(false)).toString(),'sync');assert.equal((await bytes(true)).length,0);
 checks.push({result:'Custom touch keys reach real cmux once and stream their byte echo into the selected tab; other tab remains empty',touchToObservedEchoMilliseconds:timings});
 yield {checkpoint:checks.length,check:checks.at(-1)};
 const burst='thequickbrownfox'.repeat(4)+'tail',before=(await bytes(false)).length,rects={};for(const c of new Set(burst))rects[c]=await box(key(c));const start=Date.now();
 for(const c of burst){const r=rects[c];await touch('touchStart',r.x+r.width/2,r.y+r.height/2);await touch('touchEnd')}
 await observe();await wait(async()=> (await bytes(false)).length>=before+burst.length);
 assert.equal((await bytes(false)).subarray(before).toString(),burst);assert.equal((await bytes(true)).length,0);
 const lastHex=(await readFile(info.log,'utf8')).trim().split('\n').at(-1);await wait(async()=> (await output()).includes(lastHex));
 checks.push({result:'64-key touch burst arrives exactly once in real cmux and its final byte echo renders',charactersPerSecond:burst.length/((Date.now()-start)/1000)});
 yield {checkpoint:checks.length,check:checks.at(-1)};
 let count=(await bytes(false)).length;const r=await box(key('Backspace'));await touch('touchStart',r.x+r.width/2,r.y+r.height/2);await new Promise(r=>setTimeout(r,850));
 await wait(async()=> (await bytes(false)).length-count>=6);const held=(await bytes(false)).subarray(count);assert.ok([...held].every(b=>b===127));await touch('touchEnd');await observe();await new Promise(r=>setTimeout(r,180));count=(await bytes(false)).length;await new Promise(r=>setTimeout(r,200));assert.equal((await bytes(false)).length,count);
 await tap(key('z'));await wait(async()=> (await bytes(false)).length===count+1);assert.equal((await bytes(false)).at(-1),122);await wait(async()=> (await output()).includes('RECV:7a'));
 checks.push('Held Backspace repeats into real cmux before release, stops after release, and following typing streams immediately');yield {checkpoint:checks.length,check:checks.at(-1)};
 await select(info.secondSurfaceId);await wait(async()=> (await output()).includes('POKEMUX_TEST_READY'));await typing('tabtwo');await wait(async()=> (await bytes(true)).toString()==='tabtwo');assert.equal((await bytes(false)).at(-1),122);
 await tap(key('Language'));await tap('#languageHiragana');await typing('konnichiha');assert.equal((await bytes(true)).toString(),'tabtwo');await tap(key('Space'));await wait(async()=> (await bytes(true)).toString()==='tabtwoこんにちは');
 await tap(key('Enter'));await wait(async()=> (await bytes(true)).at(-1)===13);await tap(key('Language'));await tap('#languageEnglish');
 await wait(async()=> (await output()).includes(Buffer.from('こんにちは').toString('hex')));
 checks.push('Switching real tabs isolates input; Japanese romaji remains local until commit, exact UTF-8 arrives, Enter is separate');yield {checkpoint:checks.length,check:checks.at(-1)};
 await select(info.shellSurfaceId);await wait(async()=> (await output()).includes('%'));
 await typing('echo pokemuxlivx');await tap(key('Backspace'));await tap(key('e'));
 await wait(async()=> (await output()).includes('echo pokemuxlive'));
 const editing=await tab.playwright.locator('.remote-cursor').evaluate(e=>{
  const row=e.parentElement,spans=[...row.querySelectorAll('span:not(.remote-cursor)')],last=spans.find(s=>s.textContent.endsWith('echo pokemuxlive'));
  return {cursor:e.getBoundingClientRect().toJSON(),row:row.getBoundingClientRect().toJSON(),text:row.textContent,edge:last?.getBoundingClientRect().toJSON(),viewport:e.closest('.terminalwrap').getBoundingClientRect().toJSON()};
 });
 assert.ok(editing.text.includes('echo pokemuxlive'));assert.ok(editing.edge,'Typed command must end a rendered glyph span');assert.ok(Math.abs(editing.cursor.left-editing.edge.right)<1,'Cursor must follow the entered text at its rendered span boundary');assert.ok(editing.cursor.left>=editing.viewport.left&&editing.cursor.right<=editing.viewport.right,'Cursor must be horizontally visible');assert.ok(editing.cursor.top>=editing.viewport.top&&editing.cursor.bottom<=editing.viewport.bottom+1);assert.ok(editing.cursor.height>=editing.row.height*.8&&editing.cursor.height<=editing.row.height*1.2);

 await tap(key('Enter'));await wait(async()=> (await output()).split('pokemuxlive').length>=3);
 checks.push({result:'Actual zsh line editing, Backspace/retyping and command execution render with visible row-aligned authoritative cursor',editing});yield {checkpoint:checks.length,check:checks.at(-1)};
 for(const c of 'abc'){await tap(key('Dismiss'));assert.equal(await tab.playwright.locator('#softwareKeyboard').isVisible(),false);const view=await box('.terminalwrap');await touch('touchStart',view.x+30,view.y+30);await touch('touchEnd');await observe();assert.equal(await tab.playwright.locator('#softwareKeyboard').isVisible(),true);await tap(key(c))}
 await wait(async()=>await tab.playwright.locator('.remote-cursor').evaluate(e=>e.parentElement.textContent.includes('abc')));
 await tap('.inputdock [data-key="Ctrl-C"]');await typing('echo ready');await tap(key('Enter'));await wait(async()=> (await output()).split('ready').length>=3);
 checks.push('Three dismissal/single-tap reopen cycles retain rail, input and cursor; default Ctrl-C interrupts without a dialog and following command executes');yield {checkpoint:checks.length,check:checks.at(-1)};
 await tap(key('Language'));await tap('#languageKatakana');await typing('neko');await tap(key('Space'));await wait(async()=>await tab.playwright.locator('.remote-cursor').evaluate(e=>e.parentElement.textContent.includes('ネコ')));await tap(key('Language'));await tap('#languageEnglish');
 await tab.screenshot({fullPage:false}).then(b=>writeFile(new URL('../proof-real-cmux-current.png',import.meta.url),b));
 checks.push('Japanese commits also render as glyphs in real zsh with authoritative cursor, not only hexadecimal fixture output');
 const sourceSha256={};for(const f of ['index.html','grid.mjs','bridge.mjs','kana.mjs'])sourceSha256[f]=createHash('sha256').update(await readFile(new URL('../'+f,import.meta.url))).digest('hex');
 const receipt={time:new Date().toISOString(),passed:true,scope:'Pokemux application and CmuxBridge using stock cmux terminals in one owned workspace; Chrome input-engine touch at428x926, not physical iPhone or UIKit',workspaceId:info.workspaceId,sourceSha256,checks,steps};
 await writeFile(new URL('../BROWSER_CMUX_CURRENT_RESULT.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');return receipt;
}
