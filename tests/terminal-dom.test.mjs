import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { RenderGrid } from '../grid.mjs';
import {KeyboardDecoder,calibrate} from '../keyboard.mjs';
import { KanaComposer } from '../kana.mjs';
import { installPopover } from './popover-fixture.mjs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function terminal(saved,legacyTouchProperties=true) {
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>{if(error.type==='unhandled-exception')throw error});
  const dom = new JSDOM(html, { virtualConsole, url: 'https://pokemux-test.invalid', runScripts: 'outside-only', pretendToBeVisual: true }), w = dom.window;
  w.localStorage.setItem("cmux-pocket-customizations",JSON.stringify({shortcuts:[],snippets:[],keyboardMode:"native",keyboardDefaultVersion:1,...saved}));
  if(!legacyTouchProperties)for(const name of ['ontouchstart','ontouchmove','ontouchend','ontouchcancel'])delete w.HTMLElement.prototype[name];
  w.isSecureContext=true;w.diagnostics=[];w.diagnosticRequests=[];
  w.resizeObservers=[];w.ResizeObserver = class { constructor(callback){this.callback=callback;this.targets=new Set();w.resizeObservers.push(this)} observe(target){this.targets.add(target)} disconnect(){this.targets.clear()} };
  installPopover(w);w.HTMLElement.prototype.setPointerCapture=()=>{};
  const originalRect=w.HTMLElement.prototype.getBoundingClientRect;
  w.HTMLElement.prototype.getBoundingClientRect=function(){const button=this.closest('[data-typing-key]');if(this.id==='softwareKeyboard')return {left:0,top:500,width:390,height:300,right:390,bottom:800};if(!button)return originalRect.call(this);const row=button.parentElement,rows=[...row.parentElement.children],buttons=[...row.children],i=buttons.indexOf(button),unit=390/buttons.length,left=i*unit,top=505+rows.indexOf(row)*58;return this===button?{left,top,width:unit,height:58,right:left+unit,bottom:top+58}:{left:left+3,top:top+3,width:unit-6,height:52,right:left+unit-3,bottom:top+55}};
  w.document.elementFromPoint=(x,y)=>[...w.document.querySelectorAll('body *')].reverse().find(element=>{const r=element.getBoundingClientRect();return !element.closest('[hidden]')&&r.width>0&&r.height>0&&x>=r.left&&x<r.left+r.width&&y>=r.top&&y<r.top+r.height})||null;
  w.matchMedia = () => ({ matches: true });
  w.visualViewport = { width:390, height: 844, scale: 1, offsetTop: 0, offsetLeft:0, addEventListener() {} };
  Object.defineProperties(w.document.documentElement,{clientWidth:{value:390},clientHeight:{value:844}});w.innerHeight=844;
  w.EventSource = class { constructor() { w.fixtureStream=this; } addEventListener(type,fn) { (this.handlers??={})[type]=fn; } close() { this.closed=true; } };
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.show=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  w.__KeyboardDecoder=KeyboardDecoder;w.__calibrate=calibrate;w.__RenderGrid = RenderGrid;w.__KanaComposer=KanaComposer;
  w.actions=[];w.fetch=async(path,options)=>{if(path==='/api/action')w.actions.push(JSON.parse(options.body));if(path==='/api/client-diagnostic'){const payload=JSON.parse(options.body);w.diagnosticRequests.push({payload,keepalive:!!options.keepalive});w.diagnostics.push(...(Array.isArray(payload)?payload:[payload]))}return {ok:true,status:200,json:async()=>({})};};
  const script = html.split('<script type="module">\n')[1].split('</script>')[0];
  w.eval(script.slice(0, script.lastIndexOf('(async()=>{')) + `
    KeyboardDecoder=window.__KeyboardDecoder;calibrate=window.__calibrate;RenderGrid=window.__RenderGrid;KanaComposer=window.__KanaComposer;kana=new KanaComposer();
    const fixture=workspace('owned-workspace','Owned workspace',null,'','',[pane('owned-pane',[surface('owned-surface','Owned terminal')])],'owned-window');
    workspaces.push(fixture);current=fixture;selectedWindow=fixture.window;connected=true;
    const initialFrame={format:'cmux.render-grid.v1',render_epoch:'owned-epoch',render_revision:1,full:true,rows:3,columns:30,row_spans:[{row:0,column:0,text:'hello 日本語',cell_width:12}],cursor:{row:0,column:12,visible:true,style:'bar'}};const model=new RenderGrid();model.apply(initialFrame);grids.set('owned-surface',model);
    render();window.fixture={displaySettings,flushInputDiagnostics:typeof flushInputDiagnostics==='function'?flushInputDiagnostics:undefined,otherTerminal(){fixture.panes[0].tabs.push(surface('owned-surface-two','Other terminal'));const other=new RenderGrid();other.apply(initialFrame);grids.set('owned-surface-two',other);selectSurface('owned-pane','owned-surface-two')},inactivePane(){const other=new RenderGrid();other.apply({...initialFrame,active_screen:'alternate',modes:[{code:1000,on:true,ansi:false}]});grids.set('inactive-surface',other);fixture.panes.push(pane('inactive-pane',[surface('inactive-surface','Other pane')]));const box=document.querySelector('.panebox').cloneNode(true);box.classList.remove('focused');box.querySelector('.terminalwrap').dataset.paneFocus='inactive-pane';box.querySelector('.terminal').dataset.surfaceId='inactive-surface';box.querySelector('.terminal').replaceChildren();document.querySelector('.panegrid').append(box);other.paint(box.querySelector('.terminal'));render();return box.querySelector('.terminalwrap')},metadata(name){fixture.name='Directory changed';if(name)fixture.panes[0].tabs[0].name=name;render()},model,paintTerminal,syncViewport,caretToEnd,focusInput,applyTree};
  `);
  return dom;
}
function recordedDiagnostics(w){w.fixture.flushInputDiagnostics();return w.diagnostics}
function terminalPointer(w,root,type,x=42,y=10,extra={}){const event=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:1,button:0,isPrimary:true,clientX:x,clientY:y,...extra});root.dispatchEvent(event)}
function terminalGeometry(output){output.getBoundingClientRect=()=>({left:-85,top:-21,width:450,height:93});for(const [i,row]of[...output.children].entries())row.getBoundingClientRect=()=>({top:-21+i*31,bottom:-21+(i+1)*31,height:31});}
test('terminal tap sends one native cell click before keyboard focus, with movement, cancellation, selection and long-press excluded',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=d.querySelector('.terminalwrap');
 try{w.fixture.model.modes=[{code:1000,on:true,ansi:false}];terminalGeometry(output);
  terminalPointer(w,wrap,'pointerdown');terminalPointer(w,wrap,'pointerup');await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>({action:a.action,col:a.col,row:a.row,surface:a.surface_id})),[{action:'mouse',col:8,row:1,surface:'owned-surface'}]);assert.equal(d.querySelector('#softwareKeyboard').hidden,false,'The same tap engages typing');
  terminalPointer(w,wrap,'pointerdown');terminalPointer(w,wrap,'pointermove',70,30);terminalPointer(w,wrap,'pointerup',42,10);
  terminalPointer(w,wrap,'pointerdown');terminalPointer(w,wrap,'pointercancel');terminalPointer(w,wrap,'pointerup');
  terminalPointer(w,wrap,'pointerdown');terminalPointer(w,wrap,'pointerdown',50,10,{pointerId:2,isPrimary:false});terminalPointer(w,wrap,'pointerup');
  terminalPointer(w,wrap,'pointerdown');await new Promise(r=>w.setTimeout(r,310));terminalPointer(w,wrap,'pointerup');
  const range=d.createRange();range.selectNodeContents(output.firstElementChild);w.getSelection().addRange(range);terminalPointer(w,wrap,'pointerdown');terminalPointer(w,wrap,'pointerup');assert.ok(w.getSelection().toString(),'Selection is retained');
  await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,1,'Only the completed short tap sends a click');
 }finally{w.close()}
});
test('tap routes the tapped inactive pane rather than the previously active terminal',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window;
 try{const wrap=w.fixture.inactivePane();terminalGeometry(wrap.querySelector('.terminal'));terminalPointer(w,wrap,'pointerdown');terminalPointer(w,wrap,'pointerup');await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,1);assert.deepEqual({surface:w.actions[0].surface_id,workspace:w.actions[0].workspace_id,col:w.actions[0].col,row:w.actions[0].row},{surface:'inactive-surface',workspace:'owned-workspace',col:8,row:1});assert.equal(w.document.querySelector('.terminal').dataset.surfaceId,'inactive-surface');
 }finally{w.close()}
});
test('native keyboard focus cannot move a completed tap to a different terminal cell',async()=>{
 const dom=terminal(),w=dom.window,output=w.document.querySelector('.terminal'),wrap=w.document.querySelector('.terminalwrap');
 try{w.fixture.model.modes=[{code:1000,on:true,ansi:false}];terminalGeometry(output);terminalPointer(w,wrap,'pointerdown');output.getBoundingClientRect=()=>({left:-85,top:-21,width:900,height:186});for(const [i,row]of[...output.children].entries())row.getBoundingClientRect=()=>({top:-21+i*62,bottom:-21+(i+1)*62,height:62});terminalPointer(w,wrap,'pointerup');await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,1);assert.deepEqual({col:w.actions[0].col,row:w.actions[0].row},{col:8,row:1});
 }finally{w.close()}
});
test('normal screen keyboard taps and historical output never send unrelated TUI mouse cells',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,output=w.document.querySelector('.terminal'),wrap=w.document.querySelector('.terminalwrap');
 try{terminalGeometry(output);terminalPointer(w,wrap,'pointerdown');terminalPointer(w,wrap,'pointerup');assert.equal(w.document.querySelector('#softwareKeyboard').hidden,false);
  const model=w.fixture.model;model.apply({format:'cmux.render-grid.v1',render_epoch:'history',render_revision:1,full:true,rows:3,columns:30,scrollback_rows:1,scrollback_spans:[{row:0,column:0,text:'old output'}],row_spans:[],modes:[{code:1000,on:true,ansi:false}]});model.paint(output);terminalGeometry(output);terminalPointer(w,wrap,'pointerdown',42,-10);terminalPointer(w,wrap,'pointerup',42,-10);await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,0);
 }finally{w.close()}
});
test('swipe without a follow-up click cannot swallow the next dialog action',async()=>{
  const dom=terminal(),w=dom.window,d=w.document;
  try {
    w.HTMLElement.prototype.setPointerCapture=()=>{};
    d.querySelector('#appActions').click();d.querySelector('#menuKeyboard').click();
    const key=d.querySelector('#dialog .sheetnav');
    const pointer=(type,y)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,button:0,isPrimary:true,clientX:120,clientY:y});key.dispatchEvent(e)};
    pointer('pointerdown',20);pointer('pointermove',140);pointer('pointerup',140);
    assert.equal(d.querySelector('#dialog').open,false);
    d.querySelector('#appActions').click();d.querySelector('#menuKeyboard').click();
    assert.equal(d.querySelector('#dialogTitle').textContent,'Shortcuts');
    d.querySelector('.inputdock [data-key="Tab"]').click();await new Promise(r=>w.setTimeout(r,0));
    assert.equal(w.actions.length,1);assert.equal(w.actions[0].key,'Tab');
  } finally {w.close()}
});
test('native shortcut touch completes before a retargeted compatibility click, without duplicate keys or drag activation',async()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal');try{output.focus();const ctrl=d.querySelector('.inputdock [data-key="Ctrl"]'),glyph=ctrl.querySelector('path'),rail=ctrl.closest('.inputdock');
  const touch=new w.Event('touchstart',{bubbles:true,cancelable:true});Object.defineProperty(touch,'changedTouches',{value:[]});Object.defineProperty(touch,'touches',{value:[]});glyph.dispatchEvent(touch);assert.equal(touch.defaultPrevented,true,'Stop the native touch from producing a focus-changing mouse sequence');
  for(const state of ['once','locked','released']){terminalPointer(w,glyph,'pointerdown');terminalPointer(w,glyph,'pointerup');assert.equal(ctrl.classList.contains('active'),state!=='released');assert.equal(ctrl.classList.contains('locked'),state==='locked');ctrl.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.equal(ctrl.classList.contains('locked'),state==='locked','A compatibility click must not activate twice');assert.equal(d.activeElement,output)}
  const key=d.querySelector('.inputdock [data-key="Ctrl-A"]');terminalPointer(w,key,'pointerdown');terminalPointer(w,key,'pointerup');key.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.key),['Ctrl-A']);
  terminalPointer(w,ctrl,'pointerdown');terminalPointer(w,ctrl,'pointermove',80,10);terminalPointer(w,ctrl,'pointerup',80,10);ctrl.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.equal(ctrl.classList.contains('active'),false);assert.equal(d.activeElement,output);assert.ok(rail.isConnected);
 }finally{w.close()}
});
test('shortcut cancellation and target changes never send a key; accessibility clicks still activate',async()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{const ctrl=d.querySelector('.inputdock [data-key="Ctrl"]');terminalPointer(w,ctrl,'pointerdown');terminalPointer(w,ctrl,'pointercancel');terminalPointer(w,ctrl,'pointerup');assert.equal(ctrl.classList.contains('active'),false);const displaced=d.querySelector('.inputdock [data-key="Tab"]');terminalPointer(w,displaced,'pointerdown');terminalPointer(w,displaced,'pointerup',200,100);displaced.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,0,'A displaced release without a delivered move is still a drag');ctrl.click();assert.equal(ctrl.classList.contains('active'),true);ctrl.click();assert.equal(ctrl.classList.contains('locked'),true);ctrl.click();
 const key=d.querySelector('.inputdock [data-key="Tab"]');terminalPointer(w,key,'pointerdown');w.fixture.otherTerminal();terminalPointer(w,key,'pointerup');await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,0,'A completed contact cannot jump to the newly selected terminal');
 }finally{w.close()}
});
test('emulated keyboard cancels native touch defaults on keys and gaps without losing independent pointer input',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;try{const root=d.querySelector('#softwareKeyboard'),key=root.querySelector('[data-typing-key="p"]'),row=key.parentElement;
 for(const target of [key,key.querySelector('span'),row,root]){const e=new w.Event('touchstart',{bubbles:true,cancelable:true});Object.assign(e,{changedTouches:[],touches:[]});target.dispatchEvent(e);assert.equal(e.defaultPrevented,true,'The keyboard must own the touch rather than leave native page zoom eligible')}
 for(let i=0;i<2;i++){keyboardPointer(w,key,'pointerdown');keyboardPointer(w,key,'pointerup')}
 const other=root.querySelector('[data-typing-key="o"]');keyboardPointer(w,key,'pointerdown');keyboardPointer(w,other,'pointerdown',2);keyboardPointer(w,key,'pointerup');keyboardPointer(w,other,'pointerup',2);await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.map(a=>a.text).join(''),'pppo');
 }finally{w.close()}
});
test('metadata refresh retains a pressed shortcut, modifier cycle and rail scroll without losing native focus',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{const output=d.querySelector('.terminal');output.focus();const ctrl=d.querySelector('.inputdock [data-key="Ctrl"]'),rail=d.querySelector('.inputdock'),keys=rail.querySelector('.keygroups');keys.scrollLeft=67;
  for(const state of ['once','locked','released']){terminalPointer(w,ctrl,'pointerdown');w.fixture.metadata('Changed tab title');assert.equal(d.querySelector('.inputdock [data-key="Ctrl"]'),ctrl,'An active contact must retain its button');assert.equal(keys.scrollLeft,67);terminalPointer(w,ctrl,'pointerup');ctrl.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.equal(ctrl.classList.contains('active'),state!=='released');assert.equal(ctrl.classList.contains('locked'),state==='locked');assert.equal(d.activeElement,output)}
  const taps=recordedDiagnostics(w).filter(row=>row.event==='pointerdown');assert.equal(taps.length,3);assert.ok(taps.every(row=>row.target==='shortcut'&&row.mode==='native'),'Shortcut taps start their own content-free capture window');
  terminalPointer(w,ctrl,'pointerdown');terminalPointer(w,ctrl,'pointermove',42,30);w.fixture.metadata();terminalPointer(w,ctrl,'pointerup',42,30);ctrl.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.equal(ctrl.classList.contains('active'),false,'A metadata refresh must not turn a drag into a shortcut');
 }finally{w.close()}
});
test('pull-to-refresh keeps its armed arrow orientation while the page reload is pending',()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{const header=d.querySelector('.workspacehead'),mark=d.querySelector('.pullmark');terminalPointer(w,header,'pointerdown',150,30);terminalPointer(w,header,'pointermove',150,150);const armed=w.getComputedStyle(mark);assert.equal(d.querySelector('#pullLabel').textContent,'Release to refresh');const transform=armed.transform,animation=armed.animation;terminalPointer(w,header,'pointerup',150,150);assert.equal(d.querySelector('#pullLabel').textContent,'Refreshing…');const released=w.getComputedStyle(mark);assert.equal(released.transform,transform);assert.equal(released.animation,animation,'Release must not start spinning the arrow');
 }finally{w.close()}
});
test('pull-to-refresh recognizes a displaced release even when no intermediate move is delivered',()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{const header=d.querySelector('.workspacehead');terminalPointer(w,header,'pointerdown',150,30);terminalPointer(w,header,'pointerup',150,150);assert.equal(d.querySelector('#pullLabel').textContent,'Refreshing…');assert.equal(d.querySelector('#pullIndicator').hidden,false);
 }finally{w.close()}
});
test('closing the final workspace detaches its terminal stream and keyboard before empty-state rendering',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;try{const stream=w.fixtureStream;w.fixture.applyTree({notifications:[],windows:[{id:'owned-window',groups:[],workspaces:[]}]});assert.equal(stream.closed,true,'A removed terminal must stop its stream');assert.equal(d.querySelector('#softwareKeyboard').hidden,true);assert.equal(d.querySelector('#cursorJoystick').hidden,true);await stream.onerror();assert.equal(d.querySelector('#toast').classList.contains('show'),false,'The closed workspace is not a connection interruption');assert.equal(w.actions.length,0);
 }finally{w.close()}
});
test('metadata repaint preserves terminal DOM, native focus, text selection and reading scroll position', () => {
  const dom = terminal(), w = dom.window, d = w.document, output = d.querySelector('.terminal'), wrap = d.querySelector('.terminalwrap');
  try {
    output.focus();
    const text = output.querySelector('span').firstChild, range = d.createRange(); range.setStart(text, 0); range.setEnd(text, 5);
    w.getSelection().removeAllRanges(); w.getSelection().addRange(range); wrap.scrollTop = 77; wrap.scrollLeft = 20;
    w.fixture.metadata();
    assert.equal(d.querySelector('.terminal'), output);
    assert.equal(d.activeElement, output); assert.equal(w.getSelection().toString(), 'hello');
    assert.equal(wrap.scrollTop, 77); assert.equal(wrap.scrollLeft, 20);
    assert.equal(d.querySelector('.workspacehead').getAttribute('aria-label'), 'Directory changed');
  } finally { w.close(); }
});

