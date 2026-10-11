import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Locate a visible RECV word in the owned raw terminal screenshot before calling.
export async function verifyNativeSelection(app,{wordPoint,keyPoint}){
 const info=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8'));
 const bytes=async()=>Buffer.from([...(await readFile(info.log,'utf8')).matchAll(/RECV:([0-9a-f]+)/g)].map(m=>m[1]).join(''),'hex');
 const before=(await bytes()).length;
 await app.click(wordPoint,{clickCount:2});const menu=await app.getAXState({emit:false});
 assert.match(menu,/Description: Copy,/,'Custom mode must expose the native editing menu');assert.match(menu,/Description: Paste,/);
 await writeFile(new URL('../proof-native-custom-selection.png',import.meta.url),await app.getScreenshot({emit:false}));
 const copy=Number(menu.match(/(\d+) text Description: Copy,/)[1]);await app.click(copy);await app.getAXState({emit:false});
 await app.pressKey('super+v');await app.getAXState({emit:false});await app.click(keyPoint);await app.getAXState({emit:false});
 const expected='\x1b[200~RECV\x1b[201~q',end=Date.now()+5000;
 while((await bytes()).length<before+Buffer.byteLength(expected)){assert.ok(Date.now()<end,'Native Copy/Paste and following custom q must reach real cmux');await new Promise(r=>setTimeout(r,25))}
 assert.equal((await bytes()).subarray(before).toString(),expected,'Selection copies the actual terminal word and native paste delivers it once without Return');
 await writeFile(new URL('../proof-native-custom-after-paste.png',import.meta.url),await app.getScreenshot({emit:false}));
 const result={passed:true,time:new Date().toISOString(),scope:'Native iOS Simulator Safari double-tap, Copy, hardware Paste and custom-key click; duration-controlled hold not certified',sourceSha256:createHash('sha256').update(await readFile(new URL('../index.html',import.meta.url))).digest('hex'),workspaceId:info.workspaceId,wordPoint,keyPoint,deliveredHex:Buffer.from(expected).toString('hex'),menu};
 await writeFile(new URL('../NATIVE_CUSTOM_SELECTION_RESULT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');return result;
}
