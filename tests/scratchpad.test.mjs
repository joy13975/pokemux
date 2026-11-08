import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {RenderGrid} from '../grid.mjs';
import {KanaComposer} from '../kana.mjs';
import {installPopover} from './popover-fixture.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function client(saved={},draft=''){
 const vc=new VirtualConsole();vc.on('jsdomError',error=>{if(error.type==='unhandled-exception')throw error});const dom=new JSDOM(html,{url:'https://scratchpad.invalid',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
 w.localStorage.setItem('cmux-pocket-customizations',JSON.stringify({shortcuts:[],snippets:[],keyboardDefaultVersion:1,keyboardMode:'native',...saved}));w.localStorage.setItem('pokemux-scratchpad',draft);
 Object.defineProperties(w.document.documentElement,{clientWidth:{value:428},clientHeight:{value:926}});
 w.ResizeObserver=class{observe(){}disconnect(){}};w.matchMedia=query=>({matches:query!=='(display-mode: standalone)'});w.visualViewport={width:428,height:926,scale:1,offsetTop:0,offsetLeft:0,addEventListener(){}};installPopover(w);w.HTMLElement.prototype.setPointerCapture=()=>{};w.EventSource=class{addEventListener(){}close(){}};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.show=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.requests=[];w.fetch=async(path,options)=>{w.requests.push({path,body:options?.body});return{ok:true,status:200,json:async()=>({})}};w.__RenderGrid=RenderGrid;w.__KanaComposer=KanaComposer;
 const script=html.split('<script type="module">\n')[1].split('</script>')[0];w.eval(script.slice(0,script.lastIndexOf('(async()=>{'))+`RenderGrid=window.__RenderGrid;KanaComposer=window.__KanaComposer;kana=new KanaComposer();current=workspace('owned-workspace','Owned',null,'','',[pane('owned-pane',[surface('owned-surface','Owned')])],'owned-window');workspaces.push(current);connected=true;render();window.fixture={syncDock,syncViewport,syncFloating,displaySettings,focusInput,setConnection,preferences,floatingChoices,switchSurface(){current.panes[0].tabs.push(surface("other-surface","Other terminal"));selectSurface("owned-pane","other-surface")}};`);
 const rail=w.document.querySelector('.inputdock');Object.defineProperty(rail,'offsetHeight',{get:()=>80});w.fixture.syncDock();return dom;
}
const tick=w=>new Promise(r=>w.setTimeout(r,0));
function open(w){w.document.querySelector('#floatingHandle').click();w.document.querySelector('[data-function="4"]').click()}
function enter(w,text){const area=w.document.querySelector('#scratchText');area.value=text;area.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));return area}

test('fifth scratchpad action preserves existing choices and can be configured',()=>{
 for(const saved of [{},{floatingFunctions:['key:Ctrl-C','recent','paste']},{floatingFunctions:['key:Ctrl-W','key:Tab','paste','keyboard']}]){const dom=client(saved),w=dom.window,d=w.document;try{assert.equal(w.fixture.floatingChoices().length,5);assert.equal(w.fixture.floatingChoices()[4],'scratchpad');if(saved.floatingFunctions)assert.equal(w.fixture.floatingChoices()[0],saved.floatingFunctions[0]);open(w);assert.equal(d.querySelector('#scratchEditor').hidden,false);assert.equal(d.activeElement,d.querySelector('#scratchText'));d.querySelector('#scratchGrip').click();w.fixture.displaySettings();const setting=d.querySelector('[data-function-setting="4"]');assert.equal(setting.value,'scratchpad');assert.equal(setting.querySelector('option[value="scratchpad"]').textContent,'Scratchpad')}finally{w.close()}}
});

test('native scratchpad typing, composition and Close stay local, retain selection/draft, and survive refresh',async()=>{
 const dom=client({keyboardMode:'custom',keyboardLanguage:'katakana'}),w=dom.window,d=w.document;let retained;
 try{open(w);const area=enter(w,'Private draft 日本語\nsecond line');area.dispatchEvent(new w.CompositionEvent('compositionstart',{bubbles:true,data:'に'}));area.dispatchEvent(new w.CompositionEvent('compositionend',{bubbles:true,data:'に'}));assert.equal(area.getAttribute('autocorrect'),'on');assert.equal(area.getAttribute('spellcheck'),'true');assert.equal(area.getAttribute('inputmode'),'text');area.setSelectionRange(2,6);d.querySelector('#scratchGrip').click();assert.equal(d.querySelector('#scratchEditor').hidden,true);assert.equal(w.fixture.preferences.keyboardMode,'custom');assert.equal(w.fixture.preferences.keyboardLanguage,'katakana');open(w);assert.equal(area.value,'Private draft 日本語\nsecond line');assert.equal(area.selectionStart,2);assert.equal(area.selectionEnd,6);w.dispatchEvent(new w.Event('pagehide'));retained=w.localStorage.getItem('pokemux-scratchpad');await tick(w);assert.equal(w.requests.filter(r=>r.path==='/api/action').length,0);assert.ok(w.requests.every(r=>!r.body?.includes('Private draft')))}finally{w.close()}
 const refreshed=client({},retained);try{open(refreshed.window);assert.equal(refreshed.window.document.querySelector('#scratchText').value,retained)}finally{refreshed.window.close()}
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
  assert.equal(d.activeElement,d.querySelector('#scratchText'));
  grip.onpointerdown(event(800));grip.onpointermove(event(848));grip.onpointercancel(event(848));
  assert.equal(editor.hidden,false);
  grip.onpointerdown(event(800));grip.onpointermove(event(848));grip.onpointerup(event(848));
  assert.equal(editor.hidden,true);
  grip.click();
  assert.equal(d.querySelector('#scratchText').value,'Keep this draft');
 }finally{w.close()}
});