test('streaming output preserves active native composition and commits its text exactly once',async()=>{
  const dom=terminal(),w=dom.window,output=w.document.querySelector('.terminal');
  try {
    output.focus();output.dispatchEvent(new w.CompositionEvent('compositionstart',{data:''}));
    const composing=w.document.createTextNode('日本');output.append(composing);
    w.fixture.model.apply({format:'cmux.render-grid.v1',render_epoch:'owned-epoch',render_revision:2,full:true,rows:3,columns:30,row_spans:[{row:0,column:0,text:'background output'}],cursor:{row:0,column:17,visible:true,style:'bar'}});
    w.fixture.paintTerminal();assert.equal(composing.isConnected,true,'Live output must not delete the IME composition node');
    output.dispatchEvent(new w.CompositionEvent('compositionend',{data:'日本'}));await new Promise(resolve=>w.setTimeout(resolve,0));
    assert.equal(w.actions.length,1);assert.equal(w.actions[0].text,'日本');
    assert.ok(output.textContent.includes('background output'));assert.equal(composing.isConnected,false);
  }finally{w.close();}
});
test('committing native paste or typing ends highlight so authoritative output can paint',async()=>{
 for(const action of ['paste','input','Backspace','Ctrl-x']){
  const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal');
  try{
   output.focus();const range=d.createRange();range.selectNodeContents(output.querySelector('span'));w.getSelection().removeAllRanges();w.getSelection().addRange(range);
   const text='日本語';let event;
   if(action==='paste'){event=new w.Event('paste',{bubbles:true,cancelable:true});event.clipboardData={getData:()=>text}}
   else if(action==='Backspace')event=new w.KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:'Backspace'});
   else{if(action==='Ctrl-x')d.querySelector('[data-key="Ctrl"]').click();event=new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:action==='Ctrl-x'?'x':text})}
   output.dispatchEvent(event);await new Promise(r=>w.setTimeout(r,0));
   assert.equal(w.actions.length,1);assert.equal(w.actions[0].action,['paste','input'].includes(action)?action:'key');if(['paste','input'].includes(action))assert.equal(w.actions[0].text,text);else assert.equal(w.actions[0].key,action);
   w.fixture.model.apply({format:'cmux.render-grid.v1',render_epoch:'owned-epoch',render_revision:2,full:true,rows:3,columns:30,row_spans:[{row:0,column:0,text:'echo '+text}],cursor:{row:0,column:8,visible:true,style:'bar'}});w.fixture.paintTerminal();
   assert.equal(w.getSelection().toString(),'');assert.ok(output.textContent.includes('echo '+text),'Committed input must reveal the authoritative echo without a second terminal tap');
  }finally{w.close()}
 }
});

test('terminal actions preserve a native insertion caret when the remote grid does not change',async()=>{
 for(const highlighted of [false,true]){
  const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal');
  try{
   output.focus();const range=d.createRange();
   if(highlighted)range.selectNodeContents(output.querySelector('span'));
   else{range.setStart(output.remoteCaret.node,output.remoteCaret.offset);range.collapse(true)}
   w.getSelection().removeAllRanges();w.getSelection().addRange(range);
   for(const key of ['Backspace','ArrowLeft','Backspace']){
    output.dispatchEvent(new w.KeyboardEvent('keydown',{bubbles:true,cancelable:true,key}));await new Promise(r=>w.setTimeout(r,0));
    assert.equal(d.activeElement,output);assert.equal(w.getSelection().rangeCount,1,'A no-op key must leave Safari able to create the next native input event');
    assert.equal(w.getSelection().isCollapsed,true);assert.ok(output.contains(w.getSelection().anchorNode));
   }
   assert.deepEqual(w.actions.map(a=>a.key),['Backspace','Left','Backspace']);
  }finally{w.close()}
 }
});

test('stream paint defers during native selection, catches up after selection ends, and repeated paint preserves caret', () => {
  const dom = terminal(), w = dom.window, d = w.document, output = d.querySelector('.terminal');
  try {
    output.focus(); const text = output.querySelector('span').firstChild, range = d.createRange(); range.setStart(text, 0); range.setEnd(text, 5);
    w.getSelection().removeAllRanges(); w.getSelection().addRange(range);
    w.fixture.model.apply({format:'cmux.render-grid.v1',render_epoch:'owned-epoch',render_revision:2,delta_base_render_revision:1,full:false,rows:3,columns:30,cleared_rows:[0],row_spans:[{row:0,column:0,text:'new result'}],cursor:{row:0,column:10,visible:true,style:'bar'}});
    w.fixture.paintTerminal(); assert.equal(w.getSelection().toString(),'hello'); assert.ok(output.textContent.includes('hello'));
    w.getSelection().removeAllRanges(); w.fixture.paintTerminal(); assert.ok(output.textContent.includes('new result')); assert.ok(!output.textContent.includes('hello'));
    const anchor=w.getSelection().anchorNode, offset=w.getSelection().anchorOffset; w.fixture.paintTerminal(); assert.equal(w.getSelection().anchorNode,anchor); assert.equal(w.getSelection().anchorOffset,offset);
  } finally { w.close(); }
});

test('expired authentication closes automatic stream retries and disables terminal input', async () => {
  const dom=terminal(),w=dom.window;
  try {
    w.fetch=async()=>({ok:true,status:200,json:async()=>({authenticated:false})});
    await w.fixtureStream.onerror();
    assert.equal(w.fixtureStream.closed,true,'An expired session must stop retrying the protected stream');
    assert.equal(w.document.querySelector('.terminal').getAttribute('contenteditable'),'false');
  } finally { w.close(); }
});

test('Ctrl-C is immediate by default; confirmation is opt-in and cancel clears modifiers',async()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{
  const ctrl=d.querySelector('[data-key="Ctrl"]');ctrl.click();d.querySelector('.terminal').dispatchEvent(new w.InputEvent('beforeinput',{data:'c',inputType:'insertText',bubbles:true,cancelable:true}));await new Promise(r=>w.setTimeout(r,0));
  assert.equal(w.actions.length,1);assert.equal(w.actions[0].key,'Ctrl-C');assert.equal(d.querySelector('#dialog').open,false);assert.equal(ctrl.getAttribute('aria-pressed'),'false');
  d.querySelector('#appActions').click();d.querySelector('#menuSettings').click();const confirm=d.querySelector('#confirmInterrupt');confirm.checked=true;confirm.dispatchEvent(new w.Event('change'));d.querySelector('#dialogClose').click();
  ctrl.click();d.querySelector('.terminal').dispatchEvent(new w.InputEvent('beforeinput',{data:'c',inputType:'insertText',bubbles:true,cancelable:true}));assert.equal(d.querySelector('#dialog').open,true);d.querySelector('#cancel').click();await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,1);assert.equal(ctrl.getAttribute('aria-pressed'),'false');
 }finally{w.close()}
});
test('Floating Paste replaces a highlight and tracks successfully sent shortcuts',async()=>{
 const dom=terminal(),w=dom.window,d=w.document;let pasted;
 try{
  Object.defineProperty(w.navigator,'clipboard',{value:{async readText(){pasted='clipboard text';return pasted}}});
  const output=d.querySelector('.terminal'),text=output.querySelector('span').firstChild,range=d.createRange();range.setStart(text,0);range.setEnd(text,5);w.getSelection().addRange(range);
  const copy=d.querySelector('[data-function="2"]');let prevented=false;copy.onpointerdown({preventDefault(){prevented=true}});copy.click();await new Promise(r=>w.setTimeout(r,0));
  assert.ok(prevented);assert.equal(w.actions[0].action,'paste');assert.equal(w.actions[0].text,pasted);assert.equal(w.getSelection().toString(),'');
  w.getSelection().removeAllRanges();d.querySelector('[data-key="Tab"]').click();await new Promise(r=>w.setTimeout(r,0));
  assert.equal(d.querySelector('[data-function="1"]').textContent,'Tab');d.querySelector('[data-function="1"]').click();await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.filter(a=>a.action==='key').map(a=>a.key),['Tab','Tab']);
 }finally{w.close()}
});
test('hold repositions with Safari visual-origin bounds and preserves the pinch grab point',async()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{
  const view=w.visualViewport;Object.assign(view,{width:195,height:422,scale:2,offsetLeft:90,offsetTop:160});w.fixture.syncViewport();
  const handle=d.querySelector('#floatingHandle'),control=d.querySelector('#floatingFunctions');handle.setPointerCapture=()=>{};
  handle.getBoundingClientRect=()=>({left:parseFloat(control.style.left)/view.scale,top:parseFloat(control.style.top)/view.scale,width:22,height:22});
  const event=(x,y)=>({button:0,isPrimary:true,pointerId:1,clientX:x,clientY:y,preventDefault(){}});
  const oldLeft=parseFloat(control.style.left),oldTop=parseFloat(control.style.top),box=handle.getBoundingClientRect(),x=box.left+8,y=box.top+14;
  handle.onpointerdown(event(x,y));await new Promise(r=>w.setTimeout(r,375));
  assert.equal(handle.getAttribute('aria-expanded'),'false','Holding must enter move mode, not open functions');
  handle.onpointermove(event(x-40,y-30));handle.onpointerup(event(x-40,y-30));
  assert.ok(Math.abs(parseFloat(control.style.left)-(oldLeft-80))<.01,'Drag must retain horizontal grab offset despite Safari viewport origin');
  assert.ok(Math.abs(parseFloat(control.style.top)-(oldTop-60))<.01,'Drag must retain vertical grab offset despite Safari viewport origin');
  assert.equal(handle.getAttribute('aria-expanded'),'false');
 }finally{w.close()}
});
test('ordinary floating drag previews the release action, returning to center cancels',async()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{
  d.querySelector('#floatingHandle').click();d.querySelector('[data-function="0"]').onfocus();assert.equal(d.querySelector('#floatingHint'),null,'Highlight alone identifies the release target');assert.equal(d.querySelector('[data-function="0"]').getAttribute('aria-pressed'),'true');d.querySelector('#floatingHandle').click();
  d.querySelector('#appActions').click();d.querySelector('#menuSettings').click();const setting=d.querySelector('[data-function-setting="0"]');setting.value='key:Tab';setting.dispatchEvent(new w.Event('change'));d.querySelector('#dialogClose').click();
  const handle=d.querySelector('#floatingHandle'),control=d.querySelector('#floatingFunctions');handle.setPointerCapture=()=>{};
  const event=(x,y)=>({button:0,isPrimary:true,pointerId:1,clientX:x,clientY:y,preventDefault(){}}),cx=parseFloat(control.style.left)+22,cy=parseFloat(control.style.top)+22,position=[control.style.left,control.style.top];
  handle.onpointerdown(event(cx,cy));handle.onpointermove(event(cx-30,cy));
  assert.equal(handle.getAttribute('aria-expanded'),'true','Ordinary movement opens functions instead of moving the handle');
  const branch=d.querySelector('[data-function="0"]'),bx=cx+parseFloat(branch.style.left),by=cy+parseFloat(branch.style.top);
  handle.onpointermove(event(bx,by));assert.equal(branch.getAttribute('aria-pressed'),'true');assert.ok(branch.classList.contains('armed'));
  handle.onpointermove(event(cx,cy));assert.equal(branch.getAttribute('aria-pressed'),'false');handle.onpointerup(event(cx,cy));await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,0);
  handle.onpointerdown(event(cx,cy));handle.onpointermove(event(bx,by));handle.onpointerup(event(bx,by));await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).key,'Tab');assert.equal(handle.getAttribute('aria-expanded'),'false');assert.deepEqual([control.style.left,control.style.top],position);
  for(const [x,y] of [[24,24],[366,24],[24,820],[366,820]]){
   const startX=parseFloat(control.style.left)+22,startY=parseFloat(control.style.top)+22;handle.onpointerdown(event(startX,startY));await new Promise(r=>w.setTimeout(r,375));handle.onpointermove(event(x,y));handle.onpointerup(event(x,y));
   const centerX=parseFloat(control.style.left)+22,centerY=parseFloat(control.style.top)+22;
   for(const b of control.querySelectorAll('[data-function]')){const bx=centerX+parseFloat(b.style.left),by=centerY+parseFloat(b.style.top);assert.ok(bx>=48&&bx<=390-48&&by>=22&&by<=844-22,'Entire pill action remains inside viewport at every corner');}
  }
  Object.assign(w.visualViewport,{width:390,height:300,scale:1});w.fixture.syncViewport();
  handle.onpointerdown(event(parseFloat(control.style.left)+22,parseFloat(control.style.top)+22));await new Promise(r=>w.setTimeout(r,375));handle.onpointermove(event(195,153));handle.onpointerup(event(195,153));
  for(const b of control.querySelectorAll('[data-function]')){const x=parseFloat(control.style.left)+22+parseFloat(b.style.left),y=parseFloat(control.style.top)+22+parseFloat(b.style.top);assert.ok(x>=48&&x<=390-48&&y>=22&&y<=300-22,'Entire action stays visible in the reduced keyboard viewport');}
 }finally{w.close()}
});

test('typing scale does not reduce the native editable zoom',()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=d.querySelector('.terminalwrap');
 try{
  Object.defineProperty(wrap,'clientWidth',{value:390});wrap.style.padding='0';output.style.width='960px';
  output.focus();
  const style=w.getComputedStyle(output);
  assert.ok(Number(style.zoom||1)>=1,'Typing scale must not reduce the editable native zoom');
 }finally{w.close()}
});

test('inward pinch after viewport widening never enlarges content and can reveal the full terminal height',()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=output.closest('.terminalwrap');
 try{
  let width=390,height=600;Object.defineProperties(wrap,{clientWidth:{get:()=>width},clientHeight:{get:()=>height}});Object.defineProperty(output,'scrollHeight',{value:868});wrap.style.padding='0';output.style.width='960px';
  const computed=w.getComputedStyle.bind(w);w.getComputedStyle=e=>e===output?{width:'960px'}:computed(e);output.focus();
  const pinch=(start,end)=>{const points=distance=>[100,100+distance].map((clientX,i)=>({identifier:i+1,clientX,clientY:100,target:wrap}));for(const [type,distance]of[['touchstart',start],['touchmove',end],['touchend',0]])wrap.dispatchEvent(new w.TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:points(distance),changedTouches:points(distance)}))};
  pinch(200,20);const before=Number.parseFloat(output.parentElement.style.width);width=926;height=71;
  pinch(400,40);const after=Number.parseFloat(output.parentElement.style.width);
  assert.ok(after<before,'Inward pinch must shrink after viewport widening instead of snapping up to the new width floor');
  assert.ok(after/960*868<=height+.01,'Pinch can reveal all terminal rows in a short view');
  assert.equal(w.visualViewport.scale,1);
 }finally{w.close()}
});

test('terminal pinch is local and Zoom Toggle switches full grid and readable typing size',()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=d.querySelector('.terminalwrap');
 try{
  w.HTMLElement.prototype.setPointerCapture=()=>{};
  Object.defineProperty(wrap,'clientWidth',{value:390});wrap.style.padding='0';output.style.width='960px';
  const computed=w.getComputedStyle.bind(w);w.getComputedStyle=e=>e===output?{width:'960px'}:computed(e);
  output.focus();
  let lastTouches=[];const touch=(type,points)=>{const contacts=points.map(([clientX,clientY],i)=>({identifier:i+1,clientX,clientY,target:wrap})),e=new w.TouchEvent(type,{bubbles:true,cancelable:true,touches:contacts,changedTouches:type==='touchend'?lastTouches:contacts});lastTouches=contacts;wrap.dispatchEvent(e)};
  touch('touchstart',[[100,200],[300,200]]);touch('touchmove',[[0,200],[400,200]]);touch('touchend',[]);
  assert.equal(parseFloat(output.parentElement.style.width),1320,'Pinch must enlarge terminal content, rather than the browser page');
  d.querySelector('[data-function="0"]').click();assert.equal(parseFloat(output.parentElement.style.width),390);d.querySelector('[data-function="0"]').click();assert.equal(parseFloat(output.parentElement.style.width),720);assert.equal(w.visualViewport.scale,1);
  output.focus();Object.assign(w.visualViewport,{height:430});w.fixture.syncViewport();touch('touchstart',[[100,200],[300,200]]);touch('touchmove',[[0,200],[400,200]]);touch('touchend',[]);Object.assign(w.visualViewport,{height:844});w.fixture.syncViewport();assert.equal(parseFloat(output.parentElement.style.width),720,'Closing keyboard must restore readable size after manual pinch');
 }finally{w.close()}
});

