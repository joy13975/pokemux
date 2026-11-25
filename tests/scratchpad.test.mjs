import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {RenderGrid} from '../grid.mjs';
import {KanaComposer} from '../kana.mjs';
import {installPopover} from './popover-fixture.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function client(saved={},draft='',memory=null){
 const vc=new VirtualConsole();vc.on('jsdomError',error=>{if(error.type==='unhandled-exception')throw error});const dom=new JSDOM(html,{url:'https://scratchpad.invalid',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
 w.localStorage.setItem('cmux-pocket-customizations',JSON.stringify({shortcuts:[],snippets:[],keyboardDefaultVersion:1,keyboardMode:'native',...saved}));w.localStorage.setItem('pokemux-scratchpad',draft);if(memory!==null)w.localStorage.setItem('pokemux-scratchpad-history',memory);
 Object.defineProperties(w.document.documentElement,{clientWidth:{value:428},clientHeight:{value:926}});
 w.ResizeObserver=class{observe(){}disconnect(){}};w.matchMedia=query=>({matches:query!=='(display-mode: standalone)'});w.visualViewport={width:428,height:926,scale:1,offsetTop:0,offsetLeft:0,addEventListener(){}};installPopover(w);w.HTMLElement.prototype.setPointerCapture=()=>{};w.EventSource=class{addEventListener(){}close(){}};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.show=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.requests=[];w.fetch=async(path,options)=>{w.requests.push({path,body:options?.body});return{ok:true,status:200,json:async()=>({})}};w.__RenderGrid=RenderGrid;w.__KanaComposer=KanaComposer;
 const script=html.split('<script type="module">\n')[1].split('</script>')[0];w.eval(script.slice(0,script.lastIndexOf('(async()=>{'))+`RenderGrid=window.__RenderGrid;KanaComposer=window.__KanaComposer;kana=new KanaComposer();current=workspace('owned-workspace','Owned',null,'','',[pane('owned-pane',[surface('owned-surface','Owned')])],'owned-window');workspaces.push(current);connected=true;render();window.fixture={syncDock,syncViewport,syncFloating,displaySettings,focusInput,setConnection,preferences,floatingChoices,switchSurface(){current.panes[0].tabs.push(surface("other-surface","Other terminal"));selectSurface("owned-pane","other-surface")}};`);
 const rail=w.document.querySelector('.inputdock');Object.defineProperty(rail,'offsetHeight',{get:()=>80});w.fixture.syncDock();return dom;
}
const tick=w=>new Promise(r=>w.setTimeout(r,0));
function open(w){w.document.querySelector('#floatingHandle').click();w.document.querySelector('[data-function="4"]').click()}
function enter(w,text){const area=w.document.querySelector('#scratchText');area.focus();area.value=text;area.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));return area}
test('ordinary Scratchpad text paste leaves native insertion enabled and sends nothing to the terminal',async()=>{
 const dom=client(),w=dom.window;
 try{open(w);const area=w.document.querySelector('#scratchText');area.focus();const event=new w.Event('paste',{bubbles:true,cancelable:true});event.clipboardData={files:[],getData:()=> 'Pasted draft 日本語'};assert.equal(area.dispatchEvent(event),true);assert.equal(event.defaultPrevented,false);await tick(w);assert.equal(w.requests.filter(r=>r.path.startsWith('/api/action')||r.path.startsWith('/api/image')).length,0);assert.equal(w.document.activeElement,area)}finally{w.close()}
});

test('fifth scratchpad action preserves existing choices and can be configured',()=>{
 for(const saved of [{},{floatingFunctions:['key:Ctrl-C','recent','paste']},{floatingFunctions:['key:Ctrl-W','key:Tab','paste','keyboard']}]){const dom=client(saved),w=dom.window,d=w.document;try{assert.equal(w.fixture.floatingChoices().length,5);assert.equal(w.fixture.floatingChoices()[4],'scratchpad');if(saved.floatingFunctions)assert.equal(w.fixture.floatingChoices()[0],saved.floatingFunctions[0]);open(w);assert.equal(d.querySelector('#scratchEditor').hidden,false);assert.notEqual(d.activeElement,d.querySelector('#scratchText'));d.querySelector('#scratchGrip').click();w.fixture.displaySettings();const setting=d.querySelector('[data-function-setting="4"]');assert.equal(setting.value,'scratchpad');assert.equal(setting.querySelector('option[value="scratchpad"]').textContent,'Scratchpad')}finally{w.close()}}
});

