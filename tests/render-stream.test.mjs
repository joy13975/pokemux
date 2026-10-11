import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { application } from '../server.mjs';
import { JSDOM } from 'jsdom';
import { RenderGrid } from '../grid.mjs';
import { KanaComposer } from '../kana.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function client(){
 const dom=new JSDOM(html,{url:'https://pokemux-test.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
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
 const fixture=workspace('owned-workspace','Owned',null,'','',[pane('owned-pane',[surface('owned-surface','Owned')])],'owned-window');workspaces.push(fixture);current=fixture;selectedWindow=fixture.window;connected=true;terminalTyping=true;render();
 window.fixture={subscribeTerminal,sendTerminal,typingAction,syncDock,get connected(){return connected},frame(revision,text){return{format:'cmux.render-grid.v1',render_epoch:'owned',render_revision:revision,full:true,rows:2,columns:20,row_spans:[{row:0,column:0,text}],cursor:{row:0,column:text.length,visible:true,style:'block'}}}};
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
test('closed EventSource can reopen the same selected surface',()=>{const dom=client(),w=dom.window;try{w.streams[0].close();w.fixture.subscribeTerminal();assert.equal(w.streams.length,2)}finally{w.close()}});
test('Powerline prompt symbols have an explicit licensed browser font',()=>{
 const font=readFileSync(new URL('../vendor/powerline/PowerlineSymbols.otf',import.meta.url));assert.equal(font.subarray(0,4).toString(),'OTTO');assert.ok(font.length>2000);const tables=Array.from({length:font.readUInt16BE(4)},(_,i)=>12+i*16),entry=tables.find(offset=>font.toString('ascii',offset,offset+4)==='cmap'),cmap=font.readUInt32BE(entry+8),subtable=cmap+font.readUInt32BE(cmap+8),count=font.readUInt16BE(subtable+6)/2,end=subtable+14,start=end+count*2+2,delta=start+count*2;for(const codepoint of [0xe0a0,0xe0a1,0xe0a2,0xe0b0,0xe0b1,0xe0b2,0xe0b3]){const index=Array.from({length:count},(_,i)=>i).find(i=>codepoint>=font.readUInt16BE(start+i*2)&&codepoint<=font.readUInt16BE(end+i*2));assert.notEqual(index,undefined);assert.notEqual((codepoint+font.readInt16BE(delta+index*2))&65535,0,'Prompt symbol must map to an actual glyph')}assert.match(html,/@font-face\{font-family:PokemuxPowerline/);assert.match(html,/unicode-range:U\+E0A0-E0A2,U\+E0B0-E0B3/);assert.match(readFileSync(new URL('../vendor/powerline/LICENSE',import.meta.url),'utf8'),/Permission is hereby granted/);
 const dom=new JSDOM('<pre></pre>'),grid=new RenderGrid();try{grid.apply({format:'cmux.render-grid.v1',render_epoch:'glyph',render_revision:1,full:true,rows:1,columns:8,row_spans:[{row:0,column:0,text:'\ue0a0\ue0b0\ue0b1\ue0b2\ue0b3',cell_width:5}],cursor:{row:0,column:5,visible:true,style:'bar'}});grid.paint(dom.window.document.querySelector('pre'));assert.equal(dom.window.document.querySelector('pre').textContent,'\ue0a0\ue0b0\ue0b1\ue0b2\ue0b3\n');assert.equal(dom.window.document.querySelector('.remote-cursor').style.left,'5ch')}finally{dom.window.close()}
});

test('bundled Powerline font is served as a same-origin font asset',async()=>{
 const auth={origin:'http://127.0.0.1',session(){return{authenticated:true}}},server=application({bridge:new EventEmitter(),auth});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));auth.origin=`http://127.0.0.1:${server.address().port}`;try{const response=await fetch(auth.origin+'/vendor/powerline/PowerlineSymbols.otf');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'font/otf');assert.deepEqual(Buffer.from(await response.arrayBuffer()),readFileSync(new URL('../vendor/powerline/PowerlineSymbols.otf',import.meta.url)))}finally{await new Promise(resolve=>server.close(resolve))}
});
