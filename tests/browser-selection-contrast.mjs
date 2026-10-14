import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function verifySelectionContrast(tab,cdp){
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
 await cdp.send('Emulation.setEmitTouchEventsForMouse',{enabled:false});
 await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:60,y:180,button:'left',buttons:1,clickCount:1});
 await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:60,y:180,button:'left',clickCount:1});
 await tab.getAXState({emit:false});
 const row=await tab.playwright.evaluate(()=>[...document.querySelector('.terminal').children].map(e=>e.getBoundingClientRect().toJSON()).find(r=>r.top>90&&r.bottom<300));
 assert.ok(row,'A real cmux text row is visible after engaging the terminal');
 const y=row.y+row.height/2;
 try{
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:40,y,button:'left',buttons:1,clickCount:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:110,y,button:'left',buttons:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:110,y,button:'left',clickCount:1});
  await tab.getAXState({emit:false});
  const state=await tab.playwright.evaluate(()=>{const output=document.querySelector('.terminal'),range=getSelection(),text=range.anchorNode.parentElement;return {selected:range.toString(),caret:getComputedStyle(output).caretColor,blue:getComputedStyle(document.documentElement).getPropertyValue('--blue').trim(),paper:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),background:getComputedStyle(text,'::selection').backgroundColor,ink:getComputedStyle(text,'::selection').color}});
  assert.ok(state.selected.trim(),'Real native browser selection contains terminal text');
  const rgb=hex=>'rgb('+hex.slice(1).match(/../g).map(pair=>parseInt(pair,16)).join(', ')+')';
  assert.equal(state.caret,rgb(state.blue));assert.equal(state.background,state.caret);assert.equal(state.ink,rgb(state.paper));
  const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(new URL('../proof-selection-contrast.png',import.meta.url),Buffer.from(shot.data,'base64'));
  const result={passed:true,time:new Date().toISOString(),scope:'Actual Chrome mouse range selection and painted contrast in mobile layout; native iOS handle appearance requires physical confirmation',state,hash:createHash('sha256').update(await readFile(new URL('../index.html',import.meta.url))).digest('hex')};
  await writeFile(new URL('../BROWSER_SELECTION_CONTRAST_RESULT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');return result;
 }finally{await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5})}
}