test('native scratchpad typing, composition and Close stay local, retain selection/draft, and survive refresh',async()=>{
 const dom=client({keyboardMode:'custom',keyboardLanguage:'katakana'}),w=dom.window,d=w.document;let retained;
 try{open(w);const area=enter(w,'Private draft 日本語\nsecond line');area.dispatchEvent(new w.CompositionEvent('compositionstart',{bubbles:true,data:'に'}));area.dispatchEvent(new w.CompositionEvent('compositionend',{bubbles:true,data:'に'}));assert.equal(area.getAttribute('autocorrect'),'on');assert.equal(area.getAttribute('spellcheck'),'true');assert.equal(area.getAttribute('inputmode'),'text');area.setSelectionRange(2,6);d.querySelector('#scratchGrip').click();assert.equal(d.querySelector('#scratchEditor').hidden,true);assert.equal(w.fixture.preferences.keyboardMode,'custom');assert.equal(w.fixture.preferences.keyboardLanguage,'katakana');open(w);assert.equal(area.value,'Private draft 日本語\nsecond line');assert.equal(area.selectionStart,2);assert.equal(area.selectionEnd,6);w.dispatchEvent(new w.Event('pagehide'));retained=w.localStorage.getItem('pokemux-scratchpad-history');await tick(w);assert.equal(w.requests.filter(r=>r.path==='/api/action').length,0);assert.ok(w.requests.every(r=>!r.body?.includes('Private draft')))}finally{w.close()}
 const refreshed=client({},'',retained);try{open(refreshed.window);assert.equal(refreshed.window.document.querySelector('#scratchText').value,'Private draft 日本語\nsecond line')}finally{refreshed.window.close()}
});

test('pulling the Scratchpad grip previews, reverses and commits without discarding the draft',()=>{
 const dom=client({},'Keep this draft'),w=dom.window,d=w.document;
 try{
  const grip=d.querySelector('#scratchGrip'),editor=d.querySelector('#scratchEditor');
  assert.ok(grip,'Scratchpad has a pull handle');
  assert.equal(d.querySelector('#scratchClose'),null);
  Object.defineProperty(editor,'offsetHeight',{get:()=>editor.hidden?0:68});
  const event=y=>({button:0,isPrimary:true,pointerId:1,clientX:150,clientY:y,preventDefault(){}});
  assert.equal(editor.hidden,true);
  grip.onpointerdown(event(870));grip.onpointermove(event(820));
  assert.equal(editor.hidden,false);
  assert.notEqual(d.activeElement,d.querySelector('#scratchText'));
  grip.onpointermove(event(868));grip.onpointerup(event(868));
  assert.equal(editor.hidden,true);
  grip.onpointerdown(event(870));grip.onpointerup(event(820));
  assert.equal(grip.getAttribute('aria-expanded'),'true');
  assert.notEqual(d.activeElement,d.querySelector('#scratchText'));
  grip.onpointerdown(event(800));grip.onpointermove(event(848));grip.onpointercancel(event(848));
  assert.equal(editor.hidden,false);
  grip.onpointerdown(event(800));grip.onpointermove(event(848));grip.onpointerup(event(848));
  assert.equal(editor.hidden,true);
  grip.click();
  assert.equal(d.querySelector('#scratchText').value,'Keep this draft');
 }finally{w.close()}
});