test('native drawer overscroll keeps manual zoom through focus loss until the pull commits',()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=output.closest('.terminalwrap'),canvas=output.parentElement;
 try{d.querySelector('#dialog').show=function(){this.open=true;this.querySelector('button').focus()};Object.defineProperties(wrap,{clientWidth:{value:390},clientHeight:{value:600},scrollWidth:{get:()=>Math.max(390,parseFloat(canvas.style.width))}});wrap.style.padding='0';output.style.width='960px';output.focus();d.querySelector('[data-function="0"]').click();assert.equal(parseFloat(canvas.style.width),390);
 terminalPointer(w,wrap,'pointerdown',300,250);terminalPointer(w,wrap,'pointermove',100,250);assert.equal(d.querySelector('#dialog').open,true);assert.notEqual(d.activeElement,output,'Drawer preview actually blurs the native input');assert.equal(parseFloat(canvas.style.width),390,'Focus loss cannot move the content boundary during its active overscroll');terminalPointer(w,wrap,'pointerup',100,250);assert.equal(d.querySelector('#dialog').open,true,'The same pull must still commit after focus changes');assert.equal(w.actions.length,0);
 }finally{w.close()}
});

test('drawer release keeps its direction when browser focus shifts the visual origin',()=>{
 const dom=terminal(),w=dom.window,d=w.document,wrap=d.querySelector('.terminalwrap');
 try{Object.defineProperties(wrap,{clientWidth:{value:420},scrollWidth:{value:420}});wrap.scrollLeft=0;
  terminalPointer(w,wrap,'pointerdown',310,300);terminalPointer(w,wrap,'pointermove',30,300);
  Object.assign(w.visualViewport,{offsetLeft:420});terminalPointer(w,wrap,'pointerup',450,300);
  assert.equal(d.querySelector('#dialog').open,true,'Stationary finger release commits the right drawer across an origin shift');assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),false);assert.equal(w.actions.length,0);
 }finally{w.close()}
});
test('drawer settlement retains manual zoom while native dialog focus is restored then transferred',()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=output.closest('.terminalwrap'),canvas=output.parentElement,dialog=d.querySelector('#dialog');
 try{dialog.show=function(){this.open=true;this.querySelector('button').focus()};dialog.close=function(){this.open=false;output.focus();this.dispatchEvent(new w.Event('close'))};dialog.showModal=function(){this.open=true;this.querySelector('button').focus()};Object.defineProperties(wrap,{clientWidth:{value:390},clientHeight:{value:600},scrollWidth:{get:()=>Math.max(390,parseFloat(canvas.style.width))}});wrap.style.padding='0';output.style.width='960px';output.focus();d.querySelector('[data-function="0"]').click();
  terminalPointer(w,wrap,'pointerdown',300,250);terminalPointer(w,wrap,'pointermove',20,250);terminalPointer(w,wrap,'pointerup',20,250);
  assert.equal(dialog.open,true);assert.equal(parseFloat(canvas.style.width),390,'Dialog focus handoff cannot reset the user pinch');assert.equal(w.actions.length,0);
 }finally{w.close()}
});

test('a finger on a floating control cannot join the terminal pinch and a terminal finger pans independently',()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=d.querySelector('.terminalwrap');
 try{Object.defineProperty(wrap,'clientWidth',{value:390});wrap.style.padding='0';output.style.width='960px';const computed=w.getComputedStyle.bind(w);w.getComputedStyle=e=>e===output?{width:'960px'}:computed(e);output.focus();const width=output.parentElement.style.width;wrap.scrollLeft=100;wrap.scrollTop=100;
 const held={identifier:1,target:d.querySelector('#cursorJoystick'),clientX:60,clientY:888};
 let moving;const touch=(type,x,y)=>{moving={identifier:2,target:output,clientX:x,clientY:y};wrap.dispatchEvent(new w.TouchEvent(type,{bubbles:true,cancelable:true,touches:[held,moving],changedTouches:[moving]}))};
 touch('touchstart',250,400);touch('touchmove',150,100);assert.equal(output.parentElement.style.width,width,'Separate control contact must not change terminal scale');assert.equal(wrap.scrollLeft,200);assert.equal(wrap.scrollTop,400);
 const end=new w.TouchEvent('touchend',{cancelable:true,touches:[held],changedTouches:[moving]});wrap.dispatchEvent(end);
 const controlOnly=new w.TouchEvent('touchmove',{cancelable:true,touches:[held],changedTouches:[held]});wrap.dispatchEvent(controlOnly);assert.equal(wrap.scrollLeft,200,'Released terminal finger has no remaining pan ownership');
 }finally{w.close()}
});

test('Zoom Toggle retains full grid through updates then returns to the saved typing size',()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=output.closest('.terminalwrap');
 try{
  Object.defineProperty(wrap,'clientWidth',{value:390});wrap.style.padding='0';output.style.width='960px';output.focus();wrap.scrollLeft=220;
  const computed=w.getComputedStyle.bind(w);w.getComputedStyle=e=>e===output?{width:'960px'}:computed(e);
  d.querySelector('[data-function="0"]').click();
  assert.equal(parseFloat(output.parentElement.style.width),390,'First toggle fits the full terminal');assert.equal(wrap.scrollLeft,0);
  Object.assign(w.visualViewport,{height:430});w.fixture.syncViewport();const fresh='fresh output';w.fixture.model.apply({format:'cmux.render-grid.v1',render_epoch:'owned-epoch',render_revision:2,delta_base_render_revision:w.fixture.model.revision,full:false,rows:w.fixture.model.rows,columns:w.fixture.model.columns,row_spans:[{row:2,column:0,text:fresh,cell_width:fresh.length}],cursor:{row:2,column:fresh.length,visible:true,style:'block'}});w.fixture.paintTerminal();assert.ok(output.textContent.includes(fresh),'A changed authoritative frame must actually paint');assert.equal(parseFloat(output.parentElement.style.width),390,'Keyboard and fresh output updates retain the chosen full grid');d.querySelector('[data-function="0"]').click();assert.equal(parseFloat(output.parentElement.style.width),720);
  wrap.onclick({detail:1});assert.equal(parseFloat(output.parentElement.style.width),720,'A new deliberate terminal tap resumes saved typing size');
 }finally{w.close()}
});


 test('old toolbar ordering removes default navigation groups without losing custom shortcuts or other order',()=>{
 const dom=terminal({shortcuts:[{id:'s',name:'Home custom',key:'Home'}],snippets:[],groupOrder:[['1','2','3','Enter'],['Home','End','PgUp','PgDn'],['←','↓','↑','→'],['Esc','Tab','Ctrl','Alt']]});
 try{const d=dom.window.document,rail=d.querySelector('.keygroups');assert.equal(rail.querySelector('[data-key="Home"]'),null);assert.equal(rail.querySelector('[data-key="←"]'),null);assert.equal(rail.querySelector('[data-key="1"]'),null);assert.ok(rail.querySelector('[data-key="Esc"]'));assert.equal(rail.querySelector('[data-shortcut="s"]').textContent,'Home custom')}finally{dom.window.close()}
 });
 test('joystick sends and repeats before release, stops at center, preserves modifiers throughout and holds to move',async()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{
 w.HTMLElement.prototype.setPointerCapture=()=>{};
 const handle=d.querySelector('#cursorJoystick'),event=(x,y)=>({pointerId:1,button:0,isPrimary:true,clientX:x,clientY:y,preventDefault(){}});
 assert.ok(handle,'A distinct cursor joystick is required');
 const center=()=>[parseFloat(handle.style.left)+22,parseFloat(handle.style.top)+22];let [x,y]=center();
 d.querySelector('[data-key="Ctrl"]').click();handle.onpointerdown(event(x,y));handle.onpointermove(event(x+25,y));await new Promise(r=>w.setTimeout(r,720));
 assert.ok(w.actions.length>=2,'A held deflection must repeat without release');assert.ok(w.actions.every(a=>a.key==='Ctrl-Right'));
 handle.onpointermove(event(x+80,y));await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).key,'Ctrl-Right','Changing speed preserves character mode');
 handle.onpointermove(event(x,y-80));await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).key,'Ctrl-Up','Far vertical drag stays an arrow');
 handle.onpointermove(event(x,y));const stopped=w.actions.length;await new Promise(r=>w.setTimeout(r,190));assert.equal(w.actions.length,stopped,'Center stops repeating');handle.onpointerup(event(x,y));assert.equal(d.querySelector('[data-key="Ctrl"]').getAttribute('aria-pressed'),'false');
 [x,y]=center();handle.onpointerdown(event(x,y));await new Promise(r=>w.setTimeout(r,375));handle.onpointermove(event(x+100,y-100));handle.onpointerup(event(x+100,y-100));assert.ok(parseFloat(handle.style.left)+22>x+90);assert.equal(w.actions.length,stopped,'Hold-to-move delivers no keys');
 handle.onpointerdown(event(x+100,y-100));handle.onpointermove(event(x+75,y-100));await new Promise(r=>w.setTimeout(r,0));handle.onpointercancel();const canceled=w.actions.length;await new Promise(r=>w.setTimeout(r,190));assert.equal(w.actions.length,canceled,'Cancellation ends repetition');
 }finally{w.close()}
 });

test('terminal whitespace tap activates native input after the page has settled',async()=>{
 const dom=terminal(),w=dom.window,d=w.document,wrap=d.querySelector('.terminalwrap');
 try{w.HTMLElement.prototype.setPointerCapture=()=>{};await new Promise(r=>w.setTimeout(r,350));const down=new w.Event('pointerdown',{bubbles:true,cancelable:true});Object.assign(down,{pointerId:1,button:0,isPrimary:true,clientX:100,clientY:300});wrap.dispatchEvent(down);const up=new w.Event('pointerup',{bubbles:true,cancelable:true});Object.assign(up,{pointerId:1,button:0,isPrimary:true,clientX:100,clientY:300});wrap.dispatchEvent(up);wrap.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));assert.equal(d.activeElement,d.querySelector('.terminal'))}finally{w.close()}
});

test('streaming cursor follow preserves the user horizontal position while revealing the input row vertically',()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=d.querySelector('.terminalwrap');
 try{output.focus();wrap.scrollLeft=88;wrap.scrollTop=0;wrap.getBoundingClientRect=()=>({left:0,right:390,top:46,bottom:400});output.querySelector('.remote-cursor').getBoundingClientRect=()=>({left:800,right:810,top:410,bottom:430});w.fixture.paintTerminal();assert.equal(wrap.scrollLeft,88,'Typing must not pan to the right end of input');assert.ok(wrap.scrollTop>0,'Input row must remain above the keyboard')}finally{w.close()}
});

test('hardware arrows and the joystick share modifier intent without duplicating rail modifiers',async()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal');
 try{d.querySelector('[data-key="Ctrl"]').click();output.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',ctrlKey:true,shiftKey:true,bubbles:true,cancelable:true}));await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).key,'Ctrl-Shift-Right');assert.equal(d.querySelector('[data-key="Ctrl"]').getAttribute('aria-pressed'),'false')}finally{w.close()}
});

test('a native tap opens terminal input even when Safari omits the compatibility click',()=>{
 const dom=terminal(),w=dom.window,d=w.document,wrap=d.querySelector('.terminalwrap');
 try{w.HTMLElement.prototype.setPointerCapture=()=>{};for(const type of ['pointerdown','pointerup']){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,button:0,isPrimary:true,clientX:100,clientY:300});wrap.dispatchEvent(e)}assert.equal(d.activeElement,d.querySelector('.terminal'))}finally{w.close()}
});

test('selecting a terminal tab engages typing by default',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{assert.notEqual(d.activeElement,d.querySelector('.terminal'));d.querySelector('[data-surface]').click();assert.equal(d.activeElement,d.querySelector('.terminal'));assert.equal(d.querySelector('#viewportDock').classList.contains('typing'),true)}finally{w.close()}
});

test('an offscreen remote cursor does not put the native editing caret outside the visible viewport',()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=d.querySelector('.terminalwrap'),cursor=output.querySelector('.remote-cursor');
 try{wrap.getBoundingClientRect=()=>({left:0,right:390,top:46,bottom:400,width:390});output.getBoundingClientRect=()=>({left:13,width:720});cursor.getBoundingClientRect=()=>({left:800,right:810,top:200,bottom:220});Object.defineProperty(output,'offsetWidth',{value:960});w.fixture.caretToEnd(output);const caret=w.getSelection().anchorNode;assert.notEqual(caret,output.remoteCaret.node,'Native editing must not expose the offscreen remote caret to WebKit');assert.equal(w.getSelection().isCollapsed,true);assert.equal(cursor.getBoundingClientRect().left,800,'Authoritative terminal cursor remains unchanged');assert.equal(output.textContent.includes('hello 日本語'),true);assert.equal(output.querySelector('.input-anchor').textContent,'','Copy must not include a sentinel character')}finally{w.close()}
});

test('drag-out-and-back, a secondary contact and a pinch release never engage typing',()=>{
 for(const kind of ['excursion','secondary','pinch']){const dom=terminal(),w=dom.window,d=w.document,wrap=d.querySelector('.terminalwrap');try{w.HTMLElement.prototype.setPointerCapture=()=>{};const pointer=(type,x=100,primary=true)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,button:0,isPrimary:primary,clientX:x,clientY:300});wrap.dispatchEvent(e)};pointer('pointerdown');if(kind==='excursion'){pointer('pointermove',250);pointer('pointermove',101)}if(kind==='pinch')d.querySelector('#content').dataset.swiped='true';pointer('pointerup',101,kind!=='secondary');wrap.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));assert.notEqual(d.activeElement,d.querySelector('.terminal'),kind+' must preserve reading mode')}finally{w.close()}}
});

