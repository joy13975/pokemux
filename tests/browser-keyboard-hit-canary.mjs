import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function verifyKeyboardHits(tab,cdp){
 const info=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8'));
 assert.ok((await tab.url()).endsWith(`/${info.workspaceId}/${info.surfaceId}`),'Only the owned raw terminal receives input');
 const viewport=await tab.playwright.evaluate(()=>({width:innerWidth,height:innerHeight,scale:visualViewport.scale}));
 assert.equal(viewport.width,428);assert.equal(viewport.height,879);assert.equal(viewport.scale,1,'Use the measured phone layout without page zoom');
 const probes=await tab.playwright.evaluate(()=>{
  const rows=[...document.querySelectorAll('.typing-layout:not([hidden]) .typing-row')],points=[];
  const cap=b=>(b.querySelector('.typing-keycap')||b).getBoundingClientRect();
  for(const row of rows){const buttons=[...row.children];for(let i=0;i<buttons.length-1;i++){const a=cap(buttons[i]),b=cap(buttons[i+1]);points.push({x:a.right+1,y:a.top+a.height/2,key:buttons[i].dataset.typingKey});points.push({x:b.left-1,y:b.top+b.height/2,key:buttons[i+1].dataset.typingKey})}}
  for(let i=0;i<rows.length-1;i++){const b=[...rows[i].children].find(b=>/^[a-z]$/.test(b.dataset.typingKey)),r=cap(b);points.push({x:r.x+r.width/2,y:r.bottom+1,key:b.dataset.typingKey})}
  const first=rows[1].children[0],r=cap(first);points.push({x:r.left-4,y:r.top+r.height/2,key:first.dataset.typingKey});
  return points.map(p=>({...p,hit:document.elementFromPoint(p.x,p.y)?.closest('[data-typing-key]')?.dataset.typingKey||null}));
 });
 assert.equal(probes.filter(p=>p.hit!==p.key).length,0,'Every visible key gap belongs to its adjacent semantic key; Safari cannot drop that contact');
 const letters=probes.filter(p=>/^[a-z]$/.test(p.key)),bytes=async()=>Buffer.concat((await readFile(info.log,'utf8')).split('\n').filter(l=>l.startsWith('RECV:')).map(l=>Buffer.from(l.slice(5),'hex'))),before=(await bytes()).length,steps=[];
 let touching=false;
 const touch=async(type,touchPoints=[])=>{if(type==='touchEnd'&&!touching)return;touching=type!=='touchEnd'||touchPoints.length>0;steps.push({type,touchPoints});await cdp.send('Input.dispatchTouchEvent',{type,touchPoints})};
 try{
  for(let i=0;i<letters.length;i+=2){const a={id:1,x:letters[i].x,y:letters[i].y},b=letters[i+1]&&{id:2,x:letters[i+1].x,y:letters[i+1].y};await touch('touchStart',[a]);if(b)await touch('touchStart',[a,b]);
   const held=[letters[i].key,b&&letters[i+1].key].filter(Boolean);assert.ok(await tab.playwright.evaluate(keys=>keys.every(k=>document.querySelector(`.typing-layout:not([hidden]) [data-typing-key="${k}"]`).classList.contains('pressed')),held),'Every overlapping finger lights its key');
   if(b)await touch('touchEnd',[b]);await touch('touchEnd');
  }
  const expected=Buffer.from(letters.flatMap((p,i)=>i%2?[]:letters[i+1]?[letters[i+1].key,p.key]:[p.key]).join('')),until=Date.now()+5000;while((await bytes()).length<before+expected.length){assert.ok(Date.now()<until,'Raw cmux receives every contact');await new Promise(r=>setTimeout(r,25))}
  assert.deepEqual((await bytes()).subarray(before),expected);
  const result={passed:true,time:new Date().toISOString(),scope:'Chrome input-engine finger gestures, 428x879 mobile layout, real disposable cmux; physical phone confirmation remains separate',characters:expected.length,probes,steps,hash:createHash('sha256').update(await readFile(new URL('../index.html',import.meta.url))).digest('hex')};
  await writeFile(new URL('../BROWSER_KEYBOARD_HIT_RESULT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');return result;
 }finally{await touch('touchEnd')}
}