test('both dock handles toggle independently without opening or moving the keyboard',()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{
  const rail=d.querySelector('.inputdock'),shortcut=rail.querySelector('.shortcut-grip'),scratch=d.querySelector('#scratchGrip'),editor=d.querySelector('#scratchEditor'),terminal=d.querySelector('.terminal');
  assert.notEqual(w.getComputedStyle(rail).display,'none','The shortcuts handle is present without the keyboard');
  const initial=d.activeElement;
  shortcut.click();
  assert.equal(shortcut.getAttribute('aria-expanded'),'true');
  scratch.click();
  assert.equal(editor.hidden,false);
  assert.equal(d.activeElement,initial);
  assert.equal(rail.hidden,false);
  w.fixture.focusInput();Object.assign(w.visualViewport,{height:450});w.fixture.syncViewport();
  shortcut.click();
  assert.equal(shortcut.getAttribute('aria-expanded'),'false');
  assert.equal(editor.hidden,false);
  assert.equal(d.activeElement,terminal);
  scratch.click();
  assert.equal(editor.hidden,true);
  assert.equal(d.activeElement,terminal);
 }finally{w.close()}
});

test('the dock keyboard toggle opens the terminal or the open Scratchpad and can dismiss either',()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{
  const toggle=d.querySelector('#dockKeyboard'),terminal=d.querySelector('.terminal'),scratch=d.querySelector('#scratchGrip'),editor=d.querySelector('#scratchText');
  assert.ok(toggle&&!toggle.hidden&&!toggle.disabled);
  toggle.click();
  assert.equal(d.activeElement,terminal);
  Object.assign(w.visualViewport,{height:450});w.fixture.syncViewport();
  assert.equal(toggle.getAttribute('aria-pressed'),'true');
  toggle.click();
  assert.notEqual(d.activeElement,terminal);
  Object.assign(w.visualViewport,{height:926});w.fixture.syncViewport();
  scratch.click();
  assert.notEqual(d.activeElement,editor);
  toggle.click();
  assert.equal(d.activeElement,editor);
  Object.assign(w.visualViewport,{height:450});w.fixture.syncViewport();
  toggle.click();
  assert.notEqual(d.activeElement,editor);
  assert.equal(scratch.getAttribute('aria-expanded'),'true');
 }finally{w.close()}
});

test('Settings persists a reassigned Scratchpad action and dispatches it after reload',()=>{
 const dom=client(),w=dom.window,d=w.document;let saved;
 try{w.fixture.displaySettings();const setting=d.querySelector('[data-function-setting="0"]');setting.value='scratchpad';setting.dispatchEvent(new w.Event('change',{bubbles:true}));d.querySelector('#dialog').close();w.fixture.displaySettings();assert.equal(d.querySelector('[data-function-setting="0"]').value,'scratchpad');saved=JSON.parse(w.localStorage.getItem('cmux-pocket-customizations'))}finally{w.close()}
 const refreshed=client(saved);try{const d=refreshed.window.document;d.querySelector('#floatingHandle').click();d.querySelector('[data-function="0"]').click();assert.equal(d.querySelector('#scratchEditor').hidden,false);assert.notEqual(d.activeElement,d.querySelector('#scratchText'))}finally{refreshed.window.close()}
});

test('pulling the compact Scratchpad past the threshold maximizes it until pulled back down',()=>{
 const dom=client({keyboardMode:'custom'},'Keep editing'),w=dom.window,d=w.document;
 try{
  open(w);
  const grip=d.querySelector('#scratchGrip'),pad=d.querySelector('#scratchpad'),area=d.querySelector('#scratchText');
  area.focus();
  const event=y=>({button:0,isPrimary:true,pointerId:1,clientX:150,clientY:y,preventDefault(){}});
  grip.onpointerdown(event(820));grip.onpointermove(event(760));grip.onpointerup(event(800));
  assert.equal(pad.classList.contains('expanded'),false,'Pulling back below the threshold cancels the resize');
  const touch=(type,y)=>grip.dispatchEvent(new w.TouchEvent(type,{changedTouches:[{identifier:0,target:grip,clientX:150,clientY:y}],cancelable:true}));
  grip.onpointerdown({...event(820),pointerType:'touch'});
  touch('touchstart',820);
  grip.onpointerup({...event(804),pointerType:'touch'});
  touch('touchend',820);
  assert.equal(d.querySelector('#scratchEditor').hidden,false,'A short pull with stale touchend coordinates does not stow the editor');
  grip.onpointerdown(event(820));grip.onpointerup(event(765));
  assert.equal(pad.classList.contains('expanded'),true);
  assert.equal(d.querySelector('[data-scratch-resize]').getAttribute('aria-label'),'Shrink scratchpad');
  for(const [height,scale,top]of [[926,1,0],[440,1,0],[220,2,42]]){
   Object.assign(w.visualViewport,{height,scale,offsetTop:top});w.fixture.syncDock();
   const layer=d.querySelector('#scratchLayer');
   assert.equal(parseFloat(layer.style.getPropertyValue('--scratch-space')),height*scale);
   assert.ok(layer.style.transform.includes(`translate(0px,${top}px) scale(${1/scale})`));
   assert.equal(d.querySelector('#softwareKeyboard').hidden,true);
  }
  grip.onpointerdown(event(60));grip.onpointerup(event(90));
  assert.equal(pad.classList.contains('expanded'),false);
  assert.equal(d.querySelector('#scratchEditor').hidden,false);
  assert.equal(d.activeElement,area);
  assert.equal(area.value,'Keep editing');
  grip.onclick({detail:0});
  assert.equal(d.querySelector('#scratchEditor').hidden,true);
 }finally{w.close()}
});