function keyboardPointer(w,button,type,id=1){let hit=button.closest('[data-typing-key]')||button;if(type==='pointermove'&&w.document.elementFromPoint)hit=w.document.elementFromPoint(0,0);const r=hit.getBoundingClientRect();let x=hit===w.document.body?-100:r.left+r.width/2,y=hit===w.document.body?-100:r.top+r.height/2;w.keyboardPoints??=new Map();if(type==='pointerup'&&w.keyboardPoints.has(id))[x,y]=w.keyboardPoints.get(id);if(type==='pointerdown'||type==='pointermove')w.keyboardPoints.set(id,[x,y]);else w.keyboardPoints.delete(id);const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:id,button:0,isPrimary:id===1,clientX:x,clientY:y});button.dispatchEvent(e)}
function keyboardTap(w,value,id=1){const b=w.document.querySelector(`[data-typing-key="${value}"]`);assert.ok(b,`Keyboard key ${value} exists`);keyboardPointer(w,b,'pointerdown',id);keyboardPointer(w,b,'pointerup',id);b.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));}
test('custom keyboard owns typing while terminal retains native selection; dismissal and one tap reopen it',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.HTMLElement.prototype.setPointerCapture=()=>{};w.fixture.focusInput();
  assert.equal(d.querySelector('.terminal').getAttribute('contenteditable'),'plaintext-only');assert.equal(d.querySelector('.terminal').getAttribute('inputmode'),'none');assert.equal(d.querySelector('#softwareKeyboard').hidden,false);assert.equal(w.getSelection().toString(),'');
  keyboardTap(w,'a');keyboardTap(w,'Shift');keyboardTap(w,'b');keyboardTap(w,'123');keyboardTap(w,'/');keyboardTap(w,'ABC');keyboardTap(w,'Space');keyboardTap(w,'Enter');
  await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.text??a.key),['a','B','/',' ','Enter']);
  keyboardTap(w,'Dismiss');assert.equal(d.querySelector('#softwareKeyboard').hidden,true);
  const wrap=d.querySelector('.terminalwrap');keyboardPointer(w,wrap,'pointerdown');keyboardPointer(w,wrap,'pointerup');assert.equal(d.querySelector('#softwareKeyboard').hidden,false);
 }finally{w.close()}
});
test('custom keyboard supports two thumbs, fast deletion then typing, modifiers and paste exactly once',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.HTMLElement.prototype.setPointerCapture=()=>{};w.fixture.focusInput();
  const a=d.querySelector('[data-typing-key="a"]'),b=d.querySelector('[data-typing-key="b"]');assert.ok(a&&b);
  keyboardPointer(w,a,'pointerdown',1);keyboardPointer(w,b,'pointerdown',2);keyboardPointer(w,a,'pointerup',1);keyboardPointer(w,b,'pointerup',2);
  for(let n=0;n<50;n++)keyboardTap(w,'x');for(let n=0;n<8;n++)keyboardTap(w,'Backspace');keyboardTap(w,'z');
  d.querySelector('[data-key="Ctrl"]').click();keyboardTap(w,'c');keyboardTap(w,'d');
  Object.defineProperty(w.navigator,'clipboard',{value:{readText:async()=>"日本語\nquoted ' text"}});d.querySelector('[data-function="2"]').click();await new Promise(r=>w.setTimeout(r,0));
  assert.deepEqual(w.actions.slice(0,2).map(a=>a.text),['a','b']);assert.equal(w.actions.filter(a=>a.text==='x').length,50);assert.equal(w.actions.filter(a=>a.key==='Backspace').length,8);
  assert.deepEqual(w.actions.slice(-4).map(a=>a.text??a.key),['z','Ctrl-C','d',"日本語\nquoted ' text"]);assert.equal(w.actions.at(-1).action,'paste');assert.equal(d.querySelector('[data-key="Ctrl"]').getAttribute('aria-pressed'),'false');
 }finally{w.close()}
});
test('held custom Backspace repeats on its captured target and cancellation stops it',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.HTMLElement.prototype.setPointerCapture=()=>{};w.fixture.focusInput();const b=d.querySelector('[data-typing-key="Backspace"]');assert.ok(b);
  keyboardPointer(w,b,'pointerdown');await new Promise(r=>w.setTimeout(r,560));assert.ok(w.actions.length>=3,'Deletion continues before release');assert.ok(w.actions.every(a=>a.key==='Backspace'&&a.surface_id==='owned-surface'));
  keyboardPointer(w,b,'pointercancel');const count=w.actions.length;await new Promise(r=>w.setTimeout(r,150));assert.equal(w.actions.length,count,'Cancel ends repeat');
  keyboardPointer(w,b,'pointerdown');w.dispatchEvent(new w.Event('blur'));await new Promise(r=>w.setTimeout(r,480));assert.equal(w.actions.length,count+1,'Backgrounding ends hold');
 }finally{w.close()}
});
test('terminal horizontal gestures scroll without keys; sidebar button opens navigation and rail up expands keys',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.HTMLElement.prototype.setPointerCapture=()=>{};w.fixture.focusInput();
  const gesture=(target,from,to)=>{for(const [type,point] of [['pointerdown',from],['pointermove',to],['pointerup',to]]){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,button:0,isPrimary:true,clientX:point[0],clientY:point[1]});target.dispatchEvent(e)}};
  const wrap=d.querySelector('.terminalwrap');Object.defineProperty(wrap,'clientWidth',{value:390});Object.defineProperty(wrap,'scrollWidth',{value:900});gesture(wrap,[300,120],[80,120]);assert.equal(wrap.scrollLeft,220);await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,0);assert.equal(d.querySelector('#dialog').open,false);
  for(const [from,to] of [[[80,22],[300,22]],[[300,22],[80,22]]]){gesture(d.querySelector('.workspacehead'),from,to);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),false)}d.querySelector('#sidebarToggle').click();assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),true);d.querySelector('#scrim').click();
  gesture(d.querySelector('.inputdock'),[180,700],[180,600]);assert.equal(d.querySelector('#dialog').open,true);assert.equal(d.querySelector('#dialogTitle').textContent,'Shortcuts');assert.equal(d.querySelector('#dialog').parentElement.id,'viewportDock');assert.equal(w.actions.length,0);
 }finally{w.close()}
});
test('custom keyboard reopens with one terminal tap after pinch without stale gesture suppression',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.HTMLElement.prototype.setPointerCapture=()=>{};w.fixture.focusInput();keyboardTap(w,'Dismiss');const wrap=d.querySelector('.terminalwrap');Object.defineProperty(wrap,'clientWidth',{value:390});
  const points=[{identifier:1,clientX:80,clientY:120,target:wrap},{identifier:2,clientX:200,clientY:120,target:wrap}],pinch=new w.TouchEvent('touchstart',{cancelable:true,touches:points,changedTouches:points});wrap.dispatchEvent(pinch);const end=new w.TouchEvent('touchend',{cancelable:true,touches:[],changedTouches:points});wrap.dispatchEvent(end);
  keyboardPointer(w,wrap,'pointerdown');keyboardPointer(w,wrap,'pointerup');assert.equal(d.querySelector('#softwareKeyboard').hidden,false);
 }finally{w.close()}
});
test('floating Paste captures its terminal before clipboard permission resolves',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.HTMLElement.prototype.setPointerCapture=()=>{};w.fixture.focusInput();let resolveClipboard;Object.defineProperty(w.navigator,'clipboard',{value:{readText:()=>new Promise(resolve=>resolveClipboard=resolve)}});
  d.querySelector('[data-function="2"]').click();w.fixture.otherTerminal();w.fixture.paintTerminal();const range=d.createRange();range.selectNodeContents(d.querySelector('.terminal'));w.getSelection().removeAllRanges();w.getSelection().addRange(range);const highlight=w.getSelection().toString();assert.ok(highlight);resolveClipboard('private paste');await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,1);assert.equal(w.actions[0].surface_id,'owned-surface');assert.equal(w.actions[0].text,'private paste');assert.equal(w.getSelection().toString(),highlight);
 }finally{w.close()}
});
test('hardware Copy with selected custom terminal text never sends a literal character',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.focusInput();const output=d.querySelector('.terminal'),range=d.createRange();range.selectNodeContents(output.querySelector('span'));w.getSelection().removeAllRanges();w.getSelection().addRange(range);const selected=w.getSelection().toString();
  for(const key of ['c','x']){const e=new w.KeyboardEvent('keydown',{bubbles:true,cancelable:true,key,ctrlKey:true});output.dispatchEvent(e);assert.equal(e.defaultPrevented,false);}
  await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,0);assert.equal(w.getSelection().toString(),selected);
 }finally{w.close()}
});

test('tabs slide both ways without selecting; names truncate and hold exposes rename plus left/right movement',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.HTMLElement.prototype.setPointerCapture=()=>{};w.fixture.otherTerminal();w.fixture.metadata('abcdefghijklmnopqrstuvwxyzABCD');
  const tabs=d.querySelectorAll('.surfacetab'),rail=d.querySelector('.panetabs');assert.equal(tabs[0].textContent,'abcdefghijklmnopqrstuvwx…');assert.equal(tabs[0].title,'abcdefghijklmnopqrstuvwxyzABCD');
  const drag=(from,to)=>{for(const [type,x] of [['pointerdown',from],['pointermove',to],['pointerup',to]]){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,button:0,isPrimary:true,clientX:x,clientY:22});tabs[0].dispatchEvent(e)}};
  drag(250,100);assert.equal(rail.scrollLeft,150);drag(100,200);assert.equal(rail.scrollLeft,50);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),false);assert.equal(d.querySelector('.surfacetab.active').dataset.surface,'owned-surface-two');
  const event=new w.Event('pointerdown',{bubbles:true,cancelable:true});Object.assign(event,{pointerId:1,button:0,isPrimary:true,clientX:100,clientY:22});tabs[0].dispatchEvent(event);await new Promise(r=>w.setTimeout(r,570));const release=new w.Event('pointerup',{bubbles:true,cancelable:true});Object.assign(release,{pointerId:1,button:0,isPrimary:true,clientX:100,clientY:22});tabs[0].dispatchEvent(release);await new Promise(r=>w.requestAnimationFrame(r));
  assert.equal(d.querySelector('#dialog').open,true);assert.ok(d.querySelector('#tabRename'));assert.equal(d.querySelector('#tabLeft').disabled,true);assert.equal(d.querySelector('#tabRight').disabled,false);let resolveTree;const previousFetch=w.fetch;w.fetch=async(path,options)=>path==='/api/tree'?{ok:true,json:()=>new Promise(resolve=>resolveTree=resolve)}:previousFetch(path,options);d.querySelector('#tabRight').click();await new Promise(r=>w.setTimeout(r,0));assert.deepEqual([...d.querySelectorAll('.surfacetab')].map(b=>b.dataset.surface),['owned-surface','owned-surface-two']);resolveTree({notifications:[],windows:[{id:'owned-window',groups:[],workspaces:[{id:'owned-workspace',title:'Owned workspace',panes:[{id:'owned-pane',selected_surface_id:'owned-surface',surfaces:[{id:'owned-surface-two',title:'Other terminal',type:'terminal'},{id:'owned-surface',title:'Owned terminal',type:'terminal'}]}]}]}]});await new Promise(r=>w.setTimeout(r,0));
  assert.deepEqual([...d.querySelectorAll('.surfacetab')].map(b=>b.dataset.surface),['owned-surface-two','owned-surface']);assert.equal(d.querySelector('.surfacetab.active').dataset.surface,'owned-surface');
 }finally{w.close()}
});

test('sidebar search finds tab names and cached screen output and opens the matching terminal',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.otherTerminal();const search=d.querySelector('#search');search.value='Owned terminal';search.dispatchEvent(new w.Event('input'));
  let result=d.querySelector('[data-search-surface="owned-surface"]');assert.ok(result);assert.equal(d.querySelectorAll('[data-search-surface]').length,1);result.click();assert.equal(d.querySelector('.surfacetab.active').dataset.surface,'owned-surface');
  search.value='日本語';search.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('[data-search-surface]').length,2);
  search.value='unfindable';search.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('.workspacerow').length,0);assert.equal(w.actions.length,0);
 }finally{w.close()}
});

test('custom keyboard has language switching, floating Paste and Zoom Toggle, Ctrl-W default and no inertial collapse at panel top',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.focusInput();assert.ok(d.querySelector('[data-typing-key="Language"]'));assert.equal(d.querySelector('[data-typing-key="Paste"]'),null);assert.ok(d.querySelector('.inputdock [data-key="Ctrl-W"]'));assert.equal(d.querySelector('.inputdock [data-key="Ctrl-D"]'),null);
  assert.equal(d.querySelector('[data-function="0"]').getAttribute('aria-label'),'Zoom toggle');assert.equal(d.querySelector('[data-function="2"]').getAttribute('aria-label'),'Paste');
  d.querySelector('#appActions').click();d.querySelector('#menuKeyboard').click();const body=d.querySelector('#dialogBody');body.scrollTop=80;body.dispatchEvent(new w.Event('scroll'));assert.equal(d.querySelector('#dialog').open,true);body.scrollTop=0;body.dispatchEvent(new w.Event('scroll'));assert.equal(d.querySelector('#dialog').open,true,'Reaching top requires a further deliberate downward pull to stow');
 }finally{w.close()}
});

test('language choice stays beside a visible keyboard without moving terminal space or focus, and supports native light dismiss',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;try{w.fixture.focusInput();const keyboard=d.querySelector('#softwareKeyboard'),focused=d.activeElement,height=d.documentElement.style.getPropertyValue('--dock-height');keyboardTap(w,'Language');const popover=d.querySelector('#languagePopover');assert.ok(popover);assert.equal(popover.dataset.testPopover,'open');assert.equal(d.querySelector('#dialog').open,false);assert.equal(keyboard.hidden,false);assert.equal(d.documentElement.style.getPropertyValue('--dock-height'),height);assert.equal(d.activeElement,focused);assert.equal(popover.querySelectorAll('button').length,4);const output=d.querySelector('.terminal');keyboardPointer(w,output,'pointerdown');keyboardPointer(w,output,'pointerup');assert.equal(popover.dataset.testPopover,'closed');keyboardTap(w,'Language');d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(popover.dataset.testPopover,'closed');await new Promise(resolve=>w.setTimeout(resolve,0));assert.equal(w.actions.length,0,'Closing the language chooser must not send Escape to the terminal');keyboardTap(w,'Language');d.querySelector('#languageHiragana').click();assert.equal(popover.dataset.testPopover,'closed');assert.equal(keyboard.hidden,false);keyboardTap(w,'Language');assert.equal(d.querySelector('#languageHiragana').getAttribute('aria-pressed'),'true')}finally{w.close()}
});

test('late custom keyboard size change updates reserved terminal space',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  const keyboard=d.querySelector('#softwareKeyboard');let height=251;Object.defineProperty(keyboard,'offsetHeight',{get:()=>height});w.fixture.focusInput();
  const before=parseFloat(d.documentElement.style.getPropertyValue('--dock-height'));height=319;
  for(const observer of w.resizeObservers)if(observer.targets.has(keyboard))observer.callback([{target:keyboard}]);
  const after=parseFloat(d.documentElement.style.getPropertyValue('--dock-height'));assert.equal(after-before,68,'Late Home Screen safe-area layout must reserve its actual height');
 }finally{w.close()}
});

test('custom Japanese romaji edits locally, commits once without submitting, and keeps shortcuts literal',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.focusInput();keyboardTap(w,'Language');d.querySelector('#languageHiragana').click();
  for(const key of 'konnichiha')keyboardTap(w,key);assert.equal(d.querySelector('#kanaPreedit').textContent,'こんにちは');assert.equal(w.actions.length,0);
  keyboardTap(w,'Backspace');assert.equal(d.querySelector('#kanaPreedit').textContent,'こんにちh');keyboardTap(w,'a');
  keyboardTap(w,'Space');await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>[a.action,a.text]),[['input','こんにちは']]);assert.equal(d.querySelector('#kanaPreedit').hidden,true);
  keyboardTap(w,'Enter');await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).key,'Enter');
  for(const key of 'shinbun')keyboardTap(w,key);keyboardTap(w,'Enter');await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).text,'しんぶん');assert.equal(w.actions.filter(a=>a.key==='Enter').length,1);
  keyboardTap(w,'k');d.querySelector('.inputdock [data-key="Esc"]').click();assert.equal(d.querySelector('#kanaPreedit').hidden,true);keyboardTap(w,'n');
  d.querySelector('.inputdock [data-key="Ctrl"]').click();keyboardTap(w,'c');await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).key,'Ctrl-C');
 }finally{w.close()}
});
test('Japanese preedit never leaks across tab, language or disconnected-session boundaries',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.focusInput();keyboardTap(w,'Language');d.querySelector('#languageKatakana').click();for(const key of 'neko')keyboardTap(w,key);assert.equal(d.querySelector('#kanaPreedit').textContent,'ネコ');
  w.fixture.otherTerminal();assert.equal(d.querySelector('#kanaPreedit').hidden,true);keyboardTap(w,'Enter');await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,1);assert.equal(w.actions[0].key,'Enter');assert.equal(w.actions[0].surface_id,'owned-surface-two');
  keyboardTap(w,'a');keyboardTap(w,'Language');d.querySelector('#languageEnglish').click();assert.equal(d.querySelector('#kanaPreedit').hidden,true);keyboardTap(w,'a');await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).text,'a');
  keyboardTap(w,'Language');d.querySelector('#languageHiragana').click();keyboardTap(w,'n');w.fetch=async()=>({ok:true,status:200,json:async()=>({authenticated:false})});await w.fixtureStream.onerror();assert.equal(d.querySelector('#kanaPreedit').hidden,true);
 }finally{w.close()}
});

test('held Japanese deletion stays local past empty and navigation commits preedit before its key',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.focusInput();keyboardTap(w,'Language');d.querySelector('#languageHiragana').click();keyboardTap(w,'a');const backspace=d.querySelector('.typing-layout:not([hidden]) [data-typing-key="Backspace"]');keyboardPointer(w,backspace,'pointerdown');await new Promise(r=>w.setTimeout(r,500));keyboardPointer(w,backspace,'pointerup');assert.equal(w.actions.length,0);assert.equal(d.querySelector('#kanaPreedit').hidden,true);
  keyboardTap(w,'n');keyboardTap(w,'e');d.querySelector('.terminal').dispatchEvent(new w.KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:'ArrowLeft'}));await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.text||a.key),['ね','Left']);
 }finally{w.close()}
});

test('a retargeted compatibility click after keyboard dismissal cannot reuse an earlier terminal tap',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document,wrap=d.querySelector('.terminalwrap');
 try{
  w.HTMLElement.prototype.setPointerCapture=()=>{};w.fixture.focusInput();keyboardTap(w,'Dismiss');
  keyboardPointer(w,wrap,'pointerdown');keyboardPointer(w,wrap,'pointerup');
  wrap.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));
  assert.equal(d.querySelector('#softwareKeyboard').hidden,false);
  keyboardTap(w,'Dismiss');
  wrap.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));
  assert.equal(d.querySelector('#softwareKeyboard').hidden,true,'The dismiss touch must not be reinterpreted as a new terminal gesture');
 }finally{w.close()}
});

test('Shift and Caps Lock use distinct shared SVG symbols and deliver the displayed letter case',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;try{w.fixture.focusInput();const shift=d.querySelector('[data-typing-key="Shift"]'),shortcut=d.querySelector('[data-key="Shift"]'),symbol=button=>button.querySelector('svg use')?.getAttribute('href');assert.ok(symbol(shift),'Shift has a vector icon');assert.equal(symbol(shift),symbol(shortcut),'The keyboard and shortcuts share one Shift symbol');const normal=symbol(shift);assert.ok(d.querySelector(normal).querySelector('path'));assert.equal(shift.getAttribute('aria-label'),'Shift');keyboardTap(w,'Shift');assert.equal(shift.getAttribute('aria-pressed'),'true');assert.equal(symbol(shift),normal);keyboardTap(w,'Shift');assert.equal(shift.getAttribute('aria-label'),'Caps Lock');assert.equal(shift.getAttribute('aria-pressed'),'true');assert.notEqual(symbol(shift),normal);assert.ok(d.querySelector(symbol(shift)).querySelector('path'));keyboardTap(w,'a');keyboardTap(w,'b');assert.equal(shift.getAttribute('aria-label'),'Caps Lock');keyboardTap(w,'Shift');assert.equal(shift.getAttribute('aria-label'),'Shift');assert.equal(shift.getAttribute('aria-pressed'),'false');assert.equal(symbol(shift),normal);keyboardTap(w,'c');await new Promise(resolve=>w.setTimeout(resolve,0));assert.deepEqual(w.actions.map(action=>action.text),['A','B','c'])}finally{w.close()}
});

test('an open language chooser owns hardware keys even while the terminal retains focus',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;try{w.fixture.focusInput();const output=d.querySelector('.terminal');output.focus();keyboardTap(w,'Language');const popover=d.querySelector('#languagePopover');assert.equal(d.activeElement,output);for(const key of ['x','ArrowLeft','Escape'])output.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));await new Promise(resolve=>w.setTimeout(resolve,0));assert.equal(popover.dataset.testPopover,'closed');assert.deepEqual(w.actions,[],'Chooser dismissal and other hardware keys must never reach cmux');output.dispatchEvent(new w.KeyboardEvent('keydown',{key:'x',bubbles:true,cancelable:true}));await new Promise(resolve=>w.setTimeout(resolve,0));assert.equal(w.actions.length,1);assert.equal(w.actions[0].text,'x')}finally{w.close()}
});

