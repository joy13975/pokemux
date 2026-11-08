import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function verifyScratchSend(tab){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8'));
 assert.ok((await tab.url()).endsWith('/'+info.surfaceId),'Use only the owned terminal fixture');
 const bytes=async path=>Buffer.concat((await readFile(path,'utf8')).split('\n').filter(l=>l.startsWith('RECV:')).map(l=>Buffer.from(l.slice(5),'hex'))),first=await bytes(info.log),second=await bytes(info.log+'-second');
 const box=selector=>tab.playwright.locator(selector).evaluate(e=>e.getBoundingClientRect().toJSON());
 const center=async selector=>{const r=await box(selector);assert.ok(r.width&&r.height);return {x:r.x+r.width/2,y:r.y+r.height/2}};
 const mouse=tab.playwright.mouse;
 const press=async({x,y})=>{await mouse.move(x,y);await mouse.down()};
 const move=({x,y})=>mouse.move(x,y,{steps:5});
 const tap=async selector=>{await press(await center(selector));await mouse.up()};
 const visible=selector=>tab.playwright.locator(selector).evaluate(e=>!e.hidden);
 const editor='#scratchEditor',grip='#scratchGrip',send='#scratchSend',menu='#scratchSendChoices';
 const pull=async(distance,reverse=false)=>{
  const {x,y}=await center(grip);
  await press({x,y});await move({x,y:y+distance});
  const previewHeight=(await box(editor)).height;
  if(reverse)await move({x,y});
  await mouse.up();
  return previewHeight;
 };
 const hold=async()=>{
  await press(await center(send));
  await tab.playwright.locator(menu).waitFor({state:'visible'});
  const button=await box(send),choices=await box(menu);
  assert.ok(Math.abs(choices.right-button.right)<=1&&Math.abs(choices.bottom-button.top)<=1,'Choices sit against the top right of Send');
 };
 const readDraft=()=>tab.playwright.locator('#scratchText').evaluate(e=>e.value);
 const type=async text=>{await tap('#scratchText');await tab.playwright.locator('#scratchText').press('Meta+A');await tab.playwright.keyboard.insertText(text);assert.equal(await readDraft(),text)};
 const receive=async(start,expected)=>{
  const deadline=Date.now()+5000;
  while((await bytes(info.log+'-second')).length<start+expected.length||await readDraft()!==''){assert.ok(Date.now()<deadline,'Owned native terminal receives draft');await new Promise(r=>setTimeout(r,25))}
  assert.deepEqual((await bytes(info.log+'-second')).subarray(start),expected);
  assert.equal(await readDraft(),'');
 };
 await tap(`[data-surface="${info.secondSurfaceId}"]`);
 assert.equal(await visible(editor),false);
 assert.ok(await pull(-68,true)>0,'Upward pull reveals the editor before release');
 assert.equal(await visible(editor),false);
 await pull(-68);assert.equal(await visible(editor),true);
 assert.equal(await tab.playwright.locator('.inputdock').evaluate(e=>e.hidden),true);
 const text='Scratchpad Send 日本語';await type(text);
 const compact=(await box(editor)).height;
 assert.ok(await pull(-68,true)>compact,'The editor grows with the finger before release');
 assert.equal((await box(editor)).height,compact,'Reversing a pull leaves the editor compact');
 await pull(-68);
 assert.ok((await box(editor)).height>compact+68,'Releasing past the threshold maximizes the editor');
 assert.ok((await box('.terminalwrap')).bottom<=(await box(grip)).top+1,'The terminal stays above the maximized drawer');
 assert.equal(await readDraft(),text);
 await pull(68);
 assert.equal((await box(editor)).height,compact,'One down pull shrinks the maximized editor to compact');
 assert.equal(await readDraft(),text);

 const button=await box(send),pad=await box('#scratchpad');assert.ok(button.x>=pad.x&&button.right<=pad.right&&button.height>0&&button.height<44);
 await pull(68);assert.equal(await visible(editor),false);
 await pull(-68);assert.equal(await readDraft(),text);
 await hold();await writeFile(new URL('state/scratch-drawer-held.png',root),await tab.screenshot({fullPage:false}));
 await mouse.up();assert.equal(await visible(menu),false);assert.equal(await readDraft(),text);
 assert.deepEqual(await bytes(info.log+'-second'),second,'Releasing on Send cancels a held gesture');
 await hold();await move(await center('[data-scratch-send="paste"]'));await mouse.up();
 const pasted=Buffer.from('\x1b[200~'+text+'\x1b[201~');
 await receive(second.length,pasted);
 const submitted=Buffer.concat([pasted,Buffer.from('\r')]);
 await type(text);await hold();await move(await center('[data-scratch-send="enter"]'));await mouse.up();
 await receive(second.length+pasted.length,submitted);
 await type(text);await tap(send);
 await receive(second.length+pasted.length+submitted.length,submitted);
 assert.deepEqual(await bytes(info.log),first,'Inactive tab unchanged');
 assert.equal(await visible(editor),true);
 await pull(68);assert.equal(await visible(editor),false);
 const sourceSha256={};for(const file of ['index.html','server.mjs','bridge.mjs'])sourceSha256[file]=createHash('sha256').update(await readFile(new URL(file,root))).digest('hex');const result={passed:true,time:new Date().toISOString(),scope:'phone layout, trusted pointer gestures, authenticated app through stock cmux into owned raw-input terminal; no existing workspace input',target:'second owned tab',drawerReversible:true,drawerMaximizes:true,heldSendCancels:true,heldChoicePastesWithoutEnter:true,draftCleared:true,enterFollowsPaste:true,inactiveTabUnchanged:true,button,pad,sourceSha256};await writeFile(new URL('state/scratch-drawer-result.json',root),JSON.stringify(result,null,2)+'\n');return result;
}
