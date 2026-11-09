import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { RenderGrid } from '../grid.mjs';
import { KanaComposer } from '../kana.mjs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function terminal(standalone=false,width=390,tabCount=1) {
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>{if(error.type==='unhandled-exception')throw error});
  const dom = new JSDOM(html, { virtualConsole, url: 'https://pokemux-test.invalid', runScripts: 'outside-only', pretendToBeVisual: true }), w = dom.window;
  w.localStorage.setItem("cmux-pocket-customizations",JSON.stringify({shortcuts:[],snippets:[],keyboardMode:"custom",}));
  w.resizeObservers=[];w.ResizeObserver = class { constructor(callback){this.callback=callback;this.targets=new Set();w.resizeObservers.push(this)} observe(target){this.targets.add(target)} disconnect(){this.targets.clear()} };
  w.HTMLElement.prototype.setPointerCapture=()=>{};
  w.document.elementFromPoint=(x,y)=>[...w.document.querySelectorAll('body *')].reverse().find(element=>{const r=element.getBoundingClientRect();return !element.closest('[hidden]')&&r.width>0&&r.height>0&&x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom})||null;
  w.matchMedia = query => ({ matches:query.includes('max-width')&&width<1000||query.includes('max-height')||standalone&&query.includes('display-mode') });
  w.visualViewport = { width, height: 844, scale: 1, offsetTop: 0, offsetLeft:0, addEventListener() {} };
  w.document.querySelector('#edgeLayer').getBoundingClientRect=()=>({top:w.visualViewport.offsetTop,bottom:w.visualViewport.offsetTop+w.visualViewport.height});
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
    if (${tabCount}>1)fixture.panes[0].tabs.push(surface('owned-next','Next terminal'));
    workspaces.push(fixture);current=fixture;selectedWindow=fixture.window;connected=true;
    const initialFrame={format:'cmux.render-grid.v1',render_epoch:'owned-epoch',render_revision:1,full:true,rows:3,columns:30,row_spans:[{row:0,column:0,text:'hello 日本語',cell_width:12}],cursor:{row:0,column:12,visible:true,style:'bar'}};const model=new RenderGrid();model.apply(initialFrame);grids.set('owned-surface',model);
    render();window.fixtureUI={openDialog,keyboardDialog,openSidebar};
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
 try{for(const [target,count,prevented] of [[d.querySelector('[data-edge="left"]'),1,true],[d.querySelector('.terminalwrap'),1,false],[d.querySelector('[data-edge="right"]'),2,false]]){const event=new w.Event('touchstart',{bubbles:true,cancelable:true});event.touches=Array.from({length:count},()=>({clientX:2,clientY:200}));event.changedTouches=event.touches;target.dispatchEvent(event);assert.equal(event.defaultPrevented,prevented)}}finally{w.close()}
});
test('drawer drag release cannot activate its starting button and never swallows the next fresh tap',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{d.querySelector('#appActions').click();const dialog=d.querySelector('#dialog'),button=d.querySelector('#menuNewTab');box(dialog,300);let calls=0;button.onclick=()=>calls++;pointer(w,button,'pointerdown',180,200);pointer(w,button,'pointermove',380,200);pointer(w,button,'pointerup',380,200);button.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.equal(calls,0);d.querySelector('#appActions').click();const next=d.querySelector('#menuNewTab');next.onclick=()=>calls++;pointer(w,next,'pointerdown',180,200);pointer(w,next,'pointerup',180,200);next.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.equal(calls,1)}finally{w.close()}
});

