import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { DesktopPointer, DesktopView, bindDesktopInput } from '../desktop.mjs';
const sensitivity=()=>({pan:1,pinch:1});

test('desktop trackpad moves a visible pointer; a tap clicks there without focusing the keyboard',()=>{
 const sent=[],views=[],pointer=new DesktopPointer({sensitivity,send:e=>sent.push(e),view:v=>views.push(v)});
 pointer.resize(1000,600,500,300);pointer.down(1,100,100,0);pointer.move(1,150,120,100);pointer.move(1,155,125,650);pointer.up(1,155,125,700);
 assert.equal(sent.filter(e=>e.type==='buttonDown').length,0);assert.ok(sent.some(e=>e.type==='pointerMove'));
 const position=views.at(-1).pointer;assert.ok(position.x>.5&&position.y>.5);
 pointer.down(2,150,120,300);pointer.up(2,150,120,340);
 assert.deepEqual(sent.slice(-2).map(e=>e.type),['buttonDown','buttonUp']);assert.equal(sent.at(-1).x,position.x);assert.equal(sent.at(-1).y,position.y);
});

test('two fingers scroll or pinch locally; cancelled dragging releases the Mac mouse',async()=>{
 const sent=[],views=[],p=new DesktopPointer({sensitivity,send:e=>sent.push(e),view:v=>views.push(v)});p.resize(1000,600,500,300);
 p.down(1,100,100,0);p.down(2,200,100,5);p.move(1,100,140,100);p.move(2,200,140,105);p.up(1,100,140,150);p.up(2,200,140,155);
 assert.ok(sent.some(e=>e.type==='wheel'));assert.equal(sent.filter(e=>e.type==='buttonDown').length,0);
 sent.length=0;p.down(3,100,100,300);p.down(4,200,100,305);p.move(4,280,100,400);p.up(3,100,100,450);p.up(4,280,100,455);
 assert.ok(views.at(-1).zoom>1);assert.equal(sent.filter(e=>e.type==='wheel').length,0);
 p.down(5,100,100,600);p.move(5,120,100,1200);assert.ok(sent.some(e=>e.type==='buttonDown'));p.cancel();assert.equal(sent.at(-1).type,'releaseAll');
 p.down(6,100,100,1500);await new Promise(r=>setTimeout(r,700));assert.equal(views.at(-1).holding,true);p.down(7,200,100,2300);p.up(6,100,100,2400);p.up(7,200,100,2405);assert.equal(views.at(-1).holding,false);
});

test('native desktop input sends composed Unicode, deletion and paste once without treating touches as keyboard activation',()=>{
 const dom=new JSDOM('<textarea></textarea>'),w=dom.window,input=w.document.querySelector('textarea'),texts=[],keys=[];
 bindDesktopInput(input,{text:t=>texts.push(t),key:k=>keys.push(k)});
 assert.ok(input.value.length>0&&input.selectionStart>0,'iOS needs a preceding character to generate native Backspace');
 input.dispatchEvent(new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:'é'}));
 input.dispatchEvent(new w.CompositionEvent('compositionstart',{data:''}));input.dispatchEvent(new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertCompositionText',data:'に'}));input.dispatchEvent(new w.CompositionEvent('compositionend',{data:'日本'}));
 input.dispatchEvent(new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'deleteContentBackward'}));
 const paste=new w.Event('paste',{bubbles:true,cancelable:true});paste.clipboardData={getData:()=> 'phone paste'};input.dispatchEvent(paste);
 assert.deepEqual(texts,['é','日本','phone paste']);assert.deepEqual(keys,['Backspace']);assert.notEqual(w.document.activeElement,input);dom.window.close();
});

test('lifting one finger after a pinch immediately returns to pointer panning',()=>{
 const sent=[],p=new DesktopPointer({sensitivity,send:event=>sent.push(event),view:()=>{}});p.resize(1000,600,500,300);
 p.down(1,100,100,0);p.down(2,200,100,5);p.move(2,280,100,100);p.up(2,280,100,120);
 const before=p.x;sent.length=0;p.move(1,150,100,800);p.up(1,150,100,850);
 assert.ok(p.x>before);assert.ok(sent.some(event=>event.type==='pointerMove'));assert.equal(sent.some(event=>event.type==='buttonDown'),false);
});

test('desktop stage preserves remaining pointer contacts and native input focus',()=>{
 const dom=new JSDOM('<div></div><canvas></canvas><textarea></textarea><svg></svg><p></p>'),document=globalThis.document,observer=globalThis.ResizeObserver;globalThis.document=dom.window.document;globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 let viewer;
 try{const d=dom.window.document,stage=d.querySelector('div');stage.setPointerCapture=()=>{};viewer=new DesktopView({sensitivity,stage,canvas:d.querySelector('canvas'),input:d.querySelector('textarea'),cursor:d.querySelector('svg'),status:d.querySelector('p'),text:()=>{},key:()=>{},state:()=>{}});viewer.pointer.resize(1000,600,500,300);
  const event=(pointerId,x,timeStamp)=>({pointerId,clientX:x,clientY:100,timeStamp,pointerType:'touch',preventDefault(){}});stage.onpointerdown(event(1,100,0));stage.onpointerdown(event(2,200,5));stage.onpointermove(event(2,280,100));stage.onpointerup(event(2,280,120));stage.onlostpointercapture(event(2,280,120));const before=viewer.pointer.x;stage.onpointermove(event(1,150,150));assert.ok(viewer.pointer.x>before);
  viewer.input.focus();const click=new dom.window.MouseEvent('mousedown',{bubbles:true,cancelable:true});stage.dispatchEvent(click);assert.equal(click.defaultPrevented,true);assert.equal(d.activeElement,viewer.input);
 }finally{viewer?.destroy();globalThis.document=document;globalThis.ResizeObserver=observer;dom.window.close()}
});

