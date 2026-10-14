import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { RenderGrid } from '../grid.mjs';
import { KanaComposer } from '../kana.mjs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function terminal(saved) {
  const dom = new JSDOM(html, { url: 'https://pokemux-test.invalid', runScripts: 'outside-only', pretendToBeVisual: true }), w = dom.window;
  w.localStorage.setItem("cmux-pocket-customizations",JSON.stringify({shortcuts:[],snippets:[],keyboardMode:"custom",...saved}));
  w.resizeObservers=[];w.ResizeObserver = class { constructor(callback){this.callback=callback;this.targets=new Set();w.resizeObservers.push(this)} observe(target){this.targets.add(target)} disconnect(){this.targets.clear()} };
  w.captureHost=null;w.HTMLElement.prototype.setPointerCapture=function(){w.captureHost=this};
  w.matchMedia = () => ({ matches: true });
  w.visualViewport = { width:390, height: 844, scale: 1, offsetTop: 0, offsetLeft:0, addEventListener() {} };
  w.EventSource = class { constructor() { w.fixtureStream=this; } addEventListener() {} close() { this.closed=true; } };
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.show=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  w.__RenderGrid = RenderGrid;w.__KanaComposer=KanaComposer;
  w.actions=[];w.fetch=async(path,options)=>{if(path==='/api/action')w.actions.push(JSON.parse(options.body));return {ok:true,status:200,json:async()=>({})};};
  const script = html.split('<script type="module">\n')[1].split('</script>')[0];
  w.eval(script.slice(0, script.lastIndexOf('(async()=>{')) + `
    RenderGrid=window.__RenderGrid;KanaComposer=window.__KanaComposer;kana=new KanaComposer();
    const fixture=workspace('owned-workspace','Owned workspace',null,'','',[pane('owned-pane',[surface('owned-surface','Owned terminal')])],'owned-window');
    workspaces.push(fixture);current=fixture;selectedWindow=fixture.window;connected=true;
    const initialFrame={format:'cmux.render-grid.v1',render_epoch:'owned-epoch',render_revision:1,full:true,rows:3,columns:30,row_spans:[{row:0,column:0,text:'hello 日本語',cell_width:12}],cursor:{row:0,column:12,visible:true,style:'bar'}};const model=new RenderGrid();model.apply(initialFrame);grids.set('owned-surface',model);
    render();
  `);
  return dom;
}
function pointer(w,target,type,x,y){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:4,button:0,isPrimary:true,clientX:x,clientY:y});target.dispatchEvent(e)}
function open(w){w.document.querySelector('#appActions').click();w.document.querySelector('#menuKeyboard').click();return w.document.querySelector('#dialog')}
test('expanded panel extends the existing strip without duplicating defaults or dismissing on strip input',async()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{const strip=d.querySelector('.inputdock'),grid=strip.querySelector('.keygroups'),ctrl=strip.querySelector('[data-key="Ctrl"]');grid.scrollLeft=70;open(w);assert.equal(d.querySelector('#dialog [data-key="Ctrl"]'),null,'Default keys stay in their original strip');assert.equal(d.querySelector('.inputdock'),strip);assert.equal(grid.scrollLeft,70);pointer(w,ctrl,'pointerdown',120,700);pointer(w,ctrl,'pointerup',120,700);ctrl.click();assert.equal(d.querySelector('#dialog').open,true,'Strip remains part of the expanded shortcut surface');d.querySelector('#dialog [data-key="F1"]').click();await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).key,'Ctrl-F1');assert.equal(ctrl.getAttribute('aria-pressed'),'false')}finally{w.close()}
});
test('scrolling to the panel top never dismisses it without an active downward pull',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{const dialog=open(w),body=d.querySelector('#dialogBody');body.scrollTop=45;body.dispatchEvent(new w.Event('scroll'));body.scrollTop=0;body.dispatchEvent(new w.Event('scroll'));assert.equal(dialog.open,true)}finally{w.close()}
});
test('rail expansion tracks the finger before release and can reverse without opening',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{const rail=d.querySelector('.inputdock'),dialog=d.querySelector('#dialog');pointer(w,rail,'pointerdown',120,700);pointer(w,rail,'pointermove',120,650);assert.equal(dialog.open,true,'Content previews while pulling');const first=parseFloat(dialog.style.getPropertyValue('--panel-height'));assert.ok(first>0);pointer(w,rail,'pointermove',120,690);assert.ok(parseFloat(dialog.style.getPropertyValue('--panel-height'))<first);pointer(w,rail,'pointerup',120,690);assert.equal(dialog.open,false);assert.equal(w.actions.length,0)}finally{w.close()}
});
test('panel pull collapses gradually, reversal restores it, and a fresh deliberate pull stows it',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{const dialog=open(w),body=d.querySelector('#dialogBody');pointer(w,body,'pointerdown',120,400);pointer(w,body,'pointermove',120,440);const small=parseFloat(dialog.style.getPropertyValue('--panel-height'));assert.ok(small>0);assert.equal(dialog.open,true);pointer(w,body,'pointermove',120,405);assert.ok(parseFloat(dialog.style.getPropertyValue('--panel-height'))>small);pointer(w,body,'pointerup',120,405);assert.equal(dialog.open,true);pointer(w,body,'pointerdown',120,400);pointer(w,body,'pointermove',120,510);pointer(w,body,'pointerup',120,510);assert.equal(dialog.open,false);assert.equal(w.actions.length,0)}finally{w.close()}
});
test('panel horizontal swipes change Keys Snippets Customize without terminal input',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{open(w);for(const expected of ['snippets','customize']){const body=d.querySelector('#dialog .sheetnav');pointer(w,body,'pointerdown',320,430);pointer(w,body,'pointermove',70,430);pointer(w,body,'pointerup',70,430);assert.equal(d.querySelector('[data-panel].active').dataset.panel,expected)}const body=d.querySelector('#dialog .sheetnav');pointer(w,body,'pointerdown',70,430);pointer(w,body,'pointermove',320,430);pointer(w,body,'pointerup',320,430);assert.equal(d.querySelector('[data-panel].active').dataset.panel,'snippets');assert.equal(w.actions.length,0)}finally{w.close()}
});
test('panel packs modifiers with their group and removes keyboard duplicates, with navigation last',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{open(w);const group=d.querySelector('.inputdock .keygroup');assert.deepEqual([...group.querySelectorAll('[data-key]')].map(b=>b.dataset.key),['Esc','Tab','Ctrl','Alt','Shift','Del']);assert.equal(d.querySelector('#dialog .modifierkeys'),null);for(const key of ['Backspace','Space','Enter','1','2','3','4','5','6','/','-','_'])assert.equal(d.querySelector('#dialog [data-key="'+key+'"]'),null);const grid=d.querySelector('#dialog .navigationkeys');assert.ok(grid);assert.ok([...d.querySelectorAll('#dialog [data-key]')].indexOf(grid.firstElementChild)>10);assert.equal(d.querySelector('.inputdock [data-key="Esc"]').textContent,'Esc');assert.ok(d.querySelector('.inputdock [data-key="Ctrl-W"]'))}finally{w.close()}
});
test('a downward drag consumes panel scroll before it can start collapsing',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{const dialog=open(w),body=d.querySelector('#dialogBody');body.scrollTop=100;pointer(w,body,'pointerdown',120,400);pointer(w,body,'pointermove',120,440);assert.equal(body.scrollTop,60);assert.equal(dialog.classList.contains('panel-pulling'),false);pointer(w,body,'pointerup',120,440);assert.equal(dialog.open,true);assert.equal(w.actions.length,0)}finally{w.close()}
});
test('the first fresh tap after a horizontal swipe is not swallowed when its compatibility click was omitted',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{open(w);const body=d.querySelector('#dialog .sheetnav');pointer(w,body,'pointerdown',320,430);pointer(w,body,'pointermove',70,430);pointer(w,body,'pointerup',70,430);const add=d.querySelector('#addSnippet');pointer(w,add,'pointerdown',120,440);pointer(w,add,'pointerup',120,440);add.click();assert.equal(d.querySelector('#dialogTitle').textContent,'Add snippet')}finally{w.close()}
});
test('fresh default strip exposes complete requested control and coding groups',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{const rail=d.querySelector('.inputdock');assert.equal(rail.querySelector('.modifierkeys'),null);assert.deepEqual([...rail.querySelectorAll('.keygroups .keygroup')].map(g=>[...g.querySelectorAll('[data-key]')].map(b=>b.dataset.key)),[['Esc','Tab','Ctrl','Alt','Shift','Del'],['Ctrl-C','Ctrl-A','Ctrl-E','Ctrl-W','Ctrl-L','Ctrl-R'],['|','\\','`','~']]);assert.equal(rail.querySelectorAll('[data-key="Ctrl"]').length,1)}finally{w.close()}
});
test('old group ordering migrates complete defaults without empty groups or losing custom shortcuts',()=>{
 const dom=terminal({groupOrder:[['Ctrl-C','Ctrl-D','Ctrl-Z','Ctrl-L'],['1','2','3','Enter'],['Esc','Tab','Ctrl','Alt'],['/','|','~','-']],shortcuts:[{id:'saved',name:'Mine',key:'Alt-x'}]}),w=dom.window,d=w.document;
 try{const rail=d.querySelector('.inputdock'),groups=[...rail.querySelectorAll('.keygroups .keygroup')];assert.deepEqual([...groups[0].querySelectorAll('[data-key]')].map(b=>b.dataset.key),['Ctrl-C','Ctrl-A','Ctrl-E','Ctrl-W','Ctrl-L','Ctrl-R']);assert.deepEqual([...groups[1].querySelectorAll('[data-key]')].map(b=>b.dataset.key),['Esc','Tab','Ctrl','Alt','Shift','Del']);assert.deepEqual([...groups[2].querySelectorAll('[data-key]')].map(b=>b.dataset.key),['|','\\','`','~']);assert.equal(groups[3].querySelector('[data-shortcut="saved"]').textContent,'Mine');assert.ok(groups.every(g=>g.childElementCount>0))}finally{w.close()}
});
test('expanded defaults use unselectable vector Mac key symbols while retaining full accessible names',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{open(w);for(const k of ['Tab','Ctrl','Alt','Shift','Del','Ctrl-C','Ctrl-A','Ctrl-E','Ctrl-W','Ctrl-L','Ctrl-R']){const key=d.querySelector('.inputdock [data-key="'+k+'"]');assert.ok(key,k);assert.equal(key.getAttribute('aria-label'),k);assert.ok(key.querySelector('svg path')||d.querySelector(key.querySelector('svg use')?.getAttribute('href')||'#missing-icon')?.querySelector('path'),k+' has a vector symbol')}for(const k of ['Ctrl-A','Ctrl-E','Ctrl-R'])assert.ok(d.querySelector('.inputdock [data-key="'+k+'"]').textContent.endsWith(k.slice(-1)));assert.equal(d.querySelector('#dialog [data-key="Ctrl-Z"]'),null);assert.ok(d.querySelector('.inputdock [data-key="\\\\"]'))}finally{w.close()}
});

