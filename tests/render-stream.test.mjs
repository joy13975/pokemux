import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { application } from '../server.mjs';
import { JSDOM } from 'jsdom';
import { RenderGrid } from '../grid.mjs';
import { KanaComposer } from '../kana.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function client(initialKind='terminal'){
 const dom=new JSDOM(html,{url:'https://pokemux-test.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem("cmux-pocket-customizations",JSON.stringify({shortcuts:[],snippets:[],keyboardMode:"custom",keyboardDefaultVersion:1}));
 w.ResizeObserver=class{observe(){}disconnect(){}};w.HTMLElement.prototype.setPointerCapture=()=>{};w.matchMedia=()=>({matches:true});
 w.visualViewport={width:428,height:926,scale:1,offsetTop:0,offsetLeft:0,addEventListener(){}};
 w.HTMLDialogElement.prototype.showModal=w.HTMLDialogElement.prototype.show=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.streams=[];w.EventSource=class{static CONNECTING=0;static OPEN=1;static CLOSED=2;constructor(){this.readyState=0;this.listeners=new Map();w.streams.push(this)}addEventListener(name,fn){this.listeners.set(name,fn)}close(){this.closed=true;this.readyState=2}emit(name,data){this.listeners.get(name)?.({data:JSON.stringify(data)})}};
 w.__RenderGrid=RenderGrid;w.__KanaComposer=KanaComposer;w.actions=[];w.failInput=false;
 w.fetch=async(path,options)=>{if(path==='/api/action'){w.actions.push(JSON.parse(options.body));if(w.failInput)throw new Error('Network request failed')};return{ok:true,status:200,json:async()=>({authenticated:true})}};
 const script=html.split('<script type="module">\n')[1].split('</script>')[0];
 w.eval(script.slice(0,script.lastIndexOf('(async()=>{'))+`
 RenderGrid=window.__RenderGrid;KanaComposer=window.__KanaComposer;kana=new KanaComposer();
 const fixture=workspace('owned-workspace','Owned',null,'','',[pane('owned-pane',[surface('owned-surface','Owned',${JSON.stringify(initialKind)})])],'owned-window');workspaces.push(fixture);current=fixture;selectedWindow=fixture.window;connected=true;terminalTyping=true;render();
 window.fixture={switchSurface(){const p=activePane();p.tabs.push(surface('other-surface','Other'));selectSurface(p.id,'other-surface')},subscribeTerminal,sendTerminal,typingAction,syncDock,get connected(){return connected},frame(revision,text){return{format:'cmux.render-grid.v1',render_epoch:'owned',render_revision:revision,full:true,rows:2,columns:20,row_spans:[{row:0,column:0,text}],cursor:{row:0,column:text.length,visible:true,style:'block'}}}};
 `);
 return dom;
}
const tick=w=>new Promise(resolve=>w.setTimeout(resolve,0));
test('disconnection preserves keyboard, rail, navigation and local controls while stopping terminal delivery',async()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{const stream=w.streams[0];stream.onerror();await tick(w);w.fixture.syncDock();assert.equal(d.querySelector('#softwareKeyboard').hidden,false);assert.equal(d.querySelector('#viewportDock').classList.contains('typing'),true);d.querySelector('#sidebarToggle').click();assert.equal(d.querySelector('#shell').classList.contains('sidebar-open'),true);d.querySelector('#scrim').click();d.querySelector('#appActions').click();d.querySelector('#menuKeyboard').click();assert.equal(d.querySelector('#dialog').open,true);d.querySelector('#dialogClose').click();w.fixture.typingAction('a');assert.equal(w.actions.length,0);w.fixture.typingAction('123');assert.equal(d.querySelector('[data-typing-layer="numbers"]').hidden,false);w.fixture.typingAction('Dismiss');assert.equal(d.querySelector('#softwareKeyboard').hidden,true);const wrap=d.querySelector('.terminalwrap');for(const type of ['pointerdown','pointerup']){const event=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:1,button:0,isPrimary:true,clientX:40,clientY:90});wrap.dispatchEvent(event)}assert.equal(d.querySelector('#softwareKeyboard').hidden,false,'Offline UI must still let a tap reopen its local keyboard')}finally{w.close()}
});
test('failed input reconnects the authoritative stream without replaying queued keys',async()=>{
 const dom=client(),w=dom.window;
 try{const stream=w.streams[0];w.failInput=true;w.fixture.sendTerminal('input','a');w.fixture.sendTerminal('input','b');await tick(w);assert.equal(stream.closed,true);assert.equal(w.streams.length,2);assert.equal(w.actions.length,1);const replacement=w.streams[1];replacement.readyState=1;replacement.onopen();assert.equal(w.fixture.connected,true)}finally{w.close()}
});
test('foreground resume replaces interrupted transport once and paints a fresh complete snapshot',async()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{const first=w.streams[0];first.readyState=1;first.onopen();first.emit('terminal.render_grid',w.fixture.frame(1,'before'));Object.defineProperty(d,'hidden',{configurable:true,value:true});d.dispatchEvent(new w.Event('visibilitychange'));assert.equal(first.closed,undefined,'App must not voluntarily close on app switching');first.readyState=0;first.onerror();Object.defineProperty(d,'hidden',{configurable:true,value:false});d.dispatchEvent(new w.Event('visibilitychange'));assert.equal(w.streams.length,2);d.dispatchEvent(new w.Event('visibilitychange'));assert.equal(w.streams.length,2,'Repeated resume events must not replace a new pending connection');const second=w.streams[1];second.readyState=1;second.onopen();d.dispatchEvent(new w.Event('visibilitychange'));assert.equal(w.streams.length,2);second.emit('terminal.render_grid',w.fixture.frame(2,'after'));assert.ok(d.querySelector('.terminal').textContent.includes('after'));assert.ok(!d.querySelector('.terminal').textContent.includes('before'));first.onerror();await tick(w);assert.equal(w.fixture.connected,true,'Superseded transport cannot change active state')}finally{w.close()}
});
function phoneClient(){
 const dom=client(),w=dom.window,d=w.document;
 Object.defineProperties(w.screen,{width:{value:428},height:{value:926}});
 const wrap=d.querySelector('.terminalwrap');
 wrap.style.padding='0';wrap.querySelector('.terminal').style.fontSize='16px';
 Object.defineProperties(wrap,{clientWidth:{value:428},clientHeight:{value:810}});
 const computedStyle=w.getComputedStyle.bind(w);
 w.getComputedStyle=element=>element.classList.contains('terminal-row')?{height:'24px'}:computedStyle(element);
 return dom;
}

