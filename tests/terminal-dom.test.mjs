import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { RenderGrid } from '../grid.mjs';
import { KanaComposer } from '../kana.mjs';
import { installPopover } from './popover-fixture.mjs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function terminal(saved) {
  const dom = new JSDOM(html, { url: 'https://pokemux-test.invalid', runScripts: 'outside-only', pretendToBeVisual: true }), w = dom.window;
  w.localStorage.setItem("cmux-pocket-customizations",JSON.stringify({shortcuts:[],snippets:[],keyboardMode:"native",...saved}));
  w.resizeObservers=[];w.ResizeObserver = class { constructor(callback){this.callback=callback;this.targets=new Set();w.resizeObservers.push(this)} observe(target){this.targets.add(target)} disconnect(){this.targets.clear()} };
  installPopover(w);w.HTMLElement.prototype.setPointerCapture=()=>{};
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
    render();window.fixture={otherTerminal(){fixture.panes[0].tabs.push(surface('owned-surface-two','Other terminal'));const other=new RenderGrid();other.apply(initialFrame);grids.set('owned-surface-two',other);selectSurface('owned-pane','owned-surface-two')},metadata(name){fixture.name='Directory changed';if(name)fixture.panes[0].tabs[0].name=name;render()},model,paintTerminal,syncViewport,caretToEnd,focusInput};
  `);
  return dom;
}
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
    d.querySelector('#dialog [data-key="Tab"]').click();await new Promise(r=>w.setTimeout(r,0));
    assert.equal(w.actions.length,1);assert.equal(w.actions[0].key,'Tab');
  } finally {w.close()}
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

test('terminal pinch is local and Zoom Toggle switches full grid and readable typing size',()=>{
 const dom=terminal(),w=dom.window,d=w.document,output=d.querySelector('.terminal'),wrap=d.querySelector('.terminalwrap');
 try{
  w.HTMLElement.prototype.setPointerCapture=()=>{};
  Object.defineProperty(wrap,'clientWidth',{value:390});wrap.style.padding='0';output.style.width='960px';
  const computed=w.getComputedStyle.bind(w);w.getComputedStyle=e=>e===output?{width:'960px'}:computed(e);
  output.focus();
  const touch=(type,points)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{touches:points.map(([clientX,clientY])=>({clientX,clientY}))});wrap.dispatchEvent(e)};
  touch('touchstart',[[100,200],[300,200]]);touch('touchmove',[[0,200],[400,200]]);touch('touchend',[]);
  assert.equal(parseFloat(output.parentElement.style.width),1320,'Pinch must enlarge terminal content, rather than the browser page');
  d.querySelector('[data-function="0"]').click();assert.equal(parseFloat(output.parentElement.style.width),390);d.querySelector('[data-function="0"]').click();assert.equal(parseFloat(output.parentElement.style.width),720);assert.equal(w.visualViewport.scale,1);
  output.focus();Object.assign(w.visualViewport,{height:430});w.fixture.syncViewport();touch('touchstart',[[100,200],[300,200]]);touch('touchmove',[[0,200],[400,200]]);touch('touchend',[]);Object.assign(w.visualViewport,{height:844});w.fixture.syncViewport();assert.equal(parseFloat(output.parentElement.style.width),720,'Closing keyboard must restore readable size after manual pinch');
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
 d.querySelector('[data-key="Ctrl"]').click();handle.onpointerdown(event(x,y));handle.onpointermove(event(x+25,y));await new Promise(r=>w.setTimeout(r,190));
 assert.ok(w.actions.length>=2,'A held deflection must repeat without release');assert.ok(w.actions.every(a=>a.key==='Ctrl-Right'));
 handle.onpointermove(event(x+80,y));await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).key,'Ctrl-Alt-Right');
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

function keyboardPointer(w,button,type,id=1){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:id,button:0,isPrimary:id===1,clientX:20,clientY:20});button.dispatchEvent(e)}
function keyboardTap(w,value,id=1){const b=w.document.querySelector(`[data-typing-key="${value}"]`);assert.ok(b,`Keyboard key ${value} exists`);keyboardPointer(w,b,'pointerdown',id);keyboardPointer(w,b,'pointerup',id);b.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));}
test('custom keyboard owns typing without a native editor; dismissal and one tap reopen it',async()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.HTMLElement.prototype.setPointerCapture=()=>{};w.fixture.focusInput();
  assert.equal(d.querySelector('.terminal').getAttribute('contenteditable'),'false');assert.equal(d.querySelector('#softwareKeyboard').hidden,false);assert.equal(w.getSelection().toString(),'');
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
  gesture(d.querySelector('.terminalwrap'),[300,120],[80,120]);await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.length,0);assert.equal(d.querySelector('#dialog').open,false);
  for(const [from,to] of [[[80,22],[300,22]],[[300,22],[80,22]]]){gesture(d.querySelector('.workspacehead'),from,to);assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),false)}d.querySelector('#sidebarToggle').click();assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),true);d.querySelector('#scrim').click();
  gesture(d.querySelector('.inputdock'),[180,700],[180,600]);assert.equal(d.querySelector('#dialog').open,true);assert.equal(d.querySelector('#dialogTitle').textContent,'Shortcuts');assert.equal(d.querySelector('#dialog').parentElement.id,'viewportDock');assert.equal(w.actions.length,0);
 }finally{w.close()}
});
test('custom keyboard reopens with one terminal tap after pinch without stale gesture suppression',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;
 try{
  w.HTMLElement.prototype.setPointerCapture=()=>{};w.fixture.focusInput();keyboardTap(w,'Dismiss');const wrap=d.querySelector('.terminalwrap');Object.defineProperty(wrap,'clientWidth',{value:390});
  const pinch=new w.Event('touchstart',{cancelable:true});pinch.touches=[{clientX:80,clientY:120},{clientX:200,clientY:120}];wrap.dispatchEvent(pinch);const end=new w.Event('touchend',{cancelable:true});end.touches=[];wrap.dispatchEvent(end);
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
  assert.equal(d.querySelector('#dialog').open,true);assert.ok(d.querySelector('#tabRename'));assert.equal(d.querySelector('#tabLeft').disabled,true);assert.equal(d.querySelector('#tabRight').disabled,false);d.querySelector('#tabRight').click();
  assert.deepEqual([...d.querySelectorAll('.surfacetab')].map(b=>b.dataset.surface),['owned-surface-two','owned-surface']);assert.equal(d.querySelector('.surfacetab.active').dataset.surface,'owned-surface-two');
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
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;try{w.fixture.focusInput();const keyboard=d.querySelector('#softwareKeyboard'),focused=d.activeElement,height=d.documentElement.style.getPropertyValue('--dock-height');keyboardTap(w,'Language');const popover=d.querySelector('#languagePopover');assert.ok(popover);assert.equal(w.getComputedStyle(popover).left,'0px','The normalized popover layer starts at the viewport origin');assert.equal(w.getComputedStyle(popover).top,'0px');assert.equal(popover.dataset.testPopover,'open');assert.equal(d.querySelector('#dialog').open,false);assert.equal(keyboard.hidden,false);assert.equal(d.documentElement.style.getPropertyValue('--dock-height'),height);assert.equal(d.activeElement,focused);assert.equal(popover.querySelectorAll('button').length,4);const output=d.querySelector('.terminal');keyboardPointer(w,output,'pointerdown');keyboardPointer(w,output,'pointerup');assert.equal(popover.dataset.testPopover,'closed');keyboardTap(w,'Language');d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(popover.dataset.testPopover,'closed');await new Promise(resolve=>w.setTimeout(resolve,0));assert.equal(w.actions.length,0,'Closing the language chooser must not send Escape to the terminal');keyboardTap(w,'Language');d.querySelector('#languageHiragana').click();assert.equal(popover.dataset.testPopover,'closed');assert.equal(keyboard.hidden,false);keyboardTap(w,'Language');assert.equal(d.querySelector('#languageHiragana').getAttribute('aria-pressed'),'true')}finally{w.close()}
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

test('Shift and Caps Lock use distinct shared SVG symbols while preserving accessible states',()=>{
 const dom=terminal({keyboardMode:'custom'}),w=dom.window,d=w.document;try{w.fixture.focusInput();const shift=d.querySelector('[data-typing-key="Shift"]'),shortcut=d.querySelector('[data-key="Shift"]'),symbol=button=>button.querySelector('svg use')?.getAttribute('href');assert.ok(symbol(shift),'Shift has a vector icon');assert.equal(symbol(shift),symbol(shortcut),'The keyboard and shortcuts share one Shift symbol');const normal=symbol(shift);assert.ok(d.querySelector(normal).querySelector('path'));assert.equal(shift.getAttribute('aria-label'),'Shift');keyboardTap(w,'Shift');assert.equal(shift.getAttribute('aria-pressed'),'true');assert.equal(symbol(shift),normal);keyboardTap(w,'Shift');assert.equal(shift.getAttribute('aria-label'),'Caps Lock');assert.equal(shift.getAttribute('aria-pressed'),'true');assert.notEqual(symbol(shift),normal);assert.ok(d.querySelector(symbol(shift)).querySelector('path'));keyboardTap(w,'Shift');assert.equal(shift.getAttribute('aria-label'),'Shift');assert.equal(shift.getAttribute('aria-pressed'),'false');assert.equal(symbol(shift),normal)}finally{w.close()}
});

test('far joystick deflection uses directional word navigation and highlights only its direction',async()=>{
 const dom=terminal(),w=dom.window,d=w.document,handle=d.querySelector('#cursorJoystick');
 const point=(x,y)=>({pointerId:7,button:0,isPrimary:true,clientX:x,clientY:y,preventDefault(){}});
 try{
  const x=parseFloat(handle.style.left)+22,y=parseFloat(handle.style.top)+22;
  for(const [dx,direction] of [[-80,'Left'],[80,'Right']]){
   handle.onpointerdown(point(x,y));handle.onpointermove(point(x+dx,y));await new Promise(r=>w.setTimeout(r,0));
   assert.equal(w.actions.at(-1).key,'Alt-'+direction,'Word movement must remain a directional key, not a printable letter whose Alt encoding varies by Mac layout');
   const active=[...handle.querySelectorAll('.word-ticks.active')];assert.equal(active.length,1);assert.equal(active[0].dataset.wordDirection,direction);
   const inactive=handle.querySelector(`.word-ticks[data-word-direction="${direction==='Left'?'Right':'Left'}"]`);assert.equal(w.getComputedStyle(inactive).display,'none');
   handle.onpointerup(point(x+dx,y));assert.equal(handle.querySelectorAll('.word-ticks.active').length,0);
  }
  d.querySelector('[data-key="Ctrl"]').click();d.querySelector('[data-key="Alt"]').click();d.querySelector('[data-key="Shift"]').click();
  handle.onpointerdown(point(x,y));handle.onpointermove(point(x-80,y));await new Promise(r=>w.setTimeout(r,0));assert.equal(w.actions.at(-1).key,'Ctrl-Alt-Shift-Left');handle.onpointerup(point(x-80,y));
 }finally{w.close()}
});

test('word navigation preview lights only the deflected side and resets on cancel',async()=>{
 const dom=terminal(),w=dom.window,handle=w.document.querySelector('#cursorJoystick');
 const x=parseFloat(handle.style.left)+22,y=parseFloat(handle.style.top)+22,point=(dx)=>({pointerId:8,button:0,isPrimary:true,clientX:x+dx,clientY:y,preventDefault(){}});
 try{handle.onpointerdown(point(0));handle.onpointermove(point(-80));await new Promise(r=>w.setTimeout(r,0));const word=[...handle.querySelectorAll('.word-ticks.active')];assert.equal(word.length,1,'A word preview must identify one side');assert.equal(word[0].dataset.wordDirection,'Left');handle.onpointercancel();assert.equal(handle.querySelectorAll('.word-ticks.active').length,0)}finally{w.close()}
});