test('word-mode joystick uses directional navigation and highlights only its direction',async()=>{
 const dom=terminal({joystickWordMode:true}),w=dom.window,d=w.document,handle=d.querySelector('#cursorJoystick');
 const point=(x,y)=>({pointerId:7,button:0,isPrimary:true,clientX:x,clientY:y,preventDefault(){}});
 try{
  handle.style.left='173px';handle.style.top='400px';const x=195,y=422;
  for(const [dx,direction] of [[-95,'Left'],[95,'Right']]){
   handle.onpointerdown(point(x,y));handle.onpointermove(point(x+dx,y));await new Promise(r=>w.setTimeout(r,0));
   assert.equal(w.actions.at(-1).key,'Alt-'+direction,'Word movement must remain a directional key, not a printable letter whose Alt encoding varies by Mac layout');
   const active=[...handle.querySelectorAll('.word-ticks.active')];assert.equal(active.length,1);assert.equal(active[0].dataset.wordDirection,direction);
   const inactive=handle.querySelector(`.word-ticks[data-word-direction="${direction==='Left'?'Right':'Left'}"]`);assert.equal(w.getComputedStyle(inactive).display,'none');
   handle.onpointerup(point(x+dx,y));assert.equal(handle.querySelectorAll('.word-ticks.active').length,0);
  }
  d.querySelector('[data-key="Ctrl"]').click();d.querySelector('[data-key="Alt"]').click();d.querySelector('[data-key="Shift"]').click();
  handle.onpointerdown(point(x,y));handle.onpointermove(point(x-95,y));await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).key,'Ctrl-Alt-Shift-Left');handle.onpointerup(point(x-95,y));
 }finally{w.close()}
});

test('word navigation preview lights only the deflected side and resets on cancel',async()=>{
 const dom=terminal({joystickWordMode:true}),w=dom.window,handle=w.document.querySelector('#cursorJoystick');
 const x=parseFloat(handle.style.left)+22,y=parseFloat(handle.style.top)+22,point=(dx)=>({pointerId:8,button:0,isPrimary:true,clientX:x+dx,clientY:y,preventDefault(){}});
 try{handle.onpointerdown(point(0));handle.onpointermove(point(-20));await new Promise(r=>w.setTimeout(r,0));const word=[...handle.querySelectorAll('.word-ticks.active')];assert.equal(word.length,1,'A word preview must identify one side');assert.equal(word[0].dataset.wordDirection,'Left');handle.onpointercancel();assert.equal(handle.querySelectorAll('.word-ticks.active').length,0)}finally{w.close()}
});

test('language activation stays open through release and compatibility click and toggles once per tap',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;try{w.fixture.focusInput();const button=d.querySelector('.typing-layout:not([hidden]) [data-typing-key="Language"]'),icon=button.querySelector('svg path'),popover=d.querySelector('#languagePopover');keyboardPointer(w,icon,'pointerdown');keyboardPointer(w,icon,'pointerup');button.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.equal(popover.dataset.testPopover,'open');keyboardTap(w,'Language');assert.equal(popover.dataset.testPopover,'closed');keyboardTap(w,'Language');assert.equal(popover.dataset.testPopover,'open');const output=d.querySelector('.terminal');keyboardPointer(w,output,'pointerdown');keyboardPointer(w,output,'pointerup');assert.equal(popover.dataset.testPopover,'closed')}finally{w.close()}
});


test('custom key contacts survive key gaps, retarget on another key, and cancel outside the keyboard',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.focusInput();const a=d.querySelector('[data-typing-key="a"]'),b=d.querySelector('[data-typing-key="b"]'),layout=a.closest('.typing-layout');layout.getBoundingClientRect=()=>a.getBoundingClientRect();
  for(let n=0;n<10;n++){keyboardPointer(w,a,'pointerdown');if(n%5===4){d.elementFromPoint=()=>layout;keyboardPointer(w,a,'pointermove')}keyboardPointer(w,a,'pointerup')}
  keyboardPointer(w,a,'pointerdown');d.elementFromPoint=()=>b;keyboardPointer(w,a,'pointermove');keyboardPointer(w,a,'pointerup');
  keyboardPointer(w,a,'pointerdown');d.elementFromPoint=()=>d.body;keyboardPointer(w,a,'pointermove');keyboardPointer(w,a,'pointerup');
  await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.text),[...'aaaaaaaaaab']);
 }finally{w.close()}
});


test('alternate-screen vertical gestures send native wheel events while horizontal reading and primary scroll stay local',async()=>{
 const dom=terminal({keyboardMode:'custom',scrollInertia:0}),w=dom.window,d=w.document,wrap=d.querySelector('.terminalwrap'),output=d.querySelector('.terminal');
 try{
  const frame=(screen,on)=>{w.fixture.model.apply({format:'cmux.render-grid.v1',render_epoch:'owned-epoch',render_revision:w.fixture.model.revision+1,full:true,rows:3,columns:30,active_screen:screen,modes:[{code:1007,ansi:false,on}],row_spans:[]});w.fixture.paintTerminal();output.getBoundingClientRect=()=>({left:0,top:0,width:300,height:60})};
  const touch=(type,x,y)=>{const point={identifier:1,target:output,clientX:x,clientY:y},e=new w.TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[point],changedTouches:[point]});wrap.dispatchEvent(e);return e};
  frame('alternate',true);touch('touchstart',90,30);assert.equal(touch('touchmove',90,6).defaultPrevented,true);touch('touchend',90,6);await new Promise(r=>w.setTimeout(r,0));
  assert.deepEqual(w.actions.map(a=>[a.action,a.delta_lines,a.col,a.row,a.surface_id]),[['scroll',-2,9,1,'owned-surface']]);
  Object.defineProperty(wrap,'clientWidth',{value:300});Object.defineProperty(wrap,'scrollWidth',{value:600});wrap.scrollLeft=100;terminalPointer(w,wrap,'pointerdown',90,30);terminalPointer(w,wrap,'pointermove',180,29);terminalPointer(w,wrap,'pointerup',180,29);assert.equal(wrap.scrollLeft,10);assert.equal(d.querySelector('#shell').classList.contains('sidebar-preview'),false);
  touch('touchstart',90,30);const points=[{identifier:1,target:output,clientX:90,clientY:6},{identifier:2,target:d.querySelector('#cursorJoystick'),clientX:20,clientY:800}],held=new w.TouchEvent('touchmove',{cancelable:true,touches:points,changedTouches:[points[0]]});wrap.dispatchEvent(held);touch('touchend',90,6);await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,1,'A second finger on the control switches to local pan, not remote wheel');assert.equal(wrap.scrollTop,24);

  for(const [screen,on] of [['primary',true],['alternate',false]]){frame(screen,on);touch('touchstart',90,30);assert.equal(touch('touchmove',90,6).defaultPrevented,false);touch('touchend',90,6)}
  await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,1);
 }finally{w.close()}
});

test('system keyboard becomes the default once, preserving an explicit later emulated-keyboard choice',()=>{
 for(const keyboardMode of [undefined,'custom','native']){
  const dom=terminal({keyboardMode,keyboardDefaultVersion:undefined,keyboardLanguage:'hiragana'}),w=dom.window,d=w.document;
  try{
   w.fixture.focusInput();assert.equal(d.querySelector('#softwareKeyboard').hidden,true);
   let saved=JSON.parse(w.localStorage.getItem('cmux-pocket-customizations'));assert.equal(saved.keyboardMode,'native');assert.equal(saved.customKeyboardLanguage,'hiragana');
   d.querySelector('#appActions').click();d.querySelector('#menuPokemuxKeyboard').click();assert.equal(d.querySelector('#softwareKeyboard').hidden,false);
   saved=JSON.parse(w.localStorage.getItem('cmux-pocket-customizations'));const reloaded=terminal(saved);
   try{reloaded.window.fixture.focusInput();assert.equal(reloaded.window.document.querySelector('#softwareKeyboard').hidden,false)}finally{reloaded.window.close()}
  }finally{w.close()}
 }
});

function scrollFixture(saved={}){
 const dom=terminal(saved),w=dom.window,d=w.document,wrap=d.querySelector('.terminalwrap'),output=d.querySelector('.terminal');
 w.fixture.model.apply({format:'cmux.render-grid.v1',render_epoch:'owned-epoch',render_revision:2,full:true,rows:3,columns:30,active_screen:'alternate',modes:[{code:1007,ansi:false,on:true}],row_spans:[]});w.fixture.paintTerminal();output.getBoundingClientRect=()=>({left:0,top:0,width:300,height:60});
 const touch=(type,y,at)=>{const point={identifier:1,target:output,clientX:90,clientY:y},e=new w.TouchEvent(type,{bubbles:true,cancelable:true,touches:['touchend','touchcancel'].includes(type)?[]:[point],changedTouches:[point]});Object.defineProperty(e,'timeStamp',{value:at});wrap.dispatchEvent(e)};
 return {dom,w,d,wrap,touch};
}

test('TUI scrolling doubles its default displacement and persists both motion settings',async()=>{
 const {w,d,touch}=scrollFixture({scrollInertia:0});try{
  touch('touchstart',60,0);touch('touchmove',36,16);touch('touchend',36,16);await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.reduce((n,a)=>n+a.delta_lines,0),-2);
  d.querySelector('#appActions').click();d.querySelector('#menuSettings').click();assert.equal(d.querySelector('#scrollSensitivity').value,'2');assert.equal(d.querySelector('#scrollInertia').value,'0');
  const sensitivity=d.querySelector('#scrollSensitivity');sensitivity.value='4';sensitivity.dispatchEvent(new w.Event('input'));const inertia=d.querySelector('#scrollInertia');inertia.value='75';inertia.dispatchEvent(new w.Event('input'));
  const saved=JSON.parse(w.localStorage.getItem('cmux-pocket-customizations'));assert.equal(saved.scrollSensitivity,4);assert.equal(saved.scrollInertia,75);assert.match(d.querySelector('#scrollSensitivityValue').textContent,/4/);assert.match(d.querySelector('#scrollInertiaValue').textContent,/75/);
 }finally{w.close()}
});

test('TUI release coasts, and a new touch cancels the remaining motion',async()=>{
 const {w,d,touch}=scrollFixture();try{
  const frames=new Map();let next=0,clock=32;w.performance.now=()=>clock;w.requestAnimationFrame=fn=>{frames.set(++next,fn);return next};w.cancelAnimationFrame=id=>frames.delete(id);
  touch('touchstart',60,0);touch('touchmove',36,16);touch('touchend',36,32);await new Promise(r=>w.setTimeout(r,0));const dragged=w.actions.reduce((n,a)=>n+a.delta_lines,0);
  for(let i=0;i<4;i++){clock+=16;const batch=[...frames.values()];frames.clear();for(const frame of batch)frame(clock);await new Promise(r=>w.setTimeout(r,0))}
  assert.ok(w.actions.reduce((n,a)=>n+a.delta_lines,0)<dragged,'A released flick continues through the native wheel path');
  d.body.dispatchEvent(new w.Event('pointerdown',{bubbles:true}));const stopped=w.actions.length;clock+=500;for(const frame of frames.values())frame(clock);await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,stopped);
 }finally{w.close()}
});

test('cancelled TUI motion cannot dispatch behind an in-flight scroll request',async()=>{
 const {w,d,touch}=scrollFixture();let release;
 try{
  const fetch=w.fetch,frames=[];let clock=32;w.performance.now=()=>clock;w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};w.cancelAnimationFrame=()=>{};
  w.fetch=async(path,options)=>{const response=await fetch(path,options);if(path==='/api/action'&&w.actions.length===1)await new Promise(resolve=>release=resolve);return response};
  touch('touchstart',60,0);touch('touchmove',36,16);touch('touchend',36,32);await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.delta_lines),[-2]);
  clock+=16;for(const frame of frames.splice(0))frame(clock);d.body.dispatchEvent(new w.Event('pointerdown',{bubbles:true}));release();await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.delta_lines),[-2],'A queued coast must not outlive its touch context');
 }finally{release?.();w.close()}
});


test('shared metadata updates render the received inventory without fetching it again',()=>{
 const dom=terminal(),w=dom.window,d=w.document;
 try{
  let requests=0;w.fetch=()=>{requests++;throw new Error('Unexpected duplicate inventory request')};
  w.fixtureStream.handlers['workspace.updated']({data:JSON.stringify({notifications:[],windows:[{id:'owned-window',groups:[],workspaces:[{id:'owned-workspace',title:'Native rename',panes:[{id:'owned-pane',selected_surface_id:'owned-surface',surfaces:[{id:'owned-surface',title:'Owned terminal',type:'terminal'}]}]}]}]})});
  assert.equal(requests,0);assert.equal(d.querySelector('.workspacehead').getAttribute('aria-label'),'Native rename');
 }finally{w.close()}
});

test('shortcut dock hides, restores and cancels pulls without sending keys',()=>{
 const dom=terminal(),w=dom.window,d=w.document;try{
  const rail=d.querySelector('.inputdock'),grip=rail.querySelector('.shortcut-grip');assert.ok(grip);
  const pointer=(type,x,y)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:3,button:0,isPrimary:true,clientX:x,clientY:y});grip.dispatchEvent(e)};
  pointer('pointerdown',100,100);pointer('pointermove',100,155);assert.ok(rail.classList.contains('rail-pulling'));pointer('pointermove',100,105);pointer('pointerup',100,105);assert.equal(rail.classList.contains('strip-hidden'),false,'Reversal cancels hiding');
  pointer('pointerdown',100,100);pointer('pointermove',100,160);pointer('pointerup',100,160);assert.ok(rail.classList.contains('strip-hidden'));assert.equal(d.querySelector('#dialog').open,false);
  pointer('pointerdown',100,100);pointer('pointermove',100,40);pointer('pointermove',100,98);pointer('pointerup',100,98);assert.ok(rail.classList.contains('strip-hidden'),'Reversal cancels showing');
  pointer('pointerdown',100,100);pointer('pointermove',100,40);pointer('pointerup',100,40);assert.equal(rail.classList.contains('strip-hidden'),false);assert.equal(d.querySelector('#dialog').open,false,'Hidden pull restores strip first');
  pointer('pointerdown',100,100);pointer('pointermove',100,0);pointer('pointerup',100,0);assert.equal(d.querySelector('#dialog').open,true,'Next pull expands panel');pointer('pointerdown',100,100);pointer('pointermove',100,200);pointer('pointerup',100,200);assert.equal(d.querySelector('#dialog').open,false,'Grip stows open panel first');assert.equal(rail.classList.contains('strip-hidden'),false,'Expanded dock cannot hide its strip separately');assert.equal(w.actions.length,0);
 }finally{w.close()}
});


test('requested Hide diagnostics capture browser focus without reopening or input contents',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.focusInput();const output=d.querySelector('.terminal');output.textContent='PRIVATE_TERMINAL_TEXT';
  keyboardTap(w,'Dismiss');output.focus();await new Promise(r=>w.setTimeout(r,0));
  const trace=recordedDiagnostics(w);
  assert.ok(trace.some(e=>e.event==='pointerdown'&&e.target==='hide'));
  assert.ok(trace.some(e=>e.event==='hide'&&e.typing));
  assert.ok(trace.some(e=>e.event==='keyboard-state'&&e.hidden));
  assert.ok(trace.some(e=>e.event==='terminal-focus'&&!e.typing));
  assert.equal(trace.filter(e=>e.event==='keyboard-state').every(e=>e.hidden),true);
  assert.equal(JSON.stringify(trace).includes('PRIVATE_TERMINAL_TEXT'),false);
  assert.equal(trace.every((e,i)=>e.order===i+1),true);
 }finally{w.close()}
});

test('paste diagnostics identify denied clipboard and native field delivery without clipboard data',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  Object.defineProperty(w.navigator,'clipboard',{value:{readText:async()=>{throw new w.DOMException('PRIVATE_ERROR_TEXT','NotAllowedError')}}});
  d.querySelector('[data-function="2"]').click();await new Promise(r=>w.setTimeout(r,0));
  assert.ok(recordedDiagnostics(w).some(e=>e.event==='paste-request'&&e.hasClipboard));
  assert.ok(recordedDiagnostics(w).some(e=>e.event==='paste-denied'&&e.error==='NotAllowedError'));
  const field=d.querySelector('#nativePaste'),event=new w.Event('paste',{bubbles:true,cancelable:true});event.clipboardData={getData:()=> 'PRIVATE_CLIPBOARD_TEXT'};field.dispatchEvent(event);await new Promise(r=>w.setTimeout(r,0));
  assert.ok(recordedDiagnostics(w).some(e=>e.event==='paste-field-event'));
  assert.equal(w.actions.at(-1).text,'PRIVATE_CLIPBOARD_TEXT');
  assert.equal(JSON.stringify(recordedDiagnostics(w)).includes('PRIVATE_'),false);
 }finally{w.close()}
});


test('insecure HTTP startup still shows HTTPS guidance when randomUUID is unavailable',async()=>{
 const dom=new JSDOM(html,{url:'http://pokemux-test.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 try{
  w.isSecureContext=false;w.crypto.randomUUID=undefined;w.matchMedia=()=>({matches:true});
  w.visualViewport={width:390,height:844,scale:1,offsetTop:0,offsetLeft:0,addEventListener(){}};
  w.ResizeObserver=class{observe(){}};
  const script=html.split('<script type="module">\n')[1].split('</script>')[0];w.eval(script);await new Promise(r=>w.setTimeout(r,0));
  assert.equal(w.document.querySelector('#shell').hidden,true);
  assert.equal(w.document.querySelector('main a').textContent,'Open Pokemux over HTTPS');
 }finally{w.close()}
});


test('phone tab-switch Hide trace cannot reopen custom input through browser focus',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.otherTerminal();const output=d.querySelector('.terminal'),wrap=d.querySelector('.terminalwrap');
  for(let i=0;i<2;i++){
   keyboardTap(w,'Dismiss');assert.equal(d.querySelector('#softwareKeyboard').hidden,true);
   output.focus();d.body.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));
   assert.equal(d.querySelector('#softwareKeyboard').hidden,true,'Phone trace: delayed terminal focus after Hide must not request the custom keyboard');
   if(i===0){keyboardPointer(w,wrap,'pointerdown');keyboardPointer(w,wrap,'pointerup');assert.equal(d.querySelector('#softwareKeyboard').hidden,false,'An explicit terminal tap still opens custom input')}
  }
 }finally{w.close()}
});