function startPhoneStream(w){
 const stream=w.streams[0];
 stream.readyState=1;stream.onopen();stream.emit('terminal.render_grid',w.fixture.frame(1,'ready'));
}
const viewportActions=w=>w.actions.filter(action=>action.action==='viewport');

test('returning to the phone app claims mobile sizing again after a release',async()=>{
 const dom=phoneClient(),w=dom.window,d=w.document;
 try{
  const viewport=()=>viewportActions(w);
  startPhoneStream(w);
  await tick(w);
  assert.equal(viewport().at(-1)?.claim,true,'Opening the phone view requests phone sizing');
  d.querySelector('#appActions').click();
  const toggle=d.querySelector('#menuPhoneFit');
  assert.equal(toggle.textContent,'Release phone sizing');
  toggle.click();
  await tick(w);
  assert.equal(viewport().at(-1)?.clear,true);
  const before=viewport().length;
  Object.defineProperty(d,'hidden',{configurable:true,value:true});d.dispatchEvent(new w.Event('visibilitychange'));
  assert.equal(viewport().length,before,'The hidden view must not reclaim the terminal');
  Object.defineProperty(d,'hidden',{configurable:true,value:false});d.dispatchEvent(new w.Event('visibilitychange'));
  w.dispatchEvent(new w.Event('focus'));
  await tick(w);
  const resumed=viewport().slice(before);
  assert.equal(resumed.length,1,'Visibility and focus describe the same app activation');
  assert.equal(resumed[0].claim,true,'The new foreground view requests ownership of phone sizing');
 }finally{w.close()}
});

