import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function verifyKeyboardReturn(tab,cdp){
 const info=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8')),steps=[];
 const tap=async selector=>{const r=await tab.playwright.locator(selector).evaluate(e=>e.getBoundingClientRect().toJSON());assert.ok(r.width>0&&r.height>0&&r.y>=0&&r.bottom<=926,'Touch target visible');const x=r.x+r.width/2,y=r.y+r.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});steps.push({selector,x,y});await tab.getAXState({emit:false})};
 const key=k=>`.typing-layout:not([hidden]) [data-typing-key="${k}"]`;
 const delivered=async()=>Buffer.from([...((await readFile(info.log,'utf8')).matchAll(/RECV:([0-9a-f]+)/g))].map(m=>m[1]).join(''),'hex').toString();
 const wait=async f=>{const end=Date.now()+5000;while(!await f()){assert.ok(Date.now()<end);await new Promise(r=>setTimeout(r,25))}};
 await wait(async()=>await tab.playwright.locator('#softwareKeyboard').isVisible());
 const initial=await delivered();
 await tap(key('Language'));await tap('#languageKatakana');
 await tap(key('Language'));await tap('#languageSystem');
 assert.equal(await tab.playwright.locator('#softwareKeyboard').isVisible(),false);
 await tap('[aria-label="App menu"]');await tap('#menuPokemuxKeyboard');
 assert.equal(await tab.playwright.locator('#softwareKeyboard').isVisible(),true);
 assert.equal(await tab.playwright.locator('.terminal').getAttribute('inputmode'),'none');
 for(const c of 'neko')await tap(key(c));await tap(key('Space'));
 await wait(async()=>await delivered()===initial+'ネコ');
 await tap(key('Language'));await tap('#languageSystem');
 await tap('#floatingHandle');await tap('#floatingFunctions [data-function="3"]');
 assert.equal(await tab.playwright.locator('#softwareKeyboard').isVisible(),true);
 assert.equal(await tab.playwright.locator('.terminal').getAttribute('inputmode'),'none');
 await tap(key('Language'));await tap('#languageEnglish');await tap(key('x'));
 await wait(async()=>await delivered()===initial+'ネコx');
 assert.ok((await tab.playwright.locator('.terminal').textContent()).includes('RECV:78'));
 const receipt={time:new Date().toISOString(),passed:true,scope:'Actual Chrome touch input at428x926 against stock cmux in owned workspace',workspaceId:info.workspaceId,sourceSha256:createHash('sha256').update(await readFile(new URL('../index.html',import.meta.url))).digest('hex'),checks:['System to Pokemux via menu restores visible keyboard and Japanese mode','System to Pokemux via fourth floating action restores visible keyboard','Exact Japanese and following ASCII reach real cmux and stream back'],steps};
 await writeFile(new URL('../KEYBOARD_RETURN_RESULT.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');
 await writeFile(new URL('../proof-keyboard-return.png',import.meta.url),await tab.screenshot({fullPage:false}));
 return receipt;
}