test('keyboard contact diagnostics distinguish accepted, canceled and abandoned releases without characters',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.otherTerminal();const q=d.querySelector('.typing-layout:not([hidden]) [data-typing-key="q"]');
  keyboardPointer(w,q,'pointerdown');keyboardPointer(w,q,'pointerup');
  keyboardPointer(w,q,'pointerdown');keyboardPointer(w,q,'pointercancel');
  keyboardPointer(w,q,'pointerup');
  keyboardPointer(w,q,'pointerdown');d.elementFromPoint=()=>d.body;keyboardPointer(w,q,'pointermove');keyboardPointer(w,q,'pointerup');
  await new Promise(r=>w.setTimeout(r,150));
  assert.deepEqual(w.actions.map(a=>a.text),['q']);
  assert.ok(recordedDiagnostics(w).some(e=>e.event==='key-up'&&e.accepted&&e.hasKey&&e.matched));
  assert.ok(recordedDiagnostics(w).some(e=>e.event==='key-cancel'&&!e.accepted));
  assert.ok(recordedDiagnostics(w).some(e=>e.event==='key-up'&&!e.contact&&!e.accepted));
  assert.ok(recordedDiagnostics(w).some(e=>e.event==='key-up'&&e.contact&&!e.hasKey&&!e.accepted));
  assert.ok(recordedDiagnostics(w).some(e=>e.event==='input-counts'&&e.inputQueued===1&&e.inputDelivered===1));
  assert.equal(recordedDiagnostics(w).some(e=>['key','text','value','data'].some(field=>field in e)),false);
 }finally{w.close()}
});


test('floating gesture diagnostics start before an action and classify configured functions without contents',async()=>{
 const dom=terminal({keyboardMode:'custom',floatingFunctions:['key:PRIVATE_KEY','recent','paste','keyboard']}),w=dom.window,d=w.document;
 try{
  const handle=d.querySelector('#floatingHandle'),control=d.querySelector('#floatingFunctions');
  const pointer=(type,x,y)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:11,button:0,isPrimary:true,clientX:x,clientY:y});handle.dispatchEvent(e)};
  const cx=parseFloat(control.style.left)+22,cy=parseFloat(control.style.top)+22;
  pointer('pointerdown',cx,cy);assert.ok(recordedDiagnostics(w).some(e=>e.event==='pointerdown'&&e.target==='floating'));
  pointer('pointermove',cx-30,cy);pointer('pointermove',cx,cy);pointer('pointerup',cx,cy);
  assert.ok(recordedDiagnostics(w).some(e=>e.event==='floating-release'&&e.selecting&&e.choice===-1));assert.equal(w.actions.length,0);
  pointer('pointerdown',cx,cy);pointer('pointermove',cx-30,cy);
  const branch=d.querySelector('[data-function="0"]'),bx=cx+parseFloat(branch.style.left),by=cy+parseFloat(branch.style.top);
  pointer('pointermove',bx,by);pointer('pointerup',bx,by);await new Promise(r=>w.setTimeout(r,0));
  assert.ok(recordedDiagnostics(w).some(e=>e.event==='floating-release'&&e.selecting&&e.choice===0));
  assert.ok(recordedDiagnostics(w).some(e=>e.event==='floating-action'&&e.functionKind==='key'));
  assert.equal(w.actions.length,1);assert.equal(JSON.stringify(recordedDiagnostics(w)).includes('PRIVATE_KEY'),false);
 }finally{w.close()}
});


test('long floating Paste drag offers a fresh button tap without a rejected clipboard request',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;let tapping=false,reads=0;
 try{
  Object.defineProperty(w.navigator,'clipboard',{value:{readText:async()=>{reads++;if(!tapping)throw new w.DOMException('Gesture rejected','NotAllowedError');return 'PHONE_PASTE_PROBE'}}});
  const handle=d.querySelector('#floatingHandle'),control=d.querySelector('#floatingFunctions'),paste=d.querySelector('[data-function="2"]');
  const pointer=(type,x,y)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:12,button:0,isPrimary:true,pointerType:'touch',clientX:x,clientY:y});handle.dispatchEvent(e)};
  const cx=parseFloat(control.style.left)+22,cy=parseFloat(control.style.top)+22;
  pointer('pointerdown',cx,cy);pointer('pointermove',cx-30,cy);
  const bx=cx+parseFloat(paste.style.left),by=cy+parseFloat(paste.style.top);pointer('pointermove',bx,by);
  await new Promise(r=>w.setTimeout(r,1141));pointer('pointerup',bx,by);await new Promise(r=>w.setTimeout(r,0));
  assert.equal(reads,0,'Drag release cannot request clipboard through the rejected WebKit gesture');assert.equal(d.querySelector('#nativePaste'),null);assert.equal(control.classList.contains('expanded'),true);assert.equal(paste.getAttribute('aria-pressed'),'true');
  w.fixture.metadata();assert.equal(paste.textContent,'Tap to paste');assert.equal(paste.getAttribute('aria-label'),'Tap to paste');assert.equal(paste.getAttribute('aria-pressed'),'true');
  tapping=true;paste.click();tapping=false;await new Promise(r=>w.setTimeout(r,0));
  assert.equal(reads,1);assert.deepEqual(w.actions.map(a=>[a.action,a.text]),[['paste','PHONE_PASTE_PROBE']]);assert.equal(control.classList.contains('expanded'),false);
 }finally{w.close()}
});

test('rapid custom typing starts a fresh contact trace after the earlier diagnostic window expires',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.performance.now=()=>60000;recordedDiagnostics(w).length=0;
  const q=d.querySelector('.typing-layout:not([hidden]) [data-typing-key="q"]');
  keyboardPointer(w,q,'pointerdown');keyboardPointer(w,q,'pointerup');
  await new Promise(r=>w.setTimeout(r,150));
  assert.deepEqual(w.actions.map(a=>a.text),['q']);
  const down=recordedDiagnostics(w).find(e=>e.event==='key-down'),up=recordedDiagnostics(w).find(e=>e.event==='key-up');
  assert.ok(down?.accepted,'First custom key starts logging even without preceding Hide or Paste');
  assert.equal(down.hit,'keyboard');assert.ok(Number.isFinite(down.x)&&Number.isFinite(down.y));
  assert.ok(up?.accepted&&up.contact&&up.hasKey&&up.matched);
  assert.ok(recordedDiagnostics(w).some(e=>e.event==='input-counts'&&e.inputQueued===1&&e.inputDelivered===1));
 }finally{w.close()}
});

test('terminal selection adjustment starts a content-free gesture trace without sending input',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.performance.now=()=>60000;recordedDiagnostics(w).length=0;
  const output=d.querySelector('.terminal'),text=output.querySelector('.terminal-row span').firstChild,range=d.createRange();
  range.setStart(text,0);range.setEnd(text,5);w.getSelection().addRange(range);
  d.elementFromPoint=()=>output;
  keyboardPointer(w,output,'pointerdown');keyboardPointer(w,output,'pointermove');keyboardPointer(w,output,'pointerup');
  const move=recordedDiagnostics(w).find(e=>e.event==='pointermove');
  assert.ok(move?.selected&&move.target==='terminal'&&move.hit==='terminal');
  assert.ok(Number.isFinite(move.x)&&Number.isFinite(move.y));
  assert.equal(w.getSelection().toString(),'hello');assert.equal(w.actions.length,0);
  assert.equal(recordedDiagnostics(w).some(e=>['text','value','data'].some(field=>field in e)),false);
 }finally{w.close()}
});


test('overlapping contacts retain key glow until the last finger releases or moves',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document,a=d.querySelector('[data-typing-key="a"]'),b=d.querySelector('[data-typing-key="b"]');
 try{
  keyboardPointer(w,a,'pointerdown',1);keyboardPointer(w,a,'pointerdown',2);keyboardPointer(w,a,'pointerup',1);
  assert.equal(a.classList.contains('pressed'),true,'The second contact still holds this key');
  keyboardPointer(w,a,'pointerup',2);assert.equal(a.classList.contains('pressed'),false);
  keyboardPointer(w,a,'pointerdown',1);keyboardPointer(w,a,'pointerdown',2);d.elementFromPoint=()=>b;
  keyboardPointer(w,a,'pointermove',1);assert.equal(a.classList.contains('pressed'),true);assert.equal(b.classList.contains('pressed'),true);
  keyboardPointer(w,a,'pointerup',2);keyboardPointer(w,b,'pointerup',1);
  assert.equal(a.classList.contains('pressed'),false);assert.equal(b.classList.contains('pressed'),false);
  await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(action=>action.text),['a','a','a','b']);
 }finally{w.close()}
});

test('native terminal selection has visible handles without exposing a second insertion caret',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document,output=d.querySelector('.terminal'),selection=w.getSelection();
 try{
  const text=output.querySelector('.terminal-row span').firstChild,range=d.createRange(),insertionCaret=w.getComputedStyle(output).caretColor;
  range.setStart(text,0);range.setEnd(text,5);selection.removeAllRanges();selection.addRange(range);d.dispatchEvent(new w.Event('selectionchange'));
  const selectedCaret=w.getComputedStyle(output).caretColor;
  assert.notEqual(selectedCaret,insertionCaret,'WebKit derives native selection handles from caret-color');
  assert.equal(selection.toString(),'hello','Selection styling must preserve the copied characters');
  range.setStart(text,1);range.setEnd(text,4);selection.removeAllRanges();selection.addRange(range);d.dispatchEvent(new w.Event('selectionchange'));
  assert.equal(w.getComputedStyle(output).caretColor,selectedCaret);assert.equal(selection.toString(),'ell');
  selection.collapse(text,4);d.dispatchEvent(new w.Event('selectionchange'));
  assert.equal(w.getComputedStyle(output).caretColor,insertionCaret,'The remote grid must own the insertion cursor');
  range.setStart(text,0);range.setEnd(text,5);selection.removeAllRanges();selection.addRange(range);d.dispatchEvent(new w.Event('selectionchange'));
  const other=d.querySelector('#dialogTitle');other.textContent='Other control';range.selectNodeContents(other);selection.removeAllRanges();selection.addRange(range);d.dispatchEvent(new w.Event('selectionchange'));
  assert.equal(w.getComputedStyle(output).caretColor,insertionCaret,'A selection outside the terminal must clear its selection tint');
  assert.equal(selection.toString(),'Other control');assert.equal(w.actions.length,0);
 }finally{w.close()}
});


test('raw keyboard touches are traced before delegated pointer handling without sending keys',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document,key=d.querySelector('[data-typing-key="t"]');
 try{
  w.performance.now=()=>60000;recordedDiagnostics(w).length=0;d.elementFromPoint=()=>key;
  for(let id=1;id<=4;id++){
   const point={identifier:id,target:key,clientX:192,clientY:602},down=new w.TouchEvent('touchstart',{bubbles:true,cancelable:true,changedTouches:[point],touches:[point]}),up=new w.TouchEvent('touchend',{bubbles:true,cancelable:true,changedTouches:[point],touches:[]});
   key.dispatchEvent(down);key.dispatchEvent(up);
  }
  const starts=recordedDiagnostics(w).filter(e=>e.event==='touchstart'),ends=recordedDiagnostics(w).filter(e=>e.event==='touchend');
  assert.equal(starts.length,4);assert.equal(ends.length,4);assert.deepEqual(starts.map(e=>e.touch),[1,2,3,4]);
  assert.ok(starts.every(e=>e.hasKey&&e.target==='keyboard'&&e.hit==='keyboard'&&e.contacts===1&&Number.isFinite(e.eventAt)));
  assert.ok(ends.every(e=>e.contacts===0));assert.equal(w.actions.length,0);
  assert.equal(recordedDiagnostics(w).some(e=>['text','value','data','key'].some(field=>field in e)),false);
 }finally{w.close()}
});


test('native tab order wins over saved phone order and follows desktop metadata changes',()=>{
 const dom=terminal({tabOrder:{'owned-workspace':['owned-surface-two','owned-surface']}}),w=dom.window,d=w.document;
 try{
  w.fixture.otherTerminal();const order=()=>[...d.querySelectorAll('.surfacetab')].map(b=>b.dataset.surface);
  assert.deepEqual(order(),['owned-surface','owned-surface-two'],'Persisted phone ranking cannot contradict the native pane order');
  w.fixture.applyTree({notifications:[],windows:[{id:'owned-window',groups:[],workspaces:[{id:'owned-workspace',title:'Owned workspace',panes:[{id:'owned-pane',selected_surface_id:'owned-surface-two',surfaces:[{id:'owned-surface-two',title:'Other terminal',type:'terminal'},{id:'owned-surface',title:'Owned terminal',type:'terminal'}]}]}]}]});
  assert.deepEqual(order(),['owned-surface-two','owned-surface']);
  assert.equal(d.querySelector('.surfacetab.active').dataset.surface,'owned-surface-two');
  assert.equal(Object.hasOwn(JSON.parse(w.localStorage.getItem('cmux-pocket-customizations')),'tabOrder'),false);
 }finally{w.close()}
});

test('second modifier tap locks repeated input and shortcuts until third tap, with context reset',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.focusInput();const ctrl=d.querySelector('.inputdock [data-key="Ctrl"]');ctrl.click();ctrl.click();
  assert.equal(ctrl.classList.contains('locked'),true,'Second tap locks instead of switching off');assert.equal(ctrl.getAttribute('aria-pressed'),'true');
  for(const key of ['c','d','k','c'])keyboardTap(w,key);d.querySelector('[data-key="Ctrl-C"]').click();
  await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.key),['Ctrl-C','Ctrl-d','Ctrl-k','Ctrl-C','Ctrl-C']);assert.equal(ctrl.classList.contains('locked'),true);
  ctrl.click();keyboardTap(w,'x');await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).text,'x');assert.equal(ctrl.getAttribute('aria-pressed'),'false');
  const alt=d.querySelector('.inputdock [data-key="Alt"]');alt.click();alt.click();keyboardTap(w,'x');keyboardTap(w,'y');await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.slice(-2).map(a=>a.key),['Alt-x','Alt-y']);
  w.fixture.metadata();assert.equal(d.querySelector('[data-key="Alt"]').classList.contains('locked'),true,'Metadata repaint retains lock');w.fixture.otherTerminal();assert.equal(d.querySelector('[data-key="Alt"]').getAttribute('aria-pressed'),'false','Switching terminal releases locks');
 }finally{w.close()}
});

test('locked Shift combines with transient Ctrl and releases only the one-shot modifier',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.focusInput();const shift=d.querySelector('.inputdock [data-key="Shift"]');shift.click();shift.click();d.querySelector('.inputdock [data-key="Ctrl"]').click();keyboardTap(w,'a');keyboardTap(w,'b');
  await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.key),['Shift-Ctrl+A','Shift+B'].map(k=>k.replaceAll('+','-')));assert.equal(shift.classList.contains('locked'),true);assert.equal(d.querySelector('[data-key="Ctrl"]').getAttribute('aria-pressed'),'false');
  keyboardTap(w,'Dismiss');assert.equal(d.querySelector('[data-key="Shift"]').getAttribute('aria-pressed'),'false','Hide releases locks');
 }finally{w.close()}
});

test('locked Ctrl survives Backspace hold and joystick repeats without requiring another tap',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.focusInput();const ctrl=d.querySelector('[data-key="Ctrl"]');ctrl.click();ctrl.click();const backspace=d.querySelector('[data-typing-key="Backspace"]');keyboardPointer(w,backspace,'pointerdown');await new Promise(r=>w.setTimeout(r,440));keyboardPointer(w,backspace,'pointerup');
  assert.ok(w.actions.length>=2);assert.ok(w.actions.every(a=>a.key==='Ctrl-Backspace'));keyboardTap(w,'k');
  const joy=d.querySelector('#cursorJoystick'),x=parseFloat(joy.style.left)+22,y=parseFloat(joy.style.top)+22,event=(px,py)=>({pointerId:9,button:0,isPrimary:true,clientX:px,clientY:py,preventDefault(){}});joy.onpointerdown(event(x,y));joy.onpointermove(event(x-15,y));await new Promise(r=>w.setTimeout(r,720));joy.onpointerup(event(x-15,y));keyboardTap(w,'d');await new Promise(r=>w.setTimeout(r,0));
  assert.ok(w.actions.filter(a=>a.key==='Ctrl-Left').length>=2);assert.equal(w.actions.at(-1).key,'Ctrl-d');assert.equal(ctrl.classList.contains('locked'),true);assert.ok(w.actions.some(a=>a.key==='Ctrl-k'));
 }finally{w.close()}
});

test('modifier lock survives native typing and both paste entry points, then disconnect releases it',async()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal');
 try{
  output.focus();const ctrl=d.querySelector('.inputdock [data-key="Ctrl"]');ctrl.click();ctrl.click();
  const type=key=>output.dispatchEvent(new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:key}));type('d');type('k');
  const paste=new w.Event('paste',{bubbles:true,cancelable:true});paste.clipboardData={getData:()=> 'native paste'};output.dispatchEvent(paste);
  Object.defineProperty(w.navigator,'clipboard',{value:{readText:async()=> 'floating paste'}});d.querySelector('#floatingFunctions [data-function="2"]').click();await new Promise(r=>w.setTimeout(r,0));type('a');await new Promise(r=>w.setTimeout(r,0));
  assert.deepEqual(w.actions.map(a=>a.key??a.text),['Ctrl-d','Ctrl-k','native paste','floating paste','Ctrl-a']);assert.equal(ctrl.classList.contains('locked'),true);
  w.eval('setConnection(false)');assert.equal(d.querySelector('[data-key="Ctrl"]').getAttribute('aria-pressed'),'false');
 }finally{w.close()}
});