test('a resumed phone holds its mobile frame while cmux restores the phone size',async()=>{
 const dom=phoneClient(),w=dom.window,d=w.document;
 try{
  const fetch=w.fetch;
  w.fetch=async(path,options)=>{
   const response=await fetch(path,options);
   if(path==='/api/action'&&JSON.parse(options.body).action==='viewport')return {...response,json:async()=>({columns:52,rows:42})};
   return response;
  };
  const stream=w.streams[0],terminal=d.querySelector('.terminal');
  const frame=(revision,text,columns,rows)=>({...w.fixture.frame(revision,text),columns,rows,active_screen:'alternate'});
  stream.readyState=1;stream.onopen();
  stream.emit('terminal.render_grid',frame(1,'phone before',52,42));
  await tick(w);
  Object.defineProperty(d,'hidden',{configurable:true,value:true});d.dispatchEvent(new w.Event('visibilitychange'));
  stream.emit('terminal.render_grid',frame(2,'desktop',99,35));
  Object.defineProperty(d,'hidden',{configurable:true,value:false});d.dispatchEvent(new w.Event('visibilitychange'));
  await tick(w);
  assert.ok(terminal.textContent.includes('phone before'),'A desktop frame must not replace the visible phone grid during resume');
  stream.emit('terminal.render_grid',frame(3,'phone after',52,42));
  assert.ok(terminal.textContent.includes('phone after'),'The fresh mobile-sized frame replaces the retained frame');
  stream.emit('terminal.render_grid',frame(4,'desktop again',99,35));
  d.querySelector('#appActions').click();d.querySelector('#menuPhoneFit').click();
  assert.ok(terminal.textContent.includes('desktop again'),'Explicit release shows the latest desktop frame');
 }finally{w.close()}
});

test('a slow viewport transition retries the phone sizing claim',async()=>{
 const dom=phoneClient(),w=dom.window;
 try{
  const now=w.Date.now.bind(w.Date),fetch=w.fetch;
  let delayed=false;
  w.fetch=async(path,options)=>{
   const response=await fetch(path,options);
   if(path==='/api/action'&&JSON.parse(options.body).action==='viewport'&&!delayed){
    delayed=true;
    w.Date.now=()=>now()+5000;
    return {...response,json:async()=>({pending:true})};
   }
   return response;
  };
  startPhoneStream(w);
  await tick(w);
  assert.equal(delayed,true,'The initial phone claim reached cmux');
  assert.ok(viewportActions(w).every(action=>!action.clear),'A pending resize must not release the claim after a slow response');
  const deadline=Date.now()+4000;
  while(viewportActions(w).length<2&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,40));
  assert.equal(viewportActions(w)[1]?.claim,true,'The phone retries its claim without another activation');
 }finally{w.close()}
});

test('an unavailable sizing bridge is retried without releasing the phone viewport',async()=>{
 const dom=phoneClient(),w=dom.window;
 try{
  const fetch=w.fetch;
  let first=true;
  w.fetch=async(path,options)=>{
   const response=await fetch(path,options);
   if(path==='/api/action'&&JSON.parse(options.body).action==='viewport'&&first){
    first=false;
    return {ok:false,status:502,json:async()=>{throw new w.SyntaxError('Temporary proxy response')}};
   }
   return response;
  };
  startPhoneStream(w);
  await tick(w);
  assert.ok(viewportActions(w).every(action=>!action.clear),'A failed proxy response must not clear phone sizing');
  const deadline=Date.now()+4000;
  while(viewportActions(w).length<2&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,40));
  assert.equal(viewportActions(w)[1]?.claim,true,'The original phone claim is retried when the bridge is available again');
 }finally{w.close()}
});

