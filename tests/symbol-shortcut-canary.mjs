import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const symbols=['\\','|','~','`'];
async function verify(root,interact,scope,file){
 const info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8'));
 const bytes=async()=>Buffer.concat((await readFile(info.log,'utf8')).split('\n').filter(l=>l.startsWith('RECV:')).map(l=>Buffer.from(l.slice(5),'hex'))),offset=(await bytes()).length;
 await interact(info);const expected=Buffer.from(symbols.join('').repeat(2)),deadline=Date.now()+5000;
 while((await bytes()).length<offset+expected.length){assert.ok(Date.now()<deadline,'Every literal shortcut reaches the owned terminal');await new Promise(r=>setTimeout(r,25))}
 assert.deepEqual((await bytes()).subarray(offset),expected);
 const sourceSha256={};for(const p of ['index.html','bridge.mjs'])sourceSha256[p]=createHash('sha256').update(await readFile(new URL(p,root))).digest('hex');
 const result={passed:true,time:new Date().toISOString(),scope,expectedHex:expected.toString('hex'),sourceSha256};await writeFile(new URL(file,root),JSON.stringify(result,null,2)+'\n');return result;
}
export async function verifySymbolShortcuts(tab,cdp,{root=new URL('../',import.meta.url)}={}){
 return verify(root,async info=>{
  assert.ok((await tab.url()).endsWith(`/${info.workspaceId}/${info.surfaceId}`));
  const tap=async locator=>{const r=await locator.evaluate(e=>e.getBoundingClientRect().toJSON());assert.ok(r.width>0&&r.x>=0&&r.right<=428);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await tab.getAXState({emit:false})};
  for(const key of symbols)await tap(tab.playwright.locator('#viewportDock .inputdock').getByRole('button',{name:key,exact:true}));
  await tap(tab.playwright.getByRole('button',{name:'Show shortcuts',exact:true}));assert.equal(await tab.playwright.locator('#dialog').getAttribute('open'),'');
  for(const key of symbols)await tap(tab.playwright.locator('#viewportDock .inputdock').getByRole('button',{name:key,exact:true}));
  const screenshot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(new URL('proof-symbol-shortcuts.png',root),Buffer.from(screenshot.data,'base64'));
 },'Chrome iPhone13ProMax428x879 actual finger taps; strip and expanded panel; owned stock cmux','BROWSER_SYMBOL_SHORTCUT_RESULT.json');
}
export async function verifyNativeSymbolShortcuts(app,{root=new URL('../',import.meta.url)}={}){
 return verify(root,async()=>{
  // Observed 808x1730 iPhone13ProMax Simulator window with the strip and emulated keyboard visible.
  for(let n=0;n<2;n++)for(const point of [[620,1015],[620,953],[704,1015],[704,953]])await app.click(point);
  await app.getAXState({emit:false});await writeFile(new URL('proof-native-symbol-shortcuts.png',root),await app.getScreenshot({emit:false}));
 },'Native iPhone13ProMax Simulator Safari26.3 actual taps; owned stock cmux, not physical phone acceptance','NATIVE_SYMBOL_SHORTCUT_RESULT.json');
}