test('raw custom-keyboard trace includes outside contacts, movement and numeric layout bounds',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.focusInput();w.fixture.flushInputDiagnostics?.();w.diagnostics.length=0;
  const root=d.querySelector('#softwareKeyboard'),q=d.querySelector('.typing-layout:not([hidden]) [data-typing-key="q"]');
  root.getBoundingClientRect=()=>({left:0,top:550,width:428,height:329});q.getBoundingClientRect=()=>({left:1,top:556,width:42,height:58});d.elementFromPoint=()=>d.body;
  const point=(id,target,x,y)=>({identifier:id,target,clientX:x,clientY:y});
  const raw=(type,changed,touches,at)=>{const e=new w.TouchEvent(type,{bubbles:true,cancelable:true,changedTouches:changed,touches});Object.defineProperty(e,'timeStamp',{value:at});changed[0].target.dispatchEvent(e)};
  const outside=point(1,d.body,290,540),inside=point(2,q,20,580);
  raw('touchstart',[outside],[outside],100);raw('touchstart',[inside],[outside,inside],120);
  raw('touchmove',[point(1,d.body,295,545)],[outside,inside],140);raw('touchmove',[point(2,q,22,583)],[outside,inside],140);
  raw('touchend',[outside],[inside],160);raw('touchend',[inside],[],180);w.fixture.flushInputDiagnostics?.();
  const starts=w.diagnostics.filter(e=>e.event==='touchstart'),moves=w.diagnostics.filter(e=>e.event==='touchmove');
  assert.deepEqual(starts.map(e=>e.touch),[1,2],'A contact outside the keyboard cannot disappear before order allocation');assert.deepEqual(moves.map(e=>e.touch),[1,2],'Each overlapping finger retains its path');
  const layout=w.diagnostics.find(e=>e.event==='keyboard-layout');assert.ok(layout);assert.deepEqual(layout.rects[0],[0,550,428,329]);assert.deepEqual(layout.rects[1],[1,556,42,58]);
  assert.equal(w.actions.length,0);assert.equal(JSON.stringify(w.diagnostics).includes('PRIVATE_'),false);
 }finally{w.close()}
});

test('system-keyboard terminal gestures log touch ownership and numeric geometry without terminal text',()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=output.closest('.terminalwrap');
 try{Object.defineProperties(wrap,{clientWidth:{value:390},clientHeight:{value:600}});wrap.style.padding='0';output.style.width='960px';d.elementFromPoint=()=>output;output.getBoundingClientRect=()=>({left:13,top:46,width:720,height:600});wrap.getBoundingClientRect=()=>({left:0,top:46,width:390,height:600});w.fixture.focusInput();w.fixture.flushInputDiagnostics();w.diagnostics.length=0;
 const point=(identifier,x,target=output)=>({identifier,clientX:x,clientY:100,target}),send=(type,points)=>points.at(-1).target.dispatchEvent(new w.TouchEvent(type,{bubbles:true,cancelable:true,touches:points,changedTouches:points}));
 send('touchstart',[point(1,100,wrap)]);send('touchstart',[point(1,100,wrap),point(2,300)]);send('touchmove',[point(1,130,wrap),point(2,270)]);w.fixture.flushInputDiagnostics();
 assert.ok(w.diagnostics.some(e=>e.event==='touchstart'&&e.touch===1&&e.target==='terminal'),'Blank terminal wrapper touches must be classified as terminal');
 assert.ok(w.diagnostics.some(e=>e.event==='touchmove'&&e.target==='terminal'&&e.contacts===2),'Native terminal touches cannot be skipped');
 const gesture=w.diagnostics.find(e=>e.event==='terminal-gesture'&&e.gesture==='pinch');assert.ok(gesture,'Log the terminal handler owning both fingers');assert.deepEqual(gesture.rects,[[0,46,390,600],[13,46,720,600]]);assert.equal(JSON.stringify(w.diagnostics).includes(output.textContent),false);
 }finally{w.close()}
});

test('contact diagnostics batch off the input path and flush pending events on page hide',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.fixture.flushInputDiagnostics?.();w.diagnostics.length=0;w.diagnosticRequests.length=0;
  const q=d.querySelector('.typing-layout:not([hidden]) [data-typing-key="q"]');keyboardPointer(w,q,'pointerdown',1);keyboardPointer(w,q,'pointerup',1);
  assert.equal(w.diagnosticRequests.length,0,'Contact handlers must not perform one fetch per event');
  w.dispatchEvent(new w.Event('pagehide'));assert.equal(w.diagnosticRequests.length,1);assert.ok(Array.isArray(w.diagnosticRequests[0].payload));assert.equal(w.diagnosticRequests[0].keepalive,true);
  assert.equal(w.diagnostics.filter(e=>e.event==='key-down').length,1);assert.equal(w.diagnostics.filter(e=>e.event==='key-up').length,1);
 }finally{w.close()}
});
test('unsaved floating controls use the keyboard footer instead of covering letter keys',()=>{
 const dom=terminal({keyboardMode:'custom',keyboardDefaultVersion:1}),w=dom.window,d=w.document;
 try{w.fixture.focusInput();const footer=d.querySelector('.typing-layout:not([hidden]) .typing-row:last-child');footer.getBoundingClientRect=()=>({bottom:700});w.fixture.syncViewport();for(const selector of ['#floatingFunctions','#cursorJoystick'])assert.equal(parseFloat(d.querySelector(selector).style.top)+22,724,'Default control center is below the last key row');
 Object.assign(w.visualViewport,{width:195,height:422,scale:2});footer.getBoundingClientRect=()=>({bottom:300});w.fixture.syncViewport();for(const selector of ['#floatingFunctions','#cursorJoystick'])assert.equal(parseFloat(d.querySelector(selector).style.top)+22,624,'Footer position uses view coordinates under page zoom');
 }finally{w.close()}
});

test('keyboard-footer defaults preserve positions explicitly dragged by the user',()=>{
 const dom=terminal({keyboardMode:'custom',keyboardDefaultVersion:1,floatingPosition:[.25,.35],joystickPosition:[.75,.55]}),w=dom.window,d=w.document;
 try{w.fixture.focusInput();d.querySelector('.typing-layout:not([hidden]) .typing-row:last-child').getBoundingClientRect=()=>({bottom:700});w.fixture.syncViewport();assert.equal(parseFloat(d.querySelector('#floatingFunctions').style.top)+22,.35*844);assert.equal(parseFloat(d.querySelector('#cursorJoystick').style.top)+22,.55*844)}finally{w.close()}
});

test('spatial keyboard shows independent enlarged accepted-key previews and commits overlapping contacts once',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{w.fixture.focusInput();const q=d.querySelector('[data-typing-key="q"]'),p=d.querySelector('[data-typing-key="p"]');keyboardPointer(w,q,'pointerdown',1);keyboardPointer(w,p,'pointerdown',2);assert.deepEqual([...d.querySelectorAll('.typing-preview')].map(e=>e.textContent),['q','p']);assert.ok([...d.querySelectorAll('.typing-preview')].every(e=>e.getAttribute('aria-hidden')==='true'));keyboardPointer(w,p,'pointerup',2);assert.deepEqual([...d.querySelectorAll('.typing-preview')].map(e=>e.textContent),['q']);keyboardPointer(w,q,'pointerup',1);await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.text),['p','q']);assert.equal(d.querySelector('.typing-preview'),null)}finally{w.close()}
});

test('English boundary guess is previewed before release; symbols, modifiers, settings and target changes stay literal',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{w.fixture.focusInput();const boundary=()=>{const g=d.querySelector('[data-typing-key="g"]'),h=d.querySelector('[data-typing-key="h"]'),a=g.firstElementChild.getBoundingClientRect(),b=h.firstElementChild.getBoundingClientRect();return {target:g,x:(a.left+a.width/2+b.left+b.width/2)/2-.4,y:a.top+a.height/2}},at=({target,x,y},type,id=2)=>{const event=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:id,button:0,isPrimary:id===1,clientX:x,clientY:y});target.dispatchEvent(event)};
  keyboardTap(w,'t');at(boundary(),'pointerdown');assert.equal(d.querySelector('.typing-preview').textContent,'h');at(boundary(),'pointerup');
  d.querySelector('[data-key="Ctrl"]').click();at(boundary(),'pointerdown');assert.equal(d.querySelector('.typing-preview').textContent,'g');at(boundary(),'pointerup');
  keyboardTap(w,'t');w.fixture.otherTerminal();at(boundary(),'pointerdown');assert.equal(d.querySelector('.typing-preview').textContent,'g');at(boundary(),'pointerup');
  keyboardTap(w,'123');keyboardTap(w,'#+=');keyboardTap(w,'|');await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.key||a.text),['t','h','Ctrl-g','t','g','|']);
 }finally{w.close()}
});

test('guided thumb calibration captures known targets locally, restores typing, and settings reset it',async()=>{
 const dom=terminal({keyboardMode:'custom',englishGuesser:false}),w=dom.window,d=w.document;
 try{w.fixture.displaySettings();d.querySelector('#calibrateThumbs').click();assert.equal(d.querySelector('#softwareKeyboard').hidden,false);assert.equal(d.querySelector('#dialog').open,false);for(const key of ['f','j','r','u','v','n','t','y']){assert.ok(d.querySelector('#keyboardCoach').textContent.includes(key.toUpperCase()));const b=d.querySelector(`[data-typing-key="${key}"]`),r=b.firstElementChild.getBoundingClientRect();for(const type of ['pointerdown','pointerup']){const event=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:3,button:0,isPrimary:true,clientX:r.left+r.width/2+4,clientY:r.top+r.height/2+3});b.dispatchEvent(event)}}assert.equal(d.querySelector('#keyboardCoach').hidden,true);await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,0,'Calibration taps never reach cmux');assert.ok(JSON.parse(w.localStorage.getItem('cmux-pocket-customizations')).thumbOffsets.left.x>0);keyboardTap(w,'a');await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).text,'a');const g=d.querySelector('[data-typing-key="g"]'),h=d.querySelector('[data-typing-key="h"]'),a=g.firstElementChild.getBoundingClientRect(),b=h.firstElementChild.getBoundingClientRect(),x=(a.left+a.width/2+b.left+b.width/2)/2+2,y=a.top+a.height/2+3;const boundary=()=>{for(const type of ['pointerdown','pointerup']){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:4,button:0,isPrimary:true,clientX:x,clientY:y});h.dispatchEvent(e)}};boundary();await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).text,'g','Known rightward thumb offset resolves the intended g');w.fixture.displaySettings();assert.equal(d.querySelector('#resetThumbs').disabled,false);d.querySelector('#resetThumbs').click();assert.equal(d.querySelector('#resetThumbs').disabled,true);d.querySelector('#dialogClose').click();w.fixture.focusInput();boundary();await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).text,'h','Reset affects the live decoder at the same touch coordinates');w.fixture.displaySettings();d.querySelector('#englishGuesser').checked=false;d.querySelector('#englishGuesser').dispatchEvent(new w.Event('change'));assert.equal(JSON.parse(w.localStorage.getItem('cmux-pocket-customizations')).englishGuesser,false)}finally{w.close()}
});

test('external Backspace deletes English context before the next ambiguous touch',async()=>{
 for(const source of ['hardware','floating']){const dom=terminal({keyboardMode:'custom',floatingFunctions:['key:Backspace','recent','paste','keyboard']}),w=dom.window,d=w.document;
 try{w.fixture.focusInput();keyboardTap(w,'t');await new Promise(r=>w.setTimeout(r,0));if(source==='hardware')d.querySelector('.terminal').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Backspace',bubbles:true,cancelable:true}));else{d.querySelector('#floatingHandle').click();d.querySelector('[data-function="0"]').click()}await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).key,'Backspace');const g=d.querySelector('[data-typing-key="g"]'),h=d.querySelector('[data-typing-key="h"]'),a=g.firstElementChild.getBoundingClientRect(),b=h.firstElementChild.getBoundingClientRect(),x=(a.left+a.width/2+b.left+b.width/2)/2-.4,y=a.top+a.height/2;for(const type of ['pointerdown','pointerup']){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:2,button:0,isPrimary:false,clientX:x,clientY:y});g.dispatchEvent(e)}await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).text,'g',source+' must clear the deleted t from prediction')
 }finally{w.close()}}
});

test('a native slide release uses its final key even when WebKit omits pointermove',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{const g=d.querySelector('[data-typing-key="g"]'),h=d.querySelector('[data-typing-key="h"]');for(const [type,key]of [['pointerdown',g],['pointerup',h]]){const r=key.firstElementChild.getBoundingClientRect(),e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:31,button:0,isPrimary:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2});g.dispatchEvent(e)}await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.text),['h'])}finally{w.close()}
});

test('entering a fullscreen TUI clears primary-screen scroll so its header stays visible',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{const wrap=d.querySelector('.terminalwrap');wrap.scrollTop=300;w.fixture.model.apply({format:'cmux.render-grid.v1',render_epoch:'owned-epoch',render_revision:2,full:true,active_screen:'alternate',rows:3,columns:30,row_spans:[{row:0,column:0,text:'TUI header'}],cursor:{row:2,column:0,visible:true,style:'bar'}});w.fixture.paintTerminal();assert.equal(wrap.scrollTop,0)}finally{w.close()}
});

test('enlarged edge-key feedback stays inside a short visual viewport',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{const root=d.querySelector('#softwareKeyboard'),q=d.querySelector('[data-typing-key="q"]');root.getBoundingClientRect=()=>({left:0,top:20,width:390,height:300});q.getBoundingClientRect=()=>({left:0,top:22,width:39,height:58});q.firstElementChild.getBoundingClientRect=()=>({left:3,top:25,width:33,height:52});keyboardPointer(w,q,'pointerdown');const preview=d.querySelector('.typing-preview');assert.ok(preview);assert.ok(20+parseFloat(preview.style.top)>=w.visualViewport.offsetTop);assert.ok(parseFloat(preview.style.left)>=0);assert.ok(parseFloat(preview.style.left)+64<=390);keyboardPointer(w,q,'pointerup')}finally{w.close()}
});

test('ordinary typing preserves key label nodes unless a one-shot modifier changes their displayed case',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{const a=d.querySelector('[data-typing-key="a"] .typing-keycap'),label=a.firstChild;keyboardTap(w,'a');assert.equal(a.firstChild,label,'Unchanged keyboard labels must not be rewritten per input');keyboardTap(w,'Shift');assert.equal(a.textContent,'A');keyboardTap(w,'a');assert.equal(a.textContent,'a');const unshifted=a.firstChild;keyboardTap(w,'a');assert.equal(a.firstChild,unshifted);await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.text),['a','A','a'])}finally{w.close()}
});

test('native shortcut touch completion sends Esc exactly once even when WebKit omits pointerup',async()=>{
 const dom=terminal({keyboardMode:'native'}),w=dom.window,d=w.document;try{w.fixture.focusInput();const key=d.querySelector('[data-key="Esc"]');d.elementFromPoint=()=>key;for(let n=0;n<12;n++){const point={identifier:700+n,target:key,clientX:41.33333333333333,clientY:398.3333333333333};terminalPointer(w,key,'pointerdown',point.clientX,point.clientY,{pointerId:point.identifier,pointerType:'touch'});key.dispatchEvent(new w.TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[point],changedTouches:[point]}));if(n%2)terminalPointer(w,key,'pointerup',point.clientX,point.clientY,{pointerId:point.identifier,pointerType:'touch'});key.dispatchEvent(new w.TouchEvent('touchend',{bubbles:true,cancelable:true,touches:n%2?[]:[point],changedTouches:[point]}));if(n%2)key.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}))}await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>[a.action,a.key]),Array.from({length:12},()=>['key','Escape']));assert.equal(d.activeElement,d.querySelector('.terminal'));assert.equal(d.querySelector('#viewportDock').classList.contains('typing'),true)}finally{w.close()}
});