test('holding Send expands an empty Scratchpad and shrinking preserves a selected draft',async()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{
  open(w);
  const area=d.querySelector('#scratchText'),pad=d.querySelector('#scratchpad'),send=d.querySelector('#scratchSend'),choices=d.querySelector('#scratchSendChoices');
  assert.equal(d.querySelector('#scratchExpand'),null);
  area.focus();
  const point={button:0,isPrimary:true,pointerId:1,clientX:0,clientY:10,preventDefault(){}};
  const resize=()=>choices.querySelector('[data-scratch-resize]');
  d.elementFromPoint=()=>resize();
  const chooseResize=async()=>{
   send.onpointerdown(point);
   await new Promise(resolve=>w.setTimeout(resolve,380));
   assert.equal(choices.hidden,false);
   send.onpointerup(point);
  };
  await chooseResize();
  assert.equal(pad.classList.contains('expanded'),true);
  assert.equal(resize().getAttribute('aria-label'),'Shrink scratchpad');
  enter(w,'Keep editing');area.setSelectionRange(0,4);
  await chooseResize();
  assert.equal(pad.classList.contains('expanded'),false);
  assert.equal(resize().getAttribute('aria-label'),'Expand scratchpad');
  assert.equal(d.activeElement,area);
  assert.equal(area.value,'Keep editing');
  assert.deepEqual([area.selectionStart,area.selectionEnd],[0,4]);
  assert.equal(w.requests.filter(r=>r.path==='/api/action').length,0);
 }finally{w.close()}
});

test('Backspace at a collapsed Scratchpad caret at zero goes directly to the active terminal',async()=>{
 const dom=client({},'Local draft'),w=dom.window,d=w.document;
 try{
  open(w);const area=d.querySelector('#scratchText');area.focus();area.setSelectionRange(0,0);
  const deletion=()=>new w.InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true});
  const first=deletion();area.dispatchEvent(first);
  assert.equal(first.defaultPrevented,true);
  await tick(w);
  w.fixture.switchSurface();area.focus();area.setSelectionRange(0,0);
  const key=new w.KeyboardEvent('keydown',{key:'Backspace',bubbles:true,cancelable:true});area.dispatchEvent(key);
  assert.equal(key.defaultPrevented,true);
  await tick(w);
  assert.deepEqual(w.requests.filter(r=>r.path==='/api/action').map(r=>JSON.parse(r.body)),[
   {action:'key',workspace_id:'owned-workspace',surface_id:'owned-surface',key:'Backspace'},
   {action:'key',workspace_id:'owned-workspace',surface_id:'other-surface',key:'Backspace'}
  ]);
  for(const [start,end,composing] of [[1,1,false],[0,4,false],[0,0,true]]){
   area.setSelectionRange(start,end);
   const event=new w.InputEvent('beforeinput',{inputType:'deleteContentBackward',isComposing:composing,bubbles:true,cancelable:true});
   area.dispatchEvent(event);assert.equal(event.defaultPrevented,false);
  }
  assert.equal(area.value,'Local draft');
  assert.equal(d.activeElement,area);
  assert.equal(d.querySelector('#scratchEditor').hidden,false);
 }finally{w.close()}
});