test('reversed edge previews preserve the prior shortcut section and scroll position',()=>{
 for(const side of ['left','right']){const dom=terminal(),w=dom.window,d=w.document;try{w.fixtureUI.keyboardDialog('snippets',false);const dialog=d.querySelector('#dialog'),body=d.querySelector('#dialogBody');body.scrollTop=17;box(dialog,300);box(d.querySelector('#sidebar'),300);const edge=d.querySelector('[data-edge="'+side+'"]'),x=side==='left'?4:386,sign=side==='left'?1:-1;pointer(w,edge,'pointerdown',x,200);pointer(w,edge,'pointermove',x+sign*90,200);pointer(w,edge,'pointermove',x+sign*10,200);pointer(w,edge,'pointerup',x+sign*10,200);assert.equal(dialog.open,true,side+' reversal retains prior overlay');assert.equal(d.querySelector('[data-panel].active')?.dataset.panel,'snippets');assert.equal(body.scrollTop,17)}finally{w.close()}}
});
test('committing the opposite edge transfers overlay ownership but reversing preserves it',()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{w.fixtureUI.openSidebar();box(d.querySelector('#dialog'),300);const edge=d.querySelector('[data-edge="right"]');pointer(w,edge,'pointerdown',386,200);pointer(w,edge,'pointermove',296,200);pointer(w,edge,'pointerup',296,200);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),true);pointer(w,edge,'pointerdown',386,200);pointer(w,edge,'pointermove',186,200);pointer(w,edge,'pointerup',186,200);assert.equal(d.querySelector('#dialog').dataset.modal,'true');assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),false);assert.equal(d.querySelector('#viewportDock').inert,false)}finally{w.close()}
});
test('wide standalone layout retains launch controls when edge gestures are unavailable',()=>{
 const dom=terminal(true,1200),d=dom.window.document;try{assert.equal(d.querySelector('#appActions').hidden,false);assert.equal(d.querySelector('#sidebarToggle').hidden,false)}finally{dom.window.close()}
});
test('updating an open modal preserves its native top-layer ownership without reopening it',()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{const dialog=d.querySelector('#dialog');let moved=0,opened=0;const append=d.body.append.bind(d.body),showModal=dialog.showModal.bind(dialog);d.body.append=(...nodes)=>{if(dialog.open&&nodes.includes(dialog)){moved++;delete dialog.dataset.modal}append(...nodes)};dialog.showModal=()=>{opened++;if(dialog.open&&dialog.dataset.modal!=='true')throw new w.DOMException('Already nonmodal','InvalidStateError');showModal()};w.fixtureUI.openDialog('Tab','<button>Move left</button>');w.fixtureUI.openDialog('Tab','<button>Move right</button>');assert.equal(dialog.open,true);assert.equal(dialog.dataset.modal,'true');assert.equal(moved,0);assert.equal(opened,1);assert.equal(dialog.textContent.includes('Move right'),true)}finally{w.close()}
});


test('closing a drawer from its child control survives implicit capture transfer',()=>{
 for(const side of ['left','right']){const dom=terminal(),w=dom.window,d=w.document;try{const drawer=d.querySelector(side==='left'?'#sidebar':'#dialog');if(side==='left')w.fixtureUI.openSidebar();else d.querySelector('#appActions').click();box(drawer,300);const child=d.querySelector(side==='left'?'#search':'#menuNewTab'),start=side==='left'?220:80,end=side==='left'?20:280;let captureOwner;w.HTMLElement.prototype.setPointerCapture=function(){captureOwner=this};pointer(w,child,'pointerdown',start,200);pointer(w,child,'pointermove',end,200);pointer(w,child,'lostpointercapture',end,200);pointer(w,captureOwner,'pointerup',end,200);assert.equal(side==='left'?d.querySelector('#shell').classList.contains('sidebar-open'):drawer.open,false,side+' must settle closed after the child loses implicit capture');assert.equal(d.querySelector('#content').inert,false);assert.equal(d.querySelector('#viewportDock').inert,false);assert.equal(d.querySelector('#floatingLayer').inert,false)}finally{w.close()}}
});

test('sidebar search clear restores results and keeps the search field ready',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{w.fixtureUI.openSidebar();const input=d.querySelector('#search'),clear=d.querySelector('#searchClear');assert.ok(clear,'Search needs a clear button');assert.equal(clear.hidden,true);input.value='no matching workspace';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(clear.hidden,false);assert.equal(d.querySelectorAll('[data-workspace]').length,0);clear.click();assert.equal(input.value,'');assert.equal(clear.hidden,true);assert.ok(d.querySelector('[data-workspace]'));assert.equal(d.activeElement,input);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),true);assert.equal(w.actions.length,0)}finally{w.close()}
});

