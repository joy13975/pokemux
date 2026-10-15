import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function verifyModifierLocks(tab,cdp,{root=new URL('../',import.meta.url)}={}){
 const info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8'));
 assert.ok((await tab.url()).endsWith(`/${info.workspaceId}/${info.surfaceId}`));
 const bytes=async()=>Buffer.concat((await readFile(info.log,'utf8')).split('\n').filter(l=>l.startsWith('RECV:')).map(l=>Buffer.from(l.slice(5),'hex'))),offset=(await bytes()).length;
 const box=s=>tab.playwright.locator(s).evaluate(e=>e.getBoundingClientRect().toJSON());
 const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 const tap=async s=>{const r=await box(s);await touch('touchStart',[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]);await touch('touchEnd');await tab.getAXState({emit:false})};
 const mod=k=>`#viewportDock [data-key="${k}"]`,key=k=>`.typing-layout:not([hidden]) [data-typing-key="${k}"]`;
 await tap(mod('Ctrl'));assert.equal(await tab.playwright.locator(mod('Ctrl')).getAttribute('aria-description'),'Next key only; tap again to lock');
 await tap(mod('Ctrl'));assert.equal(await tab.playwright.locator(mod('Ctrl')).getAttribute('aria-description'),'Locked; tap to release');
 for(const k of ['c','d','k','c'])await tap(key(k));
 await tap('#viewportDock [data-key="Ctrl-C"]');
 assert.equal(await tab.playwright.locator(mod('Ctrl')).getAttribute('aria-pressed'),'true');
 const geometry=await tab.playwright.locator(mod('Ctrl')).evaluate(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('.modifier-lock').getBoundingClientRect();return {key:a.toJSON(),badge:b.toJSON(),locked:e.classList.contains('locked')}});
 assert.ok(geometry.locked&&geometry.badge.width>0&&geometry.badge.left>=geometry.key.left&&geometry.badge.right<=geometry.key.right&&geometry.badge.top>=geometry.key.top&&geometry.badge.bottom<=geometry.key.bottom);
 const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(new URL('proof-modifier-lock.png',root),Buffer.from(shot.data,'base64'));
 await tap(mod('Ctrl'));await tap(key('x'));
 await tap(mod('Alt'));await tap(mod('Alt'));await tap(key('x'));await tap(key('y'));await tap(mod('Alt'));
 await tap(mod('Shift'));await tap(mod('Shift'));await tap(key('a'));await tap(key('b'));await tap(mod('Shift'));
 await tap(mod('Ctrl'));await tap(mod('Ctrl'));
 await tap(key('Dismiss'));assert.equal(await tab.playwright.locator(mod('Ctrl')).getAttribute('aria-pressed'),'false');
 const expected=Buffer.from([3,4,11,3,3,120,27,120,27,121,65,66]);
 const deadline=Date.now()+5000;while((await bytes()).length<offset+expected.length){assert.ok(Date.now()<deadline,'Real cmux receives every shortcut');await new Promise(r=>setTimeout(r,25))}
 assert.deepEqual((await bytes()).subarray(offset),expected);
 const sourceSha256={};for(const file of ['index.html','bridge.mjs'])sourceSha256[file]=createHash('sha256').update(await readFile(new URL(file,root))).digest('hex');
 const result={passed:true,time:new Date().toISOString(),scope:'Chrome iPhone13ProMax actual touch input through authenticated bridge to disposable stock cmux',expectedHex:expected.toString('hex'),geometry,sourceSha256};
 await writeFile(new URL('BROWSER_MODIFIER_LOCK_RESULT.json',root),JSON.stringify(result,null,2)+'\n');return result;
}
