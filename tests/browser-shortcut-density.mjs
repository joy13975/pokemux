import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function shortcutGeometry(tab,root='.inputdock') {
 return tab.playwright.locator(root).evaluate(e=>{
  const rect=e.getBoundingClientRect(),keys=[...e.querySelectorAll('[data-key],[data-shortcut]')].map(k=>{
   const box=k.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(k);
   return {name:k.getAttribute('aria-label')||k.textContent,rect:box.toJSON(),content:range.getBoundingClientRect().toJSON(),icons:[...k.querySelectorAll('svg')].map(s=>s.getBoundingClientRect().toJSON())};
  });
  return {rect:rect.toJSON(),keys};
 });
}
export function assertCompactGeometry(view) {
 assert.ok(view.keys.length>=16,'All default groups remain available');
 const first=view.keys[0].rect;
 for(const key of view.keys){
  assert.ok(Math.abs(key.rect.width-first.width)<1,`Equal button widths: ${key.name}`);
  assert.ok(Math.abs(key.rect.height-first.height)<1,`Equal button heights: ${key.name}`);
  for(const icon of key.icons){
   assert.ok(icon.width<=20&&icon.height<=20,`Compact icon: ${key.name}`);
   assert.ok(icon.top-key.rect.top>=6&&key.rect.bottom-icon.bottom>=6,`Vertical icon margins: ${key.name}`);
   assert.ok(icon.left-key.rect.left>=6&&key.rect.right-icon.right>=6,`Horizontal icon margins: ${key.name}`);
  }
  assert.ok(key.content.left-key.rect.left>=6&&key.rect.right-key.content.right>=6,`Complete label fits horizontal margins: ${key.name}`);
  assert.ok(Math.abs((key.content.left+key.content.right-key.rect.left-key.rect.right)/2)<=1,`Content horizontally centered: ${key.name}`);
  assert.ok(Math.abs((key.content.top+key.content.bottom-key.rect.top-key.rect.bottom)/2)<=1,`Content vertically centered: ${key.name}`);
 }
 const rows=new Map();for(const key of view.keys){const top=Math.round(key.rect.top);if(!rows.has(top))rows.set(top,[]);rows.get(top).push(key.rect)}
 for(const row of rows.values()){
  row.sort((a,b)=>a.left-b.left);assert.ok(row[0].left>=view.rect.left+4&&row[0].left-view.rect.left<=first.width/2+4,'Consistent starting inset');
  for(let i=1;i<row.length;i++){const gap=row[i].left-row[i-1].right;assert.ok(gap>=1&&gap<=4,'Compact consistent horizontal gaps');}
 }
}
export async function assertShortcutFocus(tab){
 const ring=await tab.playwright.locator('#dialogClose').evaluate(e=>({focusVisible:e.matches(':focus-visible'),rect:e.getBoundingClientRect().toJSON(),dialog:e.closest('dialog').getBoundingClientRect().toJSON(),outlineWidth:getComputedStyle(e).outlineWidth,outlineOffset:getComputedStyle(e).outlineOffset}));
 ring.outset=Number.parseFloat(ring.outlineWidth)+Number.parseFloat(ring.outlineOffset);
 assert.equal(ring.focusVisible,true,'Keyboard focus is visibly indicated');
 assert.ok(ring.rect.left-ring.outset>=ring.dialog.left&&ring.rect.right+ring.outset<=ring.dialog.right&&ring.rect.top-ring.outset>=ring.dialog.top&&ring.rect.bottom+ring.outset<=ring.dialog.bottom,'Complete close-button focus ring stays inside panel clipping bounds');return ring;
}
export async function* verifyShortcutDensity(tab,cdp){
 const info=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8')),checks=[],steps=[];
 let contact=false;
 const observe=()=>tab.getAXState({emit:false}),box=s=>tab.playwright.locator(s).evaluate(e=>e.getBoundingClientRect().toJSON());
 const touch=async(type,x,y)=>{if(type==='touchEnd'&&!contact)return;await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x,y}]});contact=type!=='touchEnd';steps.push({type,x,y})};
 const wait=async f=>{const end=Date.now()+8000;while(!await f()){assert.ok(Date.now()<end,'Expected visible shortcut outcome');await new Promise(r=>setTimeout(r,25))}};
 const tap=async s=>{const r=await box(s);assert.ok(r.top>=0&&r.bottom<=926&&r.width>0&&r.height>0,'Visible '+s);await touch('touchStart',r.x+r.width/2,r.y+r.height/2);await touch('touchEnd');await observe()};
 const drag=async(x,y,dx,dy)=>{await touch('touchStart',x,y);for(let i=1;i<=8;i++)await touch('touchMove',x+dx*i/8,y+dy*i/8);await touch('touchEnd');await observe()};
 const bytes=async()=>Buffer.from([...(await readFile(info.log,'utf8')).matchAll(/RECV:([0-9a-f]+)/g)].map(m=>m[1]).join(''),'hex');
 const rows=view=>[...new Set(view.keys.map(k=>Math.round(k.rect.top)))].sort((a,b)=>a-b);
 const screenshot=async name=>writeFile(new URL('../proof-shortcut-'+name+'.png',import.meta.url),await tab.screenshot({fullPage:false}));
 try{
 await tap(`.surfacetab[data-surface="${info.surfaceId}"]`);
 for(const [selector,x] of [['#floatingHandle',370],['#cursorJoystick',60]]){const r=await box(selector);await touch('touchStart',r.x+r.width/2,r.y+r.height/2);await new Promise(r=>setTimeout(r,430));await touch('touchMove',x,888);await touch('touchEnd');await observe();}
 const initial=await shortcutGeometry(tab);assertCompactGeometry(initial);assert.equal(rows(initial).length,2);
 for(const y of rows(initial)){const visible=initial.keys.filter(k=>Math.round(k.rect.top)===y&&k.rect.left<initial.rect.right);assert.ok(Math.max(...visible.map(k=>k.rect.right))>=initial.rect.right-55,'Each default row fills the rail');}
 await screenshot('two-rows');checks.push({name:'Default packed two-row rail has uniform compact cells, centered content and bounded icons',geometry:initial});yield checks.at(-1);
 const startBytes=(await bytes()).length,scroll=()=>tab.playwright.locator('.inputdock .keygroups').evaluate(e=>e.scrollLeft);
 const rowTops=rows(initial);
 for(const y of rowTops){await drag(350,y+18,-230,0);assert.ok(await scroll()>10||initial.keys.length*initial.keys[0].rect.width/2<initial.rect.width,'Left swipe scrolls overflowing rows');await drag(80,y+18,230,0);assert.ok(await scroll()<1,'Reverse swipe returns to the start');}
 assert.equal((await bytes()).length,startBytes);checks.push('Both rows accept identical left/right finger scrolling without accidental key delivery');yield checks.at(-1);
 await tap('.inputdock [data-key="Ctrl"]');assert.equal(await tab.playwright.locator('.inputdock [data-key="Ctrl"]').getAttribute('aria-pressed'),'true');await screenshot('modifier-armed');await tap('.typing-layout:not([hidden]) [data-typing-key="a"]');await wait(async()=> (await bytes()).length===startBytes+1);assert.equal((await bytes()).at(-1),1);assert.equal(await tab.playwright.locator('.inputdock [data-key="Ctrl"]').getAttribute('aria-pressed'),'false');checks.push('Packed modifier state is visible and sends exactly one Control-A into real cmux');yield checks.at(-1);
 const dock=await box('.inputdock');await touch('touchStart',214,dock.top+12);await touch('touchMove',214,dock.top-35);await observe();assert.equal(await tab.playwright.locator('#dialog').evaluate(e=>e.open),true);const preview=await box('#dialog');await touch('touchMove',214,dock.top+9);await touch('touchEnd');await observe();assert.equal(await tab.playwright.locator('#dialog').evaluate(e=>e.open),false);checks.push({name:'Packed rail retains gradual upward preview and reversal cancellation',preview});yield checks.at(-1);
 await drag(214,(await box('.inputdock')).top+12,0,-160);assert.equal(await tab.playwright.locator('#dialog').evaluate(e=>e.open),true);
 const expanded=await shortcutGeometry(tab,'#dialog');assertCompactGeometry(expanded);assert.ok(expanded.keys.every(k=>Math.abs(k.rect.width-initial.keys[0].rect.width)<1&&Math.abs(k.rect.height-initial.keys[0].rect.height)<1),'Expanded keys share strip cell dimensions');await tab.playwright.locator('#dialogClose').press('Tab');await tab.pressKey(null,'shift+Tab');await observe();const focusRing=await assertShortcutFocus(tab);await screenshot('expanded');checks.push({name:'Expanded keys share the same button/icon geometry and compact margins',geometry:expanded,focusRing});yield checks.at(-1);
 const body=await box('#dialogBody');await drag(214,body.top+15,0,140);assert.equal(await tab.playwright.locator('#dialog').evaluate(e=>e.open),false);
 const heights=[];
 for(const n of [1,3,2]){
  await tap('#appActions');await tap('#menuSettings');await tab.playwright.locator('#shortcutRows').selectOption(String(n));await observe();await tap('#dialogClose');await keysReload();
  const view=await shortcutGeometry(tab);assertCompactGeometry(view);assert.equal(rows(view).length,n,'Saved row count survives a real page reload');const keyboard=await box('#softwareKeyboard'),terminal=await box('.terminalwrap');assert.ok(Math.abs(view.rect.bottom-keyboard.top)<=1,'Strip remains adjacent to keyboard');assert.ok(terminal.bottom<=view.rect.top+1,'Terminal does not overlap the configured rows');heights.push({rows:n,rail:view.rect,terminal,keyboard});await screenshot(n+'-rows');
 }
 checks.push({name:'Settings1/3/2 row changes persist across reloads and reserve their measured height above the keyboard',heights});yield checks.at(-1);
 const longName='Canary density long shortcut';
 await drag(214,(await box('.inputdock')).top+12,0,-160);await tap('[data-panel="customize"]');await tap('#addShortcut');
 await tap('#customName');await tab.playwright.locator('#customName').fill(longName);await tap('#customValue');await tab.playwright.locator('#customValue').fill('Ctrl-E');await tap('#customForm button[type="submit"]');await tap('#dialogClose');
 const labelRail=await box('.inputdock');await drag(350,labelRail.top+18,-250,0);
 const custom=await tab.playwright.locator('.inputdock [data-shortcut]').evaluate(e=>({name:e.getAttribute('aria-label'),title:e.title,rect:e.getBoundingClientRect().toJSON(),label:e.querySelector('.keylabel').getBoundingClientRect().toJSON(),textWidth:e.querySelector('.keylabel').scrollWidth,visibleWidth:e.querySelector('.keylabel').clientWidth}));
 assert.equal(custom.name,longName);assert.equal(custom.title,longName);assert.equal(custom.rect.width,initial.keys[0].rect.width);assert.equal(custom.rect.height,initial.keys[0].rect.height);assert.ok(custom.label.left-custom.rect.left>=4&&custom.rect.right-custom.label.right>=4);assert.ok(custom.textWidth>custom.visibleWidth,'Long name occupies a bounded label cell');await screenshot('custom-label');
 for(const y of rows(initial)){await drag(350,y+18,-230,0);assert.ok(await scroll()>10,'Both rows scroll when custom shortcuts overflow');await drag(80,y+18,230,0);assert.ok(await scroll()<1)}await drag(350,labelRail.top+18,-250,0);
 const beforeCustom=(await bytes()).length;await tap('.inputdock [data-shortcut]');await wait(async()=> (await bytes()).length===beforeCustom+1);assert.equal((await bytes()).at(-1),5);
 await drag(214,(await box('.inputdock')).top+12,0,-160);await tap('[data-panel="customize"]');await tap('[data-edit-shortcut]');await tap('#deleteCustom');await tap('#confirmDeleteCustom');await tap('#dialogClose');await keysReload();assert.equal(await tab.playwright.locator('.inputdock [data-shortcut]').count(),0);
 checks.push({name:'Long custom shortcut keeps equal cell size and full accessible name, sends exact Control-E, and test entry is removed through UI',custom});yield checks.at(-1);
 const result={passed:true,time:new Date().toISOString(),scope:'Actual Chrome input-engine finger gestures at428x926 using only owned stock-cmux workspace; row setting selected through browser UI',sourceSha256:createHash('sha256').update(await readFile(new URL('../index.html',import.meta.url))).digest('hex'),checks,steps};await writeFile(new URL('../BROWSER_SHORTCUT_DENSITY_RESULT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');return result;
 }finally{await touch('touchEnd')}
 async function keysReload(){await tab.reload();await observe();await wait(async()=>await tab.playwright.locator('.inputdock').isVisible())}
}