test('closed EventSource can reopen the same selected surface',()=>{const dom=client(),w=dom.window;try{w.streams[0].close();w.fixture.subscribeTerminal();assert.equal(w.streams.length,2)}finally{w.close()}});
test('Powerline prompt symbols have an explicit licensed browser font',()=>{
 const font=readFileSync(new URL('../vendor/powerline/PowerlineSymbols.otf',import.meta.url));const tables=Array.from({length:font.readUInt16BE(4)},(_,i)=>12+i*16),entry=tables.find(offset=>font.toString('ascii',offset,offset+4)==='cmap'),cmap=font.readUInt32BE(entry+8),subtable=cmap+font.readUInt32BE(cmap+8),count=font.readUInt16BE(subtable+6)/2,end=subtable+14,start=end+count*2+2,delta=start+count*2;for(const codepoint of [0xe0a0,0xe0a1,0xe0a2,0xe0b0,0xe0b1,0xe0b2,0xe0b3]){const index=Array.from({length:count},(_,i)=>i).find(i=>codepoint>=font.readUInt16BE(start+i*2)&&codepoint<=font.readUInt16BE(end+i*2));assert.notEqual(index,undefined);assert.notEqual((codepoint+font.readInt16BE(delta+index*2))&65535,0,'Prompt symbol must map to an actual glyph')}
 const dom=new JSDOM('<pre></pre>'),grid=new RenderGrid();try{grid.apply({format:'cmux.render-grid.v1',render_epoch:'glyph',render_revision:1,full:true,rows:1,columns:8,row_spans:[{row:0,column:0,text:'\ue0a0\ue0b0\ue0b1\ue0b2\ue0b3',cell_width:5}],cursor:{row:0,column:5,visible:true,style:'bar'}});grid.paint(dom.window.document.querySelector('pre'));assert.equal(dom.window.document.querySelector('pre').textContent,'\ue0a0\ue0b0\ue0b1\ue0b2\ue0b3\n');assert.equal(dom.window.document.querySelector('.remote-cursor').style.left,'5ch')}finally{dom.window.close()}
});

test('bundled Powerline font is served as a same-origin font asset',async()=>{
 const auth={origin:'http://127.0.0.1',session(){return{authenticated:true}}},server=application({bridge:new EventEmitter(),auth});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));auth.origin=`http://127.0.0.1:${server.address().port}`;try{const response=await fetch(auth.origin+'/vendor/powerline/PowerlineSymbols.otf');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'font/otf');assert.deepEqual(Buffer.from(await response.arrayBuffer()),readFileSync(new URL('../vendor/powerline/PowerlineSymbols.otf',import.meta.url)))}finally{await new Promise(resolve=>server.close(resolve))}
});

test('fast stream recovery cannot release terminal actions queued before the interruption',async()=>{
 const dom=client(),w=dom.window;try{const Base=w.EventSource;w.EventSource=class extends Base{constructor(...args){super(...args);w.queueMicrotask(()=>{w.failInput=false;this.readyState=1;this.onopen()})}};w.failInput=true;w.fixture.sendTerminal('input','a');w.fixture.sendTerminal('input','b');await tick(w);assert.equal(w.fixture.connected,true);assert.equal(w.actions.length,1,'Unsent pre-interruption input must not leak across reconnection');w.fixture.sendTerminal('input','c');await tick(w);assert.deepEqual(w.actions.map(a=>a.text),['a','c'])}finally{w.close()}
});

test('reopening the stream clears a disconnected banner created during a tab/workspace render',async()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{const stream=w.streams[0];stream.onerror();await tick(w);w.fixture.switchSurface();assert.equal(d.querySelector('.notice').hidden,false);const replacement=w.streams.at(-1);replacement.readyState=1;replacement.onopen();assert.equal(d.querySelector('.notice').hidden,true);assert.equal(d.querySelector('[data-key="Tab"]').disabled,false);w.fixture.sendTerminal('input','q');await tick(w);assert.equal(w.actions.at(-1).text,'q')}finally{w.close()}
});

