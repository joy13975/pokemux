import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { RenderGrid } from '../grid.mjs';
import { KanaComposer } from '../kana.mjs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function terminal(standalone=false) {
  const dom = new JSDOM(html, { url: 'https://pokemux-test.invalid', runScripts: 'outside-only', pretendToBeVisual: true }), w = dom.window;
  w.localStorage.setItem("cmux-pocket-customizations",JSON.stringify({shortcuts:[],snippets:[],keyboardMode:"custom",}));
  w.resizeObservers=[];w.ResizeObserver = class { constructor(callback){this.callback=callback;this.targets=new Set();w.resizeObservers.push(this)} observe(target){this.targets.add(target)} disconnect(){this.targets.clear()} };
  w.HTMLElement.prototype.setPointerCapture=()=>{};
  w.matchMedia = query => ({ matches:query.includes('max-width')||query.includes('max-height')||standalone&&query.includes('display-mode') });
  w.visualViewport = { width:390, height: 844, scale: 1, offsetTop: 0, offsetLeft:0, addEventListener() {} };
  w.EventSource = class { constructor() { w.fixtureStream=this; } addEventListener() {} close() { this.closed=true; } };
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;this.dataset.modal='true';};
  w.HTMLDialogElement.prototype.show=function(){this.open=true;delete this.dataset.modal;};
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
function pointer(w,target,type,x,y){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:9,button:0,isPrimary:true,clientX:x,clientY:y});target.dispatchEvent(e);return e}
function box(target,width){target.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:width,bottom:844,width,height:844})}
test('left edge drawer follows partial drag and reversal cancels without blocking content',()=>{
 const dom=terminal(true),w=dom.window,d=w.document;
 try{const edge=d.querySelector('[data-edge="left"]');assert.ok(edge);box(d.querySelector('#sidebar'),300);pointer(w,edge,'pointerdown',4,200);pointer(w,edge,'pointermove',94,200);assert.equal(d.querySelector('#shell').classList.contains('sidebar-preview'),true);assert.equal(Number(d.querySelector('#shell').style.getPropertyValue('--sidebar-progress')),.3);const alpha=Number(d.querySelector('#shell').style.getPropertyValue('--sidebar-opacity'));assert.ok(alpha>0&&alpha<.3,'Initial scrim fades more gently than linear drawer movement');assert.notEqual(d.querySelector('#content').inert,true);pointer(w,edge,'pointermove',14,200);pointer(w,edge,'pointerup',14,200);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),false);assert.equal(d.querySelector('#sidebar').inert,true);assert.equal(w.actions.length,0)}finally{w.close()}
});
test('left drawer commits on release and reverse drag dismisses it while vertical scrolling does not',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{const edge=d.querySelector('[data-edge="left"]');assert.ok(edge);const sidebar=d.querySelector('#sidebar');box(sidebar,300);pointer(w,edge,'pointerdown',4,200);pointer(w,edge,'pointermove',204,200);pointer(w,edge,'pointerup',204,200);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),true);assert.equal(d.querySelector('#content').inert,true);assert.equal(d.querySelector('#viewportDock').inert,true);assert.equal(d.querySelector('#floatingLayer').inert,true);pointer(w,sidebar,'pointerdown',120,200);pointer(w,sidebar,'pointermove',120,350);pointer(w,sidebar,'pointerup',120,350);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),true);pointer(w,sidebar,'pointerdown',220,200);pointer(w,sidebar,'pointermove',20,200);pointer(w,sidebar,'pointerup',20,200);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),false);assert.equal(d.querySelector('#content').inert,false);assert.equal(d.querySelector('#viewportDock').inert,false);assert.equal(d.querySelector('#floatingLayer').inert,false)}finally{w.close()}
});
test('right drawer previews nonmodally, reverses, and settles modal only after release',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{const edge=d.querySelector('[data-edge="right"]');assert.ok(edge);const dialog=d.querySelector('#dialog');box(dialog,300);pointer(w,edge,'pointerdown',386,200);pointer(w,edge,'pointermove',296,200);assert.equal(dialog.open,true);assert.equal(dialog.classList.contains('app-drawer'),true);assert.equal(dialog.dataset.modal,undefined);assert.equal(Number(dialog.style.getPropertyValue('--drawer-progress')),.3);pointer(w,edge,'pointermove',376,200);pointer(w,edge,'pointerup',376,200);assert.equal(dialog.open,false);pointer(w,edge,'pointerdown',386,200);pointer(w,edge,'pointermove',186,200);pointer(w,edge,'pointerup',186,200);assert.equal(dialog.dataset.modal,'true');assert.equal(dialog.open,true);pointer(w,dialog,'pointerdown',180,200);pointer(w,dialog,'pointermove',380,200);pointer(w,dialog,'pointerup',380,200);assert.equal(dialog.open,false)}finally{w.close()}
});
test('cancel restores original drawer state and scrim dismissal leaves UI usable',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{const edge=d.querySelector('[data-edge="left"]');assert.ok(edge);box(d.querySelector('#sidebar'),300);pointer(w,edge,'pointerdown',4,200);pointer(w,edge,'pointermove',204,200);pointer(w,edge,'pointercancel',204,200);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),false);d.querySelector('#sidebarToggle').click();d.querySelector('#scrim').click();assert.equal(d.querySelector('#content').inert,false);d.querySelector('#appActions').click();assert.equal(d.querySelector('#dialog').classList.contains('app-drawer'),true);d.querySelector('#dialogClose').click();assert.equal(d.querySelector('#dialog').open,false);assert.equal(w.actions.length,0)}finally{w.close()}
});
test('standalone removes header launch buttons while browser access retains keyboard-accessible launchers',()=>{
 for(const standalone of [false,true]){const dom=terminal(standalone),d=dom.window.document;try{assert.equal(d.querySelector('#sidebarToggle').hidden,standalone);assert.equal(d.querySelector('#appActions').hidden,standalone);assert.equal(d.querySelector('[data-edge="left"]').getAttribute('aria-hidden'),'true')}finally{dom.window.close()}}
});
test('queued close notifications from modal settlement do not restyle the newly open right drawer',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{d.querySelector('#appActions').click();const dialog=d.querySelector('#dialog');dialog.dispatchEvent(new w.Event('close'));assert.equal(dialog.open,true);assert.equal(dialog.classList.contains('app-drawer'),true);assert.equal(dialog.dataset.modal,'true')}finally{w.close()}
});
test('native touch cancellation is restricted to a single edge contact',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{for(const [target,count,prevented] of [[d.querySelector('[data-edge="left"]'),1,true],[d.querySelector('.terminalwrap'),1,false],[d.querySelector('[data-edge="right"]'),2,false]]){const event=new w.Event('touchstart',{bubbles:true,cancelable:true});event.touches=Array.from({length:count},()=>({clientX:2,clientY:200}));target.dispatchEvent(event);assert.equal(event.defaultPrevented,prevented)}}finally{w.close()}
});
test('drawer drag release cannot activate its starting button and never swallows the next fresh tap',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{d.querySelector('#appActions').click();const dialog=d.querySelector('#dialog'),button=d.querySelector('#menuNewTab');box(dialog,300);let calls=0;button.onclick=()=>calls++;pointer(w,button,'pointerdown',180,200);pointer(w,button,'pointermove',380,200);pointer(w,button,'pointerup',380,200);button.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.equal(calls,0);d.querySelector('#appActions').click();const next=d.querySelector('#menuNewTab');next.onclick=()=>calls++;pointer(w,next,'pointerdown',180,200);pointer(w,next,'pointerup',180,200);next.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.equal(calls,1)}finally{w.close()}
});