function touch(w,target,type,points,at){const event=new w.Event(type,{bubbles:true,cancelable:true});const contacts=points.map(([clientX,clientY],identifier)=>({identifier,target,clientX,clientY}));event.touches=type==='touchend'||type==='touchcancel'?[]:contacts;event.changedTouches=contacts;if(at!==undefined)Object.defineProperty(event,'timeStamp',{value:at});target.dispatchEvent(event);return event}
function scroller(w,left=0,max=200){const wrap=w.document.querySelector('.terminalwrap');Object.defineProperty(wrap,'clientWidth',{value:390});Object.defineProperty(wrap,'scrollWidth',{value:390+max});wrap.scrollLeft=left;box(w.document.querySelector('#sidebar'),300);box(w.document.querySelector('#dialog'),300);return wrap}

function pan(w,target,type,points,at){if(points.length>1)return touch(w,target,type,points,at);const event=new w.Event(type.replace('touchstart','pointerdown').replace('touchmove','pointermove').replace('touchend','pointerup').replace('touchcancel','pointercancel'),{bubbles:true,cancelable:true});Object.assign(event,{pointerId:9,button:0,isPrimary:true,clientX:points[0][0],clientY:points[0][1]});if(at!==undefined)Object.defineProperty(event,'timeStamp',{value:at});target.dispatchEvent(event);return event}
test('content pan consumes scroll travel then pulls a drawer continuously from an interior touch',()=>{
 for(const side of ['left','right']){const dom=terminal(true),w=dom.window,d=w.document;try{const wrap=scroller(w,side==='left'?70:130),x=side==='left'?100:300,sign=side==='left'?1:-1;pan(w,wrap,'touchstart',[[x,250]]);const scroll=pan(w,wrap,'touchmove',[[x+sign*50,250]]);assert.equal(wrap.scrollLeft,side==='left'?20:180);assert.equal(scroll.defaultPrevented,true);assert.equal(d.querySelector('#shell').classList.contains('sidebar-preview'),false);assert.equal(d.querySelector('#dialog').open,false);pan(w,wrap,'touchmove',[[x+sign*160,250]]);assert.equal(wrap.scrollLeft,side==='left'?0:200);const progress=Number((side==='left'?d.querySelector('#shell'):d.querySelector('#dialog')).style.getPropertyValue(side==='left'?'--sidebar-progress':'--drawer-progress'));assert.equal(progress,.3,'Only the90px beyond the boundary pulls the300px drawer');pan(w,wrap,'touchmove',[[x+sign*230,250]]);pan(w,wrap,'touchend',[[x+sign*230,250]]);assert.equal(side==='left'?d.querySelector('#shell').classList.contains('sidebar-open'):d.querySelector('#dialog').dataset.modal==='true',true);assert.equal(w.actions.length,0)}finally{w.close()}}
});
test('boundary pull reverses back into scrolling and cancellation never opens a drawer',()=>{
 for(const side of ['left','right'])for(const end of ['reverse','touchcancel','multitouch']){const dom=terminal(),w=dom.window,d=w.document;try{const wrap=scroller(w,side==='left'?0:200),x=side==='left'?100:300,sign=side==='left'?1:-1;pan(w,wrap,'touchstart',[[x,250]]);pan(w,wrap,'touchmove',[[x+sign*160,250]]);assert.equal(Number((side==='left'?d.querySelector('#shell'):d.querySelector('#dialog')).style.getPropertyValue(side==='left'?'--sidebar-progress':'--drawer-progress')),160/300);if(end==='reverse'){pan(w,wrap,'touchmove',[[x-sign*40,250]]);assert.equal(wrap.scrollLeft,side==='left'?40:160);pan(w,wrap,'touchend',[[x-sign*40,250]])}else if(end==='multitouch'){pan(w,wrap,'touchstart',[[x+sign*160,250],[x,300]]);pan(w,wrap,'touchcancel',[[x+sign*160,250],[x,300]])}else pan(w,wrap,'touchcancel',[[x+sign*160,250]]);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),false);assert.equal(d.querySelector('#shell').classList.contains('sidebar-preview'),false);assert.equal(d.querySelector('#dialog').open,false);assert.notEqual(d.querySelector('#content').inert,true);assert.equal(w.actions.length,0)}finally{w.close()}}
});
test('terminal vertical movement and selected text keep drawer ownership untouched',()=>{
 for(const selected of [false,true]){const dom=terminal(),w=dom.window,d=w.document;try{const wrap=scroller(w);if(selected){const range=d.createRange();range.selectNodeContents(d.querySelector('.terminal'));w.getSelection().addRange(range)}pan(w,wrap,'touchstart',[[120,250]]);const move=pan(w,wrap,'touchmove',[selected?[300,250]:[120,450]]);pan(w,wrap,'touchend',[selected?[300,250]:[120,450]]);assert.equal(move.defaultPrevented,false);assert.equal(d.querySelector('#shell').classList.contains('sidebar-preview'),false);assert.equal(d.querySelector('#dialog').open,false);assert.equal(w.actions.length,0)}finally{w.close()}}
});