test('zoomed desktop follows a centered pointer until a desktop edge constrains panning',()=>{
 let view;const p=new DesktopPointer({sensitivity,send:()=>{},view:value=>{view=value}});p.resize(1000,600,500,300);p.zoom=2;p.paint();
 p.down(1,100,100,0);p.move(1,150,120,100);p.up(1,150,120,120);
 assert.ok(Math.abs(view.left+p.x*view.width-250)<1e-10);assert.ok(Math.abs(view.top+p.y*view.height-150)<1e-10);
 p.down(2,150,120,200);p.move(2,900,120,300);p.up(2,900,120,320);
 assert.equal(p.x,1);assert.equal(view.left+view.width,500);assert.equal(view.left+p.x*view.width,500);
});

test('pan and pinch sensitivities change gesture response independently',()=>{
 let pan=1,pinch=1;const p=new DesktopPointer({sensitivity:()=>({pan,pinch}),send:()=>{},view:()=>{}});p.resize(1000,600,500,300);
 const move=()=>{p.x=.5;p.down(1,100,100,0);p.move(1,150,100,100);p.up(1,150,100,120);return p.x-.5};const base=move();pan=2;assert.ok(Math.abs(move()/base-2)<1e-10);
 const zoom=()=>{p.zoom=1;p.paint();p.down(1,100,100,0);p.down(2,200,100,0);p.move(2,250,100,100);p.up(1,100,100,120);p.up(2,250,100,120);return p.zoom};const normal=zoom();pinch=2;assert.ok(zoom()>normal);pan=.5;assert.equal(zoom(),normal**2);
});

test('desktop emits input using the stream protocol rather than a control-session sequence',async()=>{
 const {DesktopView}=await import('../desktop.mjs'),{parseHeader,MESSAGE_TYPES}=await import('screen-relay/protocol');let wire;
 const viewer={ready:true,generation:7,socket:{readyState:WebSocket.OPEN,send:value=>{wire=value}}};
 assert.equal(DesktopView.prototype.emit.call(viewer,{type:'keyDown',key:40}),true);
 const header=parseHeader(wire);assert.equal(header.type,MESSAGE_TYPES.input);assert.equal(header.generation,viewer.generation);assert.equal(header.sequence,0);
});

test('existing Ctrl-K shortcut notation does not introduce an unintended Shift press',async()=>{
 const {DesktopView}=await import('../desktop.mjs'),{HID_KEYS}=await import('screen-relay/protocol'),events=[],socket={};
 const viewer={ready:true,socket,queue:Promise.resolve(),emit:e=>events.push(e),message:message=>{throw Error(message)}};
 assert.equal(await DesktopView.prototype.send.call(viewer,'key','Ctrl+K'),true);
 assert.deepEqual(events.filter(e=>e.type==='keyDown').map(e=>e.key),[HID_KEYS.ControlLeft,HID_KEYS.KeyK]);
});

test('a second nearby touch tap right-clicks; a later tap or a drag does not become a right click',()=>{
 const sent=[],p=new DesktopPointer({sensitivity,send:e=>sent.push(e),view:()=>{}});p.resize(1000,600,500,300);
 p.down(1,100,100,0);p.up(1,100,100,40);p.down(2,103,102,160);p.up(2,103,102,200);assert.deepEqual(sent.filter(e=>e.type==='buttonDown').map(e=>e.button),[1,3]);
 p.down(3,103,102,900);p.up(3,103,102,940);assert.equal(sent.filter(e=>e.type==='buttonDown').at(-1).button,1);
 p.down(4,103,102,1000);p.move(4,150,102,1050);p.up(4,150,102,1100);p.down(5,150,102,1150);p.up(5,150,102,1200);assert.equal(sent.filter(e=>e.type==='buttonDown').at(-1).button,1);
 p.down(6,150,102,1250);p.cancel();p.down(7,150,102,1350);p.up(7,150,102,1400);assert.equal(sent.filter(e=>e.type==='buttonDown').at(-1).button,1);
});

test('closely spaced parallel fingers scroll despite staggered pointer events instead of being mistaken for a pinch',()=>{
 const sent=[],p=new DesktopPointer({sensitivity,send:e=>sent.push(e),view:()=>{}});p.resize(1000,600,500,300);
 p.down(1,100,100,0);p.down(2,140,100,5);p.move(1,100,140,100);p.move(2,140,140,105);p.up(1,100,140,150);p.up(2,140,140,155);
 assert.ok(sent.some(e=>e.type==='wheel'));assert.equal(p.zoom,1);assert.equal(sent.filter(e=>e.type==='buttonDown').length,0);
});