test('terminal symbol font is served and contains monochrome record, stop and pause glyphs',async()=>{
 const auth={origin:'http://127.0.0.1',session(){return{authenticated:true}}},server=application({bridge:new EventEmitter(),auth});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));auth.origin=`http://127.0.0.1:${server.address().port}`;
 try{
  const response=await fetch(auth.origin+'/vendor/symbols/NotoSansSymbols2-Regular.ttf');assert.equal(response.status,200);
  const font=Buffer.from(await response.arrayBuffer()),tables=new Map(Array.from({length:font.readUInt16BE(4)},(_,i)=>{const at=12+i*16;return[font.toString('ascii',at,at+4),font.readUInt32BE(at+8)]}));
  for(const table of ['COLR','CBDT','sbix','SVG '])assert.equal(tables.has(table),false,'Terminal symbols must not use color glyphs');
  const cmap=tables.get('cmap'),offsets=Array.from({length:font.readUInt16BE(cmap+2)},(_,i)=>cmap+font.readUInt32BE(cmap+4+i*8+4)),sub=offsets.find(at=>font.readUInt16BE(at)===12);assert.notEqual(sub,undefined);
  const groups=Array.from({length:font.readUInt32BE(sub+12)},(_,i)=>{const at=sub+16+i*12;return[font.readUInt32BE(at),font.readUInt32BE(at+4),font.readUInt32BE(at+8)]});
  for(const cp of [0x23fa,0x23f8,0x23f9,0x26a0]){const group=groups.find(([start,end])=>cp>=start&&cp<=end);assert.ok(group,`Missing terminal symbol ${cp.toString(16)}`);assert.ok(group[2]+cp-group[0]>0)}
 }finally{await new Promise(resolve=>server.close(resolve))}
});

test('landing on a browser tab renders its preview without binding a nonexistent shortcut grip',()=>{const dom=client('browser');try{assert.ok(dom.window.document.querySelector('.browserpreview'));assert.equal(dom.window.document.querySelector('.shortcut-grip'),null);assert.ok(dom.window.document.querySelector('#sidebarToggle'));assert.ok(dom.window.document.querySelector('#appActions'));const w=dom.window,errors=[];w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault()});const wrap=w.document.querySelector('.terminalwrap');w.document.elementFromPoint=()=>wrap;const event=new w.Event('touchstart',{bubbles:true,cancelable:true});const contacts=[{identifier:1,clientX:40,clientY:90,target:wrap}];Object.defineProperties(event,{touches:{value:contacts},changedTouches:{value:contacts}});wrap.dispatchEvent(event);assert.equal(errors.length,0,errors.map(e=>e?.stack||String(e)).join("\n"));assert.equal(w.actions.length,0)}finally{dom.window.close()}});

test('browser preview disables terminal floating actions for taps and drag selection',()=>{const dom=client('browser'),w=dom.window,d=w.document;try{d.querySelector('#floatingHandle').click();for(const i of [0,1,2,4]){const b=d.querySelector(`[data-function="${i}"]`);assert.equal(b.disabled,true);b.click()}const handle=d.querySelector('#floatingHandle'),control=d.querySelector('#floatingFunctions'),zoom=d.querySelector('[data-function="0"]'),x=parseFloat(control.style.left)+22,y=parseFloat(control.style.top)+22,point=(clientX,clientY)=>({pointerId:1,button:0,isPrimary:true,clientX,clientY,preventDefault(){}});handle.onpointerdown(point(x,y));handle.onpointermove(point(x+parseFloat(zoom.style.left),y+parseFloat(zoom.style.top)));assert.equal(zoom.getAttribute('aria-pressed'),'false');handle.onpointerup(point(x+parseFloat(zoom.style.left),y+parseFloat(zoom.style.top)));assert.equal(w.actions.length,0);assert.equal(d.querySelector('#scratchEditor').hidden,true)}finally{w.close()}});