test('horizontal scroll momentum stops at either content edge without pulling a drawer',async()=>{
 for(const side of ['left','right']){const dom=terminal(),w=dom.window,d=w.document;try{const wrap=scroller(w,side==='left'?40:160),sign=side==='left'?1:-1,frames=new Map();let clock=21,next=0;w.performance.now=()=>clock;w.requestAnimationFrame=fn=>{frames.set(++next,fn);return next};w.cancelAnimationFrame=id=>frames.delete(id);pan(w,wrap,'touchstart',[[200,250]],0);pan(w,wrap,'touchmove',[[200+sign*20,250]],20);pan(w,wrap,'touchend',[[200+sign*20,250]],21);assert.equal(wrap.scrollLeft,side==='left'?20:180);for(let i=0;i<8;i++){clock+=16;const batch=[...frames.values()];frames.clear();for(const frame of batch)frame(clock);await new Promise(r=>w.setTimeout(r,0))}assert.equal(wrap.scrollLeft,side==='left'?0:200);assert.equal(d.querySelector('#shell').classList.contains('sidebar-preview'),false);assert.equal(d.querySelector('#dialog').open,false);pan(w,wrap,'touchstart',[[200,250]],200);pan(w,wrap,'touchmove',[[200+sign*90,250]],220);assert.equal(Number((side==='left'?d.querySelector('#shell'):d.querySelector('#dialog')).style.getPropertyValue(side==='left'?'--sidebar-progress':'--drawer-progress')),.3,'A fresh intentional overscroll pulls the drawer after momentum stopped');pan(w,wrap,'touchcancel',[[200+sign*90,250]],221);assert.equal(w.actions.length,0)}finally{w.close()}}
});
test('native selection established during a long press is not taken over by a drawer pull',()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{const wrap=scroller(w);pan(w,wrap,'touchstart',[[120,250]]);const range=d.createRange();range.selectNodeContents(d.querySelector('.terminal'));w.getSelection().addRange(range);const move=pan(w,wrap,'touchmove',[[300,250]]);pan(w,wrap,'touchend',[[300,250]]);assert.equal(move.defaultPrevented,false);assert.equal(d.querySelector('#shell').classList.contains('sidebar-preview'),false);assert.ok(w.getSelection().toString());assert.equal(w.actions.length,0)}finally{w.close()}
});

test('a brief second contact on the joystick cancels a stationary terminal drawer pull',()=>{
 for(const side of ['left','right']){const dom=terminal(),w=dom.window,d=w.document;try{const wrap=scroller(w,side==='left'?0:200),sign=side==='left'?1:-1;pan(w,wrap,'touchstart',[[200,250]]);pan(w,wrap,'touchmove',[[200+sign*170,250]]);const joystick=d.querySelector('#cursorJoystick'),first={identifier:9,target:wrap,clientX:200+sign*170,clientY:250},second={identifier:10,target:joystick,clientX:20,clientY:800},event=new w.Event('touchstart',{bubbles:true,cancelable:true});event.touches=[first,second];event.changedTouches=[second];joystick.dispatchEvent(event);const end=new w.Event('touchend',{bubbles:true,cancelable:true});end.touches=[first];end.changedTouches=[second];joystick.dispatchEvent(end);pan(w,wrap,'touchend',[[200+sign*170,250]]);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),false);assert.equal(d.querySelector('#dialog').open,false);assert.equal(w.actions.length,0)}finally{w.close()}}
});

test('final pointer position can complete an interior pull without intermediate moves',()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{const wrap=scroller(w);pan(w,wrap,'touchstart',[[100,250]]);pan(w,wrap,'touchend',[[300,250]]);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),true);assert.equal(w.actions.length,0)}finally{w.close()}
});