test('opening the composer folds shortcuts and closing restores them',()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{
  const rail=d.querySelector('.inputdock');
  assert.equal(rail.hidden,false);
  open(w);
  assert.equal(rail.hidden,true);
  assert.equal(d.querySelector('#floatingLayer').hidden,false);
  assert.equal(d.querySelector('#cursorJoystick').hidden,false);
  assert.equal(d.querySelector('#scratchCopy'),null);
  d.querySelector('#scratchGrip').click();
  assert.equal(rail.hidden,false);
 }finally{w.close()}
});

test('Settings persists a reassigned Scratchpad action and dispatches it after reload',()=>{
 const dom=client(),w=dom.window,d=w.document;let saved;
 try{w.fixture.displaySettings();const setting=d.querySelector('[data-function-setting="0"]');setting.value='scratchpad';setting.dispatchEvent(new w.Event('change',{bubbles:true}));d.querySelector('#dialog').close();w.fixture.displaySettings();assert.equal(d.querySelector('[data-function-setting="0"]').value,'scratchpad');saved=JSON.parse(w.localStorage.getItem('cmux-pocket-customizations'))}finally{w.close()}
 const refreshed=client(saved);try{const d=refreshed.window.document;d.querySelector('#floatingHandle').click();d.querySelector('[data-function="0"]').click();assert.equal(d.querySelector('#scratchEditor').hidden,false);assert.equal(d.activeElement,d.querySelector('#scratchText'))}finally{refreshed.window.close()}
});

test('pulling the compact Scratchpad past the threshold maximizes it until pulled back down',()=>{
 const dom=client({keyboardMode:'custom'},'Keep editing'),w=dom.window,d=w.document;
 try{
  open(w);
  const grip=d.querySelector('#scratchGrip'),pad=d.querySelector('#scratchpad'),area=d.querySelector('#scratchText');
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
  assert.equal(d.querySelector('#scratchExpand'),null);
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

test('all five expanded floating actions remain distinct and inside the keyboard viewport at each corner',()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{Object.assign(w.visualViewport,{height:300});for(const position of [[0,0],[1,0],[0,1],[1,1]]){w.fixture.preferences.floatingPosition=position;w.fixture.syncFloating();const control=d.querySelector('#floatingFunctions'),cx=parseFloat(control.style.left)+22,cy=parseFloat(control.style.top)+22,boxes=[...control.querySelectorAll('[data-function]')].map(b=>({x:cx+parseFloat(b.style.left),y:cy+parseFloat(b.style.top)}));for(const box of boxes){assert.ok(box.x>=48&&box.x<=428-48);assert.ok(box.y>=22&&box.y<=300-22)}for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(Math.abs(boxes[i].x-boxes[j].x)>=96||Math.abs(boxes[i].y-boxes[j].y)>=44)} }finally{w.close()}
});

test('Send pastes the complete draft into the active tab then presses Enter',async()=>{const dom=client({},'Draft 日本語');const w=dom.window,d=w.document;try{w.fixture.switchSurface();open(w);const button=d.querySelector('#scratchSend');assert.ok(button,'Scratchpad needs Send');assert.equal(button.disabled,false);button.click();await tick(w);const actions=w.requests.filter(r=>r.path==='/api/action').map(r=>JSON.parse(r.body));assert.deepEqual(actions,[{action:'paste',workspace_id:'owned-workspace',surface_id:'other-surface',text:'Draft 日本語'},{action:'key',workspace_id:'owned-workspace',surface_id:'other-surface',key:'Enter'}]);assert.equal(d.querySelector('#scratchEditor').hidden,false);assert.equal(d.activeElement,d.querySelector('#scratchText'));assert.equal(d.querySelector('#scratchText').value,'');assert.equal(w.localStorage.getItem('pokemux-scratchpad'),'');assert.equal(button.disabled,true);enter(w,'Retained');w.fixture.setConnection(false);assert.equal(button.disabled,true);button.click();await tick(w);assert.equal(w.requests.filter(r=>r.path==='/api/action').length,2);assert.equal(d.querySelector('#scratchText').value,'Retained')}finally{w.close()}});

test('Close hands an open native keyboard directly from the composer to the terminal',()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{
  open(w);
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
  open(w);const button=d.querySelector('#scratchSend'),choices=d.querySelector('#scratchSendChoices');
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
