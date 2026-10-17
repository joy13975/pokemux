import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function verifyNativeScrollUI(app,{wordPoint,terminalPoint}){
 const root=new URL('../',import.meta.url),result={passed:false,time:new Date().toISOString(),scope:'Native iPhone13ProMax Simulator Safari26.3, system keyboard and double-tap terminal selection; not physical-phone typing acceptance',selectionHandleDragVerified:false,hash:createHash('sha256').update(await readFile(new URL('index.html',root))).digest('hex')};
 try{const info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8')),before=await app.getAXState({emit:false,disableDiffing:true});
 assert.match(before,/Pokemux-Canary-iPhone13ProMax/);const address=/(\d+) text field[^\n]*Description: Address/.exec(before);assert.ok(address);await app.click(Number(address[1]));let editing=await app.getAXState({emit:false,disableDiffing:true});if(!editing.includes('ID: URL')){const bar=/(\d+) text field[^\n]*Description: Address/.exec(editing);assert.ok(bar);await app.click(Number(bar[1]));editing=await app.getAXState({emit:false,disableDiffing:true})}assert.ok(editing.includes(`Value: localhost:4391/#${info.windowId}/${info.workspaceId}/${info.surfaceId}`));const cancel=/(\d+) button Description: Close, ID: CancelBarItemButton/.exec(editing);assert.ok(cancel);await app.click(Number(cancel[1]));await app.getAXState({emit:false});await app.click(terminalPoint);const state=await app.getAXState({emit:false,disableDiffing:true});assert.match(state,/button q\n/);assert.match(state,/Next keyboard/);
 await app.click(wordPoint,{clickCount:2});const selection=await app.getAXState({emit:false});assert.match(selection,/Description: Copy/);assert.match(selection,/Description: Cut/);
 await writeFile(new URL('proof-native-scroll-selection.png',root),await app.getScreenshot({emit:false}));
 Object.assign(result,{passed:true,systemKeyboardVisible:true,nativeSelectionMenu:true});return result;
 }finally{await writeFile(new URL('NATIVE_SCROLL_UI_RESULT.json',root),JSON.stringify(result,null,2)+'\n')}
}