test('horizontal content swipes choose their action from the visible terminal half at touch-down',()=>{
 const dom=terminal(true,390,2),w=dom.window,d=w.document;
 try{
  Object.assign(w.visualViewport,{height:420,offsetTop:80});
  const active=()=>d.querySelector('.surfacetab.active').dataset.surface;
  const viewport=()=>{
   const wrap=scroller(w,0,0);
   wrap.getBoundingClientRect=()=>({top:110,bottom:450});
   return wrap;
  };
  let wrap=viewport();
  pointer(w,wrap,'pointerdown',300,230);
  pointer(w,wrap,'pointermove',150,300);
  const cue=d.querySelector('#swipeGuide');
  assert.ok(cue&&!cue.hidden,'Upper drag shows the live edge guide');
  assert.equal(cue.dataset.side,'right');
  assert.equal(cue.dataset.action,'tabs');
  assert.equal(active(),'owned-surface','Tabs change only on release');
  assert.equal(d.querySelector('#dialog').open,false);
  pointer(w,wrap,'pointerup',150,300);
  assert.equal(active(),'owned-next');
  assert.equal(cue.hidden,true);
  wrap=viewport();
  pointer(w,wrap,'pointerdown',90,230);pointer(w,wrap,'pointerup',230,230);
  assert.equal(active(),'owned-surface','Rightward swipe returns to the previous tab');
  wrap=viewport();
  pointer(w,wrap,'pointerdown',90,230);pointer(w,wrap,'pointerup',230,230);
  assert.equal(active(),'owned-surface','No wrapping at the first tab');
  pointer(w,wrap,'pointerdown',90,355);pointer(w,wrap,'pointermove',270,310);
  assert.equal(cue.dataset.side,'left');
  assert.equal(cue.dataset.action,'drawer');
  assert.equal(d.querySelector('#shell').classList.contains('sidebar-preview'),true);
  pointer(w,wrap,'pointerup',270,310);
  assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),true);
  assert.equal(cue.hidden,true);
  assert.equal(active(),'owned-surface');
  assert.equal(w.actions.length,0);
 }finally{w.close()}
});

test('a reversed or interrupted upper swipe clears the guide and leaves the active tab in place',()=>{
 const dom=terminal(true,390,2),w=dom.window,d=w.document;
 try{
  const wrap=scroller(w,30,200),active=()=>d.querySelector('.surfacetab.active').dataset.surface;
  wrap.getBoundingClientRect=()=>({top:50,bottom:790});
  const cue=d.querySelector('#swipeGuide');
  pointer(w,wrap,'pointerdown',280,180);pointer(w,wrap,'pointermove',160,180);
  assert.equal(wrap.scrollLeft,30,'Upper swipes leave horizontal terminal pan alone');
  pointer(w,wrap,'pointermove',270,180);pointer(w,wrap,'pointerup',270,180);
  assert.equal(active(),'owned-surface');assert.ok(cue?.hidden);
  pointer(w,wrap,'pointerdown',280,180);pointer(w,wrap,'pointermove',160,180);
  touch(w,wrap,'touchstart',[[160,180],[215,240]]);
  pointer(w,wrap,'pointerup',160,180);
  assert.equal(active(),'owned-surface');assert.equal(cue.hidden,true);
 }finally{w.close()}
});

test('a keyboard-zoomed viewport still measures the split in the same coordinates as the touch',()=>{
 const dom=terminal(true,390,2),w=dom.window,d=w.document;
 try{
  Object.assign(w.visualViewport,{height:325,scale:1.334,offsetTop:456});
  const wrap=scroller(w,0,0),layer=d.querySelector('#edgeLayer');
  layer.getBoundingClientRect=()=>({top:0,bottom:325});
  wrap.getBoundingClientRect=()=>({top:35,bottom:222});
  pointer(w,wrap,'pointerdown',65,175);
  pointer(w,wrap,'pointermove',235,175);
  assert.equal(d.querySelector('#swipeGuide').dataset.action,'drawer');
  pointer(w,wrap,'pointerup',235,175);
  assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),true);
  assert.equal(d.querySelector('.surfacetab.active').dataset.surface,'owned-surface');
 }finally{w.close()}
});