test('a continuing pull retains capture on a visible host when preview keeps the rail',()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{const rail=d.querySelector('.inputdock'),dialog=d.querySelector('#dialog');pointer(w,rail,'pointerdown',120,712);pointer(w,rail,'pointermove',120,688);const host=w.captureHost;assert.ok(host);if(host===rail)pointer(w,rail,'lostpointercapture',120,688);pointer(w,host,'pointermove',120,602);assert.equal(dialog.open,true,'preview survives the next actual held-finger move');assert.ok(parseFloat(dialog.style.getPropertyValue('--panel-height'))>=110);pointer(w,host,'pointerup',120,602);assert.equal(dialog.open,true)}finally{w.close()}
});
test('capture transfer from an implicit button contact does not cancel its panel swipe',()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{open(w);const button=d.querySelector('[data-panel="keys"]');pointer(w,button,'pointerdown',320,430);pointer(w,button,'pointermove',70,430);pointer(w,button,'lostpointercapture',70,430);pointer(w,w.captureHost,'pointerup',70,430);assert.equal(d.querySelector('[data-panel].active').dataset.panel,'snippets')}finally{w.close()}
});


test('ordered groups remain in the same two-row strip when additional keys expand',()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{const strip=d.querySelector('.inputdock .keygroups');assert.equal(d.querySelector('.inputdock .modifierkeys'),null);assert.deepEqual([...strip.querySelectorAll('[data-key]')].map(b=>b.dataset.key),['Esc','Tab','Ctrl','Alt','Shift','Del','Ctrl-C','Ctrl-A','Ctrl-E','Ctrl-W','Ctrl-L','Ctrl-R','|','\\','`','~']);assert.equal(strip.style.getPropertyValue('--shortcut-rows'),'2');open(w);const panel=d.querySelector('#dialog .keygrid');assert.ok(panel);assert.ok([...panel.querySelectorAll('[data-key]')].every(b=>!strip.querySelector('[data-key="'+b.dataset.key+'"]')),'Expanded keys never duplicate strip keys');assert.equal(d.querySelector('.inputdock .keygroups'),strip);assert.equal(d.querySelector('#dialog .modifierkeys'),null)}finally{w.close()}
});
test('shortcut row setting persists without losing saved ordering or custom keys and remeasures the dock',()=>{
 const saved={groupOrder:[['Ctrl-C','Ctrl-A','Ctrl-E','Ctrl-W','Ctrl-L','Ctrl-R'],['Esc','Tab','Ctrl','Alt','Shift','Del'],['|','\\','`','~']],shortcuts:[{id:'saved',name:'Mine',key:'Alt-x'}]},dom=terminal(saved),w=dom.window,d=w.document;let updated;
 try{const initial=[...d.querySelectorAll('.inputdock [data-key]')].map(b=>b.dataset.key);let height=74;Object.defineProperty(w.HTMLElement.prototype,'offsetHeight',{configurable:true,get(){return this.classList.contains('inputdock')?height:0}});const wrap=d.querySelector('.terminalwrap');pointer(w,wrap,'pointerdown',100,100);pointer(w,wrap,'pointerup',100,100);assert.equal(d.querySelector('#softwareKeyboard').hidden,false);const before=Number.parseFloat(d.documentElement.style.getPropertyValue('--dock-height'));d.querySelector('#appActions').click();d.querySelector('#menuSettings').click();const select=d.querySelector('#shortcutRows');assert.ok(select);assert.equal(select.value,'2');assert.deepEqual([...select.options].map(o=>o.value),['1','2','3']);height=112;select.value='3';select.dispatchEvent(new w.Event('change'));updated=JSON.parse(w.localStorage.getItem('cmux-pocket-customizations'));assert.equal(updated.shortcutRows,3);assert.deepEqual(updated.groupOrder,saved.groupOrder);assert.deepEqual(updated.shortcuts,saved.shortcuts);assert.equal(d.querySelector('.inputdock .keygroups').style.getPropertyValue('--shortcut-rows'),'3');assert.deepEqual([...d.querySelectorAll('.inputdock [data-key]')].map(b=>b.dataset.key),initial);assert.equal(d.querySelector('.inputdock [data-shortcut="saved"]').textContent,'Mine');assert.equal(Number.parseFloat(d.documentElement.style.getPropertyValue('--dock-height'))-before,38)}finally{w.close()}
 const reload=terminal(updated);try{assert.equal(reload.window.document.querySelector('.inputdock .keygroups').style.getPropertyValue('--shortcut-rows'),'3')}finally{reload.window.close()}
});
test('both packed strip rows scroll the shared grid while expanded panel tab swipes remain intact',()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{const rail=d.querySelector('.inputdock'),grid=rail.querySelector('.keygroups'),keys=grid.querySelectorAll('[data-key]');for(const start of [keys[0],keys[1]]){grid.scrollLeft=0;pointer(w,start,'pointerdown',300,700);pointer(w,start,'pointermove',100,700);pointer(w,w.captureHost,'pointerup',100,700);assert.equal(grid.scrollLeft,200)}open(w);const tab=d.querySelector('#dialog .sheetnav');pointer(w,tab,'pointerdown',300,430);pointer(w,tab,'pointermove',100,430);pointer(w,w.captureHost,'pointerup',100,430);assert.equal(d.querySelector('[data-panel].active').dataset.panel,'snippets');assert.equal(w.actions.length,0)}finally{w.close()}
});
test('packed shortcuts deliver a latched modifier chord and clear both visible modifier states',async()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{d.querySelector('.inputdock [data-key="Ctrl"]').click();open(w);d.querySelector('.inputdock [data-key="Tab"]').click();await new Promise(resolve=>w.setTimeout(resolve,0));assert.equal(w.actions.length,1);assert.equal(w.actions[0].key,'Ctrl-Tab');assert.equal(d.querySelector('#dialog [data-key="Ctrl"]'),null);assert.equal(d.querySelector('.inputdock [data-key="Ctrl"]').getAttribute('aria-pressed'),'false')}finally{w.close()}
});


test('long saved shortcut labels retain their full accessible name and exact chord',async()=>{
 const name='A very long user-defined shortcut name',dom=terminal({shortcuts:[{id:'long',name,key:'Alt-x'}]}),w=dom.window,d=w.document;try{for(const expanded of [false,true]){if(expanded)open(w);const button=d.querySelector('.inputdock [data-shortcut="long"]');assert.equal(button.getAttribute('aria-label'),name);assert.equal(button.title,name);assert.equal(button.textContent,name);button.click()}await new Promise(resolve=>w.setTimeout(resolve,0));assert.deepEqual(w.actions.map(a=>a.key),['Alt-x','Alt-x'])}finally{w.close()}
});
