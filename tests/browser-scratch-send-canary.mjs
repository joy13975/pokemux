import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function verifyScratchSend(tab,cdp){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8'));
 assert.ok((await tab.url()).endsWith('/'+info.surfaceId),'Use only the owned terminal fixture');
 const bytes=async path=>Buffer.concat((await readFile(path,'utf8')).split('\n').filter(l=>l.startsWith('RECV:')).map(l=>Buffer.from(l.slice(5),'hex'))),first=await bytes(info.log),second=await bytes(info.log+'-second');
 const tap=async selector=>{const r=await tab.playwright.locator(selector).evaluate(e=>e.getBoundingClientRect().toJSON());assert.ok(r.width&&r.height);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await tab.playwright.domSnapshot()};
 await tap(`[data-surface="${info.secondSurfaceId}"]`);await tap('#floatingHandle');await tap('[data-function="4"]');
 const text='Scratchpad Send 日本語';await tap('#scratchText');await tab.playwright.locator('#scratchText').press('Meta+A');await cdp.send('Input.insertText',{text});await tab.playwright.domSnapshot();assert.equal(await tab.playwright.locator('#scratchText').evaluate(e=>e.value),text);assert.equal(await tab.playwright.locator('#scratchSend').isEnabled(),true);
 const button=await tab.playwright.locator('#scratchSend').evaluate(e=>e.getBoundingClientRect().toJSON()),pad=await tab.playwright.locator('#scratchpad').evaluate(e=>e.getBoundingClientRect().toJSON());assert.ok(button.x>=pad.x&&button.x+button.width<=pad.x+pad.width&&button.height>0&&button.height<44);
 await writeFile(new URL('SCRATCH_SEND_UI.png',root),await tab.screenshot({fullPage:false}));await tap('#scratchSend');
 const expected=Buffer.from('\x1b[200~'+text+'\x1b[201~'),deadline=Date.now()+5000;while((await bytes(info.log+'-second')).length<second.length+expected.length){assert.ok(Date.now()<deadline,'Owned native terminal receives draft');await new Promise(r=>setTimeout(r,25))}
 assert.deepEqual((await bytes(info.log+'-second')).subarray(second.length),expected,'Only bracketed text, no Enter');assert.deepEqual(await bytes(info.log),first,'Inactive tab unchanged');assert.equal(await tab.playwright.locator('#scratchLayer').evaluate(e=>e.hidden),false);
 assert.equal(await tab.playwright.locator('.inputdock').evaluate(e=>e.hidden),true);
 assert.equal(await tab.playwright.locator('#scratchText').evaluate(e=>e.value),'');await tap('#scratchClose');
 const sourceSha256={};for(const file of ['index.html','server.mjs','bridge.mjs'])sourceSha256[file]=createHash('sha256').update(await readFile(new URL(file,root))).digest('hex');const result={passed:true,time:new Date().toISOString(),scope:'iPhone layout, actual touch taps, authenticated app through stock cmux into owned raw-input terminal; no existing workspace input',target:'second owned tab',draftCleared:true,noEnter:true,inactiveTabUnchanged:true,button,pad,sourceSha256};await writeFile(new URL('SCRATCH_SEND_RESULT.json',root),JSON.stringify(result,null,2)+'\n');return result;
}