test('all five expanded floating actions remain distinct and inside the keyboard viewport at each corner',()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{Object.assign(w.visualViewport,{height:300});for(const position of [[0,0],[1,0],[0,1],[1,1]]){w.fixture.preferences.floatingPosition=position;w.fixture.syncFloating();const control=d.querySelector('#floatingFunctions'),cx=parseFloat(control.style.left)+22,cy=parseFloat(control.style.top)+22,boxes=[...control.querySelectorAll('[data-function]')].map(b=>({x:cx+parseFloat(b.style.left),y:cy+parseFloat(b.style.top)}));for(const box of boxes){assert.ok(box.x>=48&&box.x<=428-48);assert.ok(box.y>=22&&box.y<=300-22)}for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(Math.abs(boxes[i].x-boxes[j].x)>=96||Math.abs(boxes[i].y-boxes[j].y)>=44)} }finally{w.close()}
});

test('Send pastes the complete draft into the active tab then presses Enter',async()=>{const dom=client({},'Draft 日本語');const w=dom.window,d=w.document;try{w.fixture.switchSurface();open(w);d.querySelector('#scratchText').focus();const button=d.querySelector('#scratchSend');assert.ok(button,'Scratchpad needs Send');assert.equal(button.disabled,false);button.click();await tick(w);const actions=w.requests.filter(r=>r.path==='/api/action').map(r=>JSON.parse(r.body));assert.deepEqual(actions,[{action:'paste',workspace_id:'owned-workspace',surface_id:'other-surface',text:'Draft 日本語'},{action:'key',workspace_id:'owned-workspace',surface_id:'other-surface',key:'Enter'}]);assert.equal(d.querySelector('#scratchEditor').hidden,false);assert.equal(d.activeElement,d.querySelector('#scratchText'));assert.equal(d.querySelector('#scratchText').value,'');assert.equal(d.querySelector('[data-scratch-send="enter"]').disabled,true);enter(w,'Retained');w.fixture.setConnection(false);assert.equal(d.querySelector('[data-scratch-send="enter"]').disabled,true);button.click();await tick(w);assert.equal(w.requests.filter(r=>r.path==='/api/action').length,2);assert.equal(d.querySelector('#scratchText').value,'Retained')}finally{w.close()}});

test('Close hands an open native keyboard directly from the composer to the terminal',()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{
  open(w);d.querySelector('#scratchText').focus();
  Object.assign(w.visualViewport,{height:450});w.fixture.syncViewport();
  const area=d.querySelector('#scratchText'),terminal=d.querySelector('.terminal');
  let previousFocus;
  const focus=terminal.focus.bind(terminal);
  terminal.focus=options=>{previousFocus=d.activeElement;focus(options)};
  d.querySelector('#scratchGrip').click();
  assert.equal(previousFocus,area);
  assert.equal(d.activeElement,terminal);
  assert.equal(terminal.getAttribute('contenteditable'),'plaintext-only');
 }finally{w.close()}
});


test('holding Send can cancel or deliver the draft without Return',async()=>{
 const dom=client({},'Saved draft'),w=dom.window,d=w.document;
 try{
  open(w);d.querySelector('#scratchText').focus();const button=d.querySelector('#scratchSend'),choices=d.querySelector('#scratchSendChoices');
  const point=x=>({button:0,isPrimary:true,pointerId:1,clientX:x,clientY:10,preventDefault(){}});
  const hold=async()=>{button.onpointerdown(point(0));await new Promise(r=>w.setTimeout(r,380));assert.equal(choices.hidden,false)};
  d.elementFromPoint=x=>x===50?choices.querySelector('[data-scratch-send="paste"]'):d.body;
  await hold();button.onpointerup(point(99));await tick(w);
  assert.equal(d.querySelector('#scratchText').value,'Saved draft');assert.equal(w.requests.filter(r=>r.path==='/api/action').length,0);
  await hold();button.onpointerup(point(50));await tick(w);
  assert.deepEqual(w.requests.filter(r=>r.path==='/api/action').map(r=>JSON.parse(r.body).action),['paste']);
  assert.equal(d.querySelector('#scratchText').value,'');assert.equal(d.activeElement,d.querySelector('#scratchText'));
 }finally{w.close()}
});