test('Touch-owned Esc ignores different-ID pointer cancellation but honors actual touch cancel and drags',async()=>{
 const dom=terminal({keyboardMode:'native'}),w=dom.window,d=w.document;try{w.fixture.focusInput();const key=d.querySelector('[data-key="Esc"]');d.elementFromPoint=()=>key;for(const end of ['touchend','touchcancel','drag']){const point={identifier:7,target:key,clientX:41,clientY:398},event=(type,p=point)=>key.dispatchEvent(new w.TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'||type==='touchcancel'?[]:[p],changedTouches:[p]}));terminalPointer(w,key,'pointerdown',41,398,{pointerId:42,pointerType:'touch'});event('touchstart');terminalPointer(w,key,'pointercancel',0,0,{pointerId:42,pointerType:'touch'});if(end==='drag'){event('touchmove',{...point,clientX:100});event('touchend',{...point,clientX:100})}else event(end)}await new Promise(r=>w.setTimeout(r,0));assert.deepEqual(w.actions.map(a=>a.key),['Escape']);assert.equal(d.activeElement,d.querySelector('.terminal'))}finally{w.close()}
});

test('joystick speed ranges deliver exact requested cadences, show one range, and stop on center/release',async()=>{
 const dom=terminal(),w=dom.window,d=w.document,handle=d.querySelector('#cursorJoystick');let now=0,id=0;const timers=new Map();
 w.setInterval=(fn,period)=>{timers.set(++id,{fn,period,next:now+period});return id};w.clearInterval=id=>timers.delete(id);
 const flush=()=>new Promise(r=>w.setTimeout(r,0)),advance=async ms=>{const end=now+ms;while(true){const next=[...timers.values()].sort((a,b)=>a.next-b.next)[0];if(!next||next.next>end)break;now=next.next;next.next+=next.period;next.fn();await flush()}now=end;await flush()};
 const point=(x,y)=>({pointerId:71,button:0,isPrimary:true,clientX:x,clientY:y,preventDefault(){}}),press=()=>handle.onpointerdown(point(195,422));
 try{
  handle.style.left='173px';handle.style.top='400px';
  const cases=[['Right',25,'Right',700],['Right',95,'Right',300],['Left',-25,'Left',700],['Left',-95,'Left',300],['Up',-25,'Up',700],['Up',-95,'Up',300],['Down',25,'Down',700],['Down',95,'Down',300]];
  for(const [direction,offset,key,period]of cases){press();const horizontal=['Left','Right'].includes(direction),p=point(195+(horizontal?offset:0),422+(horizontal?0:offset)),before=w.actions.length;handle.onpointermove(p);await flush();assert.equal(w.actions.at(-1).key,key);await advance(period-1);assert.equal(w.actions.length,before+1,`${direction} ${offset}: no early repeat`);await advance(1);assert.equal(w.actions.length,before+2,`${direction} ${offset}: repeat at ${period}ms`);assert.equal(d.querySelector('#joystickSpeed').hidden,false);const active=d.querySelectorAll('#joystickSpeed [data-speed].active');assert.equal(active.length,1);assert.equal(active[0].dataset.direction,direction);handle.onpointerup(p);assert.equal(d.querySelector('#joystickSpeed').hidden,true);const released=w.actions.length;await advance(900);assert.equal(w.actions.length,released)}
  press();handle.onpointermove(point(215,422));await flush();await advance(500);handle.onpointermove(point(290,422));await flush();const changed=w.actions.length;await advance(299);assert.equal(w.actions.length,changed);await advance(1);assert.equal(w.actions.length,changed+1,'Entering fast range resets the cadence, including when the key itself is unchanged');handle.onpointermove(point(195,422));const centered=w.actions.length;await advance(1000);assert.equal(w.actions.length,centered);handle.onpointercancel();
 }finally{w.close()}
});

test('joystick outer vertical jumps once, modifiers survive ranges, and edge travel reaches all ranges',async()=>{
 const dom=terminal(),w=dom.window,d=w.document,h=d.querySelector('#cursorJoystick');let repeat;w.setInterval=(fn,ms)=>{repeat={fn,ms};return 1};w.clearInterval=()=>{repeat=null};const point=(x,y)=>({pointerId:72,button:0,isPrimary:true,clientX:x,clientY:y,preventDefault(){}}),flush=()=>new Promise(r=>w.setTimeout(r,0));
 try{
  h.style.left='173px';h.style.top='400px';d.querySelector('[data-key="Shift"]').click();h.onpointerdown(point(195,422));
  for(const [offset,key]of[[-155,'Shift-Ctrl-Home'],[155,'Shift-Ctrl-End']]){h.onpointermove(point(195,422+offset));await flush();assert.equal(w.actions.at(-1).key,key);assert.equal(repeat,null,'Top/Bottom are single jumps, not repeats');const count=w.actions.length;h.onpointermove(point(195,423+offset));await flush();assert.equal(w.actions.length,count)}h.onpointercancel();
  h.style.left='8px';h.style.top='8px';h.onpointerdown(point(30,30));
  for(const [dx,key,period]of[[-9,'Left',700],[-18,'Left',300],[-25,'Home',null]]){h.onpointermove(point(30+dx,30));await flush();assert.equal(w.actions.at(-1).key,key);assert.equal(repeat?.ms??null,period)}h.onpointercancel();assert.equal(d.querySelector('#joystickSpeed').hidden,true);
 }finally{w.close()}
});

test('pressing the outer edge of a joystick never turns neutral movement into an arrow',async()=>{
 const dom=terminal(),w=dom.window,h=w.document.querySelector('#cursorJoystick'),point=x=>({pointerId:73,button:0,isPrimary:true,clientX:x,clientY:422,preventDefault(){}});
 try{h.style.left='2px';h.style.top='400px';h.onpointerdown(point(3));h.onpointermove(point(3));h.onpointermove(point(2.5));await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,0);assert.equal(w.document.querySelector('#joystickSpeed').hidden,true);h.onpointermove(point(2));await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).key,'Left');h.onpointercancel()}finally{w.close()}
});

test('a held joystick stops producing input when its terminal is replaced',async()=>{
 const dom=terminal(),w=dom.window,h=w.document.querySelector('#cursorJoystick');let tick;w.setInterval=fn=>{tick=fn;return 1};w.clearInterval=()=>{};const point=x=>({pointerId:74,button:0,isPrimary:true,clientX:x,clientY:422,preventDefault(){}}),flush=()=>new Promise(r=>w.setTimeout(r,0));
 try{h.style.left='173px';h.style.top='400px';h.onpointerdown(point(195));h.onpointermove(point(215));await flush();assert.equal(w.actions.length,1);w.fixture.otherTerminal();tick();await flush();assert.equal(w.actions.length,1,'Changing terminals must not leave keys repeating into the old terminal');assert.equal(w.document.querySelector('#joystickSpeed').hidden,true)}finally{w.close()}
});

test('terminal pinch and mixed-contact pan work without legacy touch event properties',()=>{
 const dom=terminal(undefined,false),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=d.querySelector('.terminalwrap');
 try{Object.defineProperty(wrap,'clientWidth',{value:390});wrap.style.padding='0';output.style.width='960px';const computed=w.getComputedStyle.bind(w);w.getComputedStyle=e=>e===output?{width:'960px'}:computed(e);output.focus();const send=(type,points)=>wrap.dispatchEvent(new w.TouchEvent(type,{bubbles:true,cancelable:true,touches:points,changedTouches:points})),point=(id,x,y,target=wrap)=>({identifier:id,clientX:x,clientY:y,target});
 send('touchstart',[point(1,100,200),point(2,300,200)]);send('touchmove',[point(1,0,200),point(2,400,200)]);assert.equal(Number.parseFloat(output.parentElement.style.width),1320);send('touchend',[]);
 const width=output.parentElement.style.width;wrap.scrollLeft=100;wrap.scrollTop=100;const held=point(3,60,888,d.querySelector('#cursorJoystick'));send('touchstart',[held,point(4,250,400)]);send('touchmove',[held,point(4,150,100)]);assert.equal(output.parentElement.style.width,width);assert.equal(wrap.scrollLeft,200);assert.equal(wrap.scrollTop,400)
 }finally{w.close()}
});

test('directional steering keeps the keyboard engaged, modifiers and zoom, without moving the control',async()=>{
 for(const mode of ['native','custom']){const dom=terminal({keyboardMode:mode}),w=dom.window,d=w.document,h=d.querySelector('#cursorJoystick'),point=(x,y)=>({pointerId:75,button:0,isPrimary:true,clientX:x,clientY:y,preventDefault(){}});
 try{w.fixture.focusInput();if(mode==='native'){w.visualViewport.height=430;w.fixture.syncViewport();assert.equal(d.activeElement,d.querySelector('.terminal'))}d.querySelector('[data-key="Ctrl"]').click();d.querySelector('[data-key="Ctrl"]').click();const x=Number.parseFloat(h.style.left)+22,y=Number.parseFloat(h.style.top)+22,width=d.querySelector('.terminal').parentElement.style.width,focus=d.activeElement,hidden=d.querySelector('#softwareKeyboard').hidden;h.onpointerdown(point(x,y));h.onpointermove(point(x+20,y));await new Promise(r=>w.setTimeout(r,0));assert.equal(d.querySelector('#softwareKeyboard').hidden,hidden);assert.equal(d.activeElement,focus);w.fixture.syncViewport();assert.equal(d.querySelector('#viewportDock').classList.contains('typing'),true);assert.equal(d.querySelector('[data-key="Ctrl"]').classList.contains('locked'),true);assert.equal(d.querySelector('.terminal').parentElement.style.width,width);assert.equal(Number.parseFloat(h.style.top)+22,y);assert.equal(Number.parseFloat(h.style.left)+22,x);const top=h.style.top,left=h.style.left,count=w.actions.length;w.visualViewport.offsetTop=100;w.fixture.syncViewport();assert.equal(h.style.top,top);assert.equal(h.style.left,left);h.onpointermove(point(x+20,y+100));await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,count,'Viewport origin motion cannot restart a held arrow');h.onpointerup(point(x+20,y+100));assert.equal(d.querySelector('#softwareKeyboard').hidden,hidden);assert.equal(d.activeElement,focus);assert.ok(w.actions.some(a=>a.key==='Ctrl-Right'),'Keeping the keyboard must not prevent arrow delivery')
 }finally{w.close()}}
});

test('joystick committed range attracts the marker toward its center without timing labels',()=>{
 const dom=terminal(),w=dom.window,d=w.document,h=d.querySelector('#cursorJoystick'),point=x=>({pointerId:76,button:0,isPrimary:true,clientX:x,clientY:422,preventDefault(){}});
 try{h.style.left='173px';h.style.top='400px';h.onpointerdown(point(195));h.onpointermove(point(225));const distance=Number(d.querySelector('.speed-marker').style.transform.match(/translate\(([-.\d]+)/)[1]),center=22+102*.2;assert.ok(Math.abs(distance-center)<5,'The marker stays near the committed slow-range center');assert.doesNotMatch(d.querySelector('#joystickSpeed').textContent,/\d[.,]\d|\d+s/);h.onpointercancel()
 }finally{w.close()}
});

test('held arrow repeats do not pull the view back after an independent finger pans',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=output.closest('.terminalwrap'),h=d.querySelector('#cursorJoystick');let repeat;w.setInterval=fn=>{repeat=fn;return 1};w.clearInterval=()=>{};const point=x=>({pointerId:77,button:0,isPrimary:true,clientX:x,clientY:422,preventDefault(){}}),flush=()=>new Promise(r=>w.setTimeout(r,0));
 try{w.fixture.focusInput();h.style.left='173px';h.style.top='400px';h.onpointerdown(point(195));h.onpointermove(point(215));await flush();wrap.scrollLeft=100;wrap.scrollTop=100;const held={identifier:1,target:h,clientX:215,clientY:422},p=(x,y)=>({identifier:2,target:output,clientX:x,clientY:y});for(const [type,x,y]of[['touchstart',250,350],['touchmove',150,200]])wrap.dispatchEvent(new w.TouchEvent(type,{bubbles:true,cancelable:true,touches:[held,p(x,y)],changedTouches:[p(x,y)]}));assert.equal(wrap.scrollTop,250);wrap.getBoundingClientRect=()=>({top:50,bottom:400});output.querySelector('.remote-cursor').getBoundingClientRect=()=>({top:0,bottom:20});repeat();await flush();w.fixture.paintTerminal();assert.equal(wrap.scrollTop,250,'Repeats preserve the explicit reading/pan position');assert.equal(wrap.scrollLeft,200);h.onpointermove(point(245));await flush();w.fixture.paintTerminal();assert.equal(wrap.scrollTop,250,'Changing the held range cannot take scroll ownership back');assert.equal(wrap.scrollLeft,200);h.onpointercancel()
 }finally{w.close()}
});

test('joystick displaced release without pointermove cannot masquerade as a mode-toggle tap',()=>{
 const dom=terminal(),w=dom.window,h=w.document.querySelector('#cursorJoystick'),point=x=>({pointerId:85,button:0,isPrimary:true,clientX:x,clientY:422,preventDefault(){}});
 try{h.style.left='173px';h.style.top='400px';h.onpointerdown(point(195));h.onpointerup(point(295));assert.equal(h.dataset.mode,'character');assert.equal(w.actions.length,0,'A missed-move release must neither toggle nor send an unexpected arrow');h.onpointerdown(point(195));h.onpointerup(point(197));assert.equal(h.dataset.mode,'word','Small tap slop still toggles')}
 finally{w.close()}
});

test('joystick taps persist character or word mode without terminal input or toggling after reposition',async()=>{
 const dom=terminal(),w=dom.window,d=w.document,h=d.querySelector('#cursorJoystick'),point=(x=195,y=422)=>({pointerId:81,button:0,isPrimary:true,clientX:x,clientY:y,preventDefault(){}}),flush=()=>new Promise(r=>w.setTimeout(r,0));
 try{h.style.left='173px';h.style.top='400px';assert.equal(h.getAttribute('aria-pressed'),'false');h.onpointerdown(point());h.onpointerup(point());assert.equal(h.getAttribute('aria-pressed'),'true');assert.equal(h.querySelector('.joystick-mode').textContent,'W');assert.equal(JSON.parse(w.localStorage.getItem('cmux-pocket-customizations')).joystickWordMode,true);assert.equal(w.actions.length,0);
 h.onpointerdown(point());h.onpointermove(point(220));await flush();assert.equal(w.actions.at(-1).key,'Alt-Right');h.onpointerup(point(220));assert.equal(h.getAttribute('aria-pressed'),'true');h.onpointerdown(point());await new Promise(r=>w.setTimeout(r,360));h.onpointermove(point(225,450));h.onpointerup(point(225,450));assert.equal(h.getAttribute('aria-pressed'),'true');assert.equal(w.actions.length,1);assert.equal(JSON.parse(w.localStorage.getItem('cmux-pocket-customizations')).joystickWordMode,true);h.click();assert.equal(h.getAttribute('aria-pressed'),'false','Keyboard activation toggles the same mode')
 }finally{w.close()}
 const restored=terminal({joystickWordMode:true});try{assert.equal(restored.window.document.querySelector('#cursorJoystick').getAttribute('aria-pressed'),'true')}finally{restored.window.close()}
});

test('joystick mode affects horizontal movement only and every outer arm jumps once with current modifiers',async()=>{
 const dom=terminal({joystickWordMode:true}),w=dom.window,d=w.document,h=d.querySelector('#cursorJoystick'),point=(x,y)=>({pointerId:82,button:0,isPrimary:true,clientX:x,clientY:y,preventDefault(){}}),flush=()=>new Promise(r=>w.setTimeout(r,0));let repeat;w.setInterval=(fn,ms)=>{repeat={fn,ms};return 1};w.clearInterval=()=>repeat=null;
 try{h.style.left='173px';h.style.top='400px';d.querySelector('[data-key="Ctrl"]').click();d.querySelector('[data-key="Ctrl"]').click();d.querySelector('[data-key="Shift"]').click();d.querySelector('[data-key="Shift"]').click();
 for(const [dx,dy,key,ms]of[[25,0,'Ctrl-Shift-Alt-Right',700],[95,0,'Ctrl-Shift-Alt-Right',300],[0,-25,'Ctrl-Shift-Up',700],[0,-95,'Ctrl-Shift-Up',300],[-155,0,'Ctrl-Shift-Home',null],[155,0,'Ctrl-Shift-End',null],[0,-155,'Ctrl-Shift-Home',null],[0,155,'Ctrl-Shift-End',null]]){h.onpointerdown(point(195,422));h.onpointermove(point(195+dx,422+dy));await flush();assert.equal(w.actions.at(-1).key,key);assert.equal(repeat?.ms??null,ms);const n=w.actions.length;h.onpointermove(point(195+dx,422+dy));await flush();assert.equal(w.actions.length,n);h.onpointerup(point(195+dx,422+dy))}
 }finally{w.close()}
});

test('joystick detent crossing requires deliberate travel and responds to velocity rather than boundary jitter',async()=>{
 const dom=terminal(),w=dom.window,d=w.document,h=d.querySelector('#cursorJoystick'),point=(offset,timeStamp)=>({pointerId:83,button:0,isPrimary:true,clientX:195+offset,clientY:422,timeStamp,preventDefault(){}}),tier=()=>d.querySelector('#joystickSpeed .active')?.dataset.speed;let cadence;w.setInterval=(fn,ms)=>{cadence=ms;return 1};w.clearInterval=()=>{cadence=null};
 try{h.style.left='173px';h.style.top='400px';h.onpointerdown(point(0,0));h.onpointermove(point(25,50));assert.equal(tier(),'0');for(const [x,t]of[[53,200],[56,220],[54,240],[57,260],[55,280],[58,300]]){h.onpointermove(point(x,t));assert.equal(tier(),'0','Tiny reversals at the boundary must not change cadence');assert.equal(cadence,700)}
 h.onpointermove(point(66,400));assert.equal(tier(),'1','Pushing farther overcomes the detent');assert.equal(cadence,300);h.onpointermove(point(53,420));assert.equal(tier(),'1','A tiny overlap still belongs to the committed fast range');h.onpointermove(point(45,460));assert.equal(tier(),'0');h.onpointercancel();
 h.onpointerdown(point(0,500));h.onpointermove(point(25,550));h.onpointermove(point(50,650));h.onpointermove(point(59,660));assert.equal(tier(),'1','A deliberate quick push crosses nearer the boundary');assert.equal(cadence,300);h.onpointercancel();
 assert.doesNotMatch(d.querySelector('#joystickSpeed').textContent,/\d|Char|Word|Row|Very/);assert.equal(d.querySelectorAll('#joystickSpeed [data-speed]').length,12)
 }finally{w.close()}
});

test('joystick endpoint direction changes update the preview when locked modifiers produce the same key',async()=>{
 const dom=terminal(),w=dom.window,d=w.document,h=d.querySelector('#cursorJoystick'),point=(x,y)=>({pointerId:84,button:0,isPrimary:true,clientX:x,clientY:y,preventDefault(){}}),flush=()=>new Promise(r=>w.setTimeout(r,0));
 try{h.style.left='173px';h.style.top='400px';d.querySelector('[data-key="Ctrl"]').click();d.querySelector('[data-key="Ctrl"]').click();h.onpointerdown(point(195,422));h.onpointermove(point(40,422));await flush();const count=w.actions.length;assert.equal(w.actions.at(-1).key,'Ctrl-Home');h.onpointermove(point(195,267));await flush();assert.equal(w.actions.length,count+1,'Entering another endpoint is a new jump even if modifiers encode the same key');assert.equal(d.querySelector('#joystickSpeed .active').dataset.direction,'Up');assert.equal(h.querySelector('[data-direction].active').dataset.direction,'Up');h.onpointercancel()
 }finally{w.close()}
});