test('Scratchpad remembers nine recent messages and the current draft in a ten-slot FIFO',async()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{
  open(w);const previous=()=>d.querySelector('[data-scratch-history="-1"]'),next=()=>d.querySelector('[data-scratch-history="1"]');assert.ok(previous(),'The Send hold menu has Prev scratch');assert.ok(next(),'The Send hold menu has Next scratch');
  for(let n=1;n<=12;n++){enter(w,'Message '+n);d.querySelector('#scratchSend').click();await tick(w)}
  const draft=enter(w,'Unsent current draft');
  for(let n=12;n>=4;n--){assert.equal(previous().disabled,false);previous().click();assert.equal(draft.value,'Message '+n)}
  assert.equal(previous().disabled,true);for(let n=5;n<=12;n++){next().click();assert.equal(draft.value,'Message '+n)}next().click();assert.equal(draft.value,'Unsent current draft');assert.equal(next().disabled,true);assert.equal(d.activeElement,draft);
 }finally{w.close()}
});

test('holding empty Send can navigate Scratchpad history without sending or changing keyboard focus',async()=>{
 const dom=client({},'Sent message'),w=dom.window,d=w.document;
 try{
  open(w);const area=d.querySelector('#scratchText'),button=d.querySelector('#scratchSend'),choices=d.querySelector('#scratchSendChoices');area.focus();button.click();await tick(w);const delivered=w.requests.length;assert.equal(area.value,'');assert.equal(button.disabled,false);
  const previous=choices.querySelector('[data-scratch-history="-1"]');assert.ok(previous);d.elementFromPoint=()=>previous;const point={button:0,isPrimary:true,pointerId:1,clientX:10,clientY:10,preventDefault(){}};button.onpointerdown(point);await new Promise(r=>w.setTimeout(r,380));assert.equal(choices.hidden,false);button.onpointerup(point);assert.equal(area.value,'Sent message');assert.equal(d.activeElement,area);choices.querySelector('[data-scratch-history="1"]').click();assert.equal(area.value,'');assert.equal(w.requests.length,delivered);assert.equal(d.activeElement,area);
 }finally{w.close()}
});

test('Scratchpad migrates literal legacy text and persists navigation plus the unsent draft across reload',async()=>{
 const legacy='["literal JSON draft"]',dom=client({},legacy),w=dom.window,d=w.document;let memory;
 try{open(w);assert.equal(d.querySelector('#scratchText').value,legacy);d.querySelector('#scratchSend').click();await tick(w);enter(w,'Keep unsent');const previous=d.querySelector('[data-scratch-history="-1"]');assert.ok(previous);previous.click();w.dispatchEvent(new w.Event('pagehide'));memory=w.localStorage.getItem('pokemux-scratchpad-history')}finally{w.close()}
 const restored=client({},'',memory);try{const d=restored.window.document;assert.equal(d.querySelector('#scratchText').value,legacy);d.querySelector('[data-scratch-history="1"]').click();assert.equal(d.querySelector('#scratchText').value,'Keep unsent')}finally{restored.window.close()}
});

test('Scratchpad records successful delivery while preserving edits typed during send, and does not record failed sends',async()=>{
 for(const succeeds of [true,false]){
  const dom=client({},'Submitted message'),w=dom.window,d=w.document;let complete;const fetch=w.fetch;
  w.fetch=(path,options)=>path==='/api/action'&&JSON.parse(options.body).action==='paste'?new Promise(resolve=>complete=()=>resolve({ok:succeeds,status:succeeds?200:502,json:async()=>succeeds?{}:{error:'Failed delivery'}})):fetch(path,options);
  try{open(w);d.querySelector('#scratchSend').click();await tick(w);enter(w,'New draft during send');complete();await tick(w);await tick(w);const previous=d.querySelector('[data-scratch-history="-1"]');assert.ok(previous);assert.equal(d.querySelector('#scratchText').value,'New draft during send');assert.equal(previous.disabled,!succeeds);if(succeeds){previous.click();assert.equal(d.querySelector('#scratchText').value,'Submitted message')}}finally{w.close()}
 }
});
