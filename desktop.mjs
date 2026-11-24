import { comboEvents, textEvents, encodeInput, encodeAck, parseMessage, h264Codec, MAX_BYTES_IN_FLIGHT } from 'screen-relay/protocol';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const holdDelay = 500;
export class DesktopPointer {
 constructor({ send, view, sensitivity }) { Object.assign(this,{send,view,sensitivity}); this.contacts = new Map(); this.x = this.y = .5; this.zoom = 1; }
 resize(width, height, visibleWidth, visibleHeight) { Object.assign(this, { width, height, visibleWidth, visibleHeight }); this.paint(); }
 paint() {
  if (!this.width || !this.visibleWidth || !this.visibleHeight) return;
  this.fit = Math.min(this.visibleWidth / this.width, this.visibleHeight / this.height);
  const width = this.width * this.fit * this.zoom, height = this.height * this.fit * this.zoom;
  const panX = clamp(width*(.5-this.x), -Math.max(0, (width - this.visibleWidth) / 2), Math.max(0, (width - this.visibleWidth) / 2));
  const panY = clamp(height*(.5-this.y), -Math.max(0, (height - this.visibleHeight) / 2), Math.max(0, (height - this.visibleHeight) / 2));
  this.image = { width, height, left: (this.visibleWidth - width) / 2 + panX, top: (this.visibleHeight - height) / 2 + panY };
  this.view({ ...this.image, zoom: this.zoom, pointer: { x: this.x, y: this.y }, holding: this.holding, dragging: this.dragging });
 }
 click(button = 1) { for (const type of ['buttonDown','buttonUp']) this.send({ type, button, x: this.x, y: this.y }); }
 down(id, x, y, at) {
  clearTimeout(this.holdTimer);this.holding=false;this.paint();
  this.contacts.set(id, { x, y, startX: x, startY: y, at, moved: false });
  if (this.contacts.size === 1) { this.dragging = false; this.multi = null; this.holdTimer = setTimeout(() => { if (this.contacts.size===1&&!this.contacts.get(id)?.moved) { this.holding=true;this.paint(); } },holdDelay); }
  if (this.contacts.size === 2) {
   const [a,b] = [...this.contacts.values()];
   this.multi = { distance: Math.hypot(a.x-b.x,a.y-b.y), x: (a.x+b.x)/2, y: (a.y+b.y)/2, zoom: this.zoom, scrollY: (a.y+b.y)/2, scrollX: (a.x+b.x)/2, mode: null, moved: false };
   if (this.dragging) { this.send({ type: 'buttonUp', button: 1, x: this.x, y: this.y }); this.dragging = false; }
  }
 }
 move(id, x, y, at) {
  const contact = this.contacts.get(id); if (!contact) return;
  const dx = x-contact.x, dy = y-contact.y; let firstMove = !contact.moved; contact.x = x; contact.y = y;
  if (Math.hypot(x-contact.startX,y-contact.startY) > 6) contact.moved = true;
  if (this.multi && this.contacts.size === 1) { this.multi = null; contact.moved = true; firstMove = false; }
  if (this.multi) {
   if (this.contacts.size !== 2) return;
   const [a,b] = [...this.contacts.values()], m = this.multi, distance = Math.hypot(a.x-b.x,a.y-b.y), cx = (a.x+b.x)/2, cy = (a.y+b.y)/2;
   if (!m.mode) {
    if (Math.abs(distance-m.distance) > Math.max(12,m.distance*.12)) m.mode = 'zoom';
    else if (Math.hypot(cx-m.x,cy-m.y) > 10) m.mode = 'scroll';
   }
   if (m.mode === 'zoom') { this.zoom = clamp(m.zoom*(distance/m.distance)**this.sensitivity().pinch,1,6); this.paint(); }
   if (m.mode === 'scroll') for (const [axis,point,key] of [['vertical',cy,'scrollY'],['horizontal',cx,'scrollX']]) {
    const steps = Math.trunc((point-m[key])/12); if (steps) { this.send({ type: 'wheel', axis, delta: clamp(-steps*120,-1200,1200), x: this.x, y: this.y }); m[key] += steps*12; }
   }
   m.moved ||= !!m.mode; return;
  }
  if (!this.image || !contact.moved) return;
  if (!this.dragging && firstMove && at-contact.at >= holdDelay) { this.dragging = true; this.send({ type: 'buttonDown', button: 1, x: this.x, y: this.y }); }
  const speed=this.sensitivity().pan;
  this.x = clamp(this.x+dx/this.image.width*speed,0,1); this.y = clamp(this.y+dy/this.image.height*speed,0,1);
  this.send({ type: 'pointerMove', x: this.x, y: this.y }); this.paint();
 }
 up(id, x, y, at) {
  clearTimeout(this.holdTimer);
  const contact = this.contacts.get(id); if (!contact) return; this.contacts.delete(id);
  if (this.multi) { if (!this.contacts.size) { if (!this.multi.moved) this.click(3); this.multi = null; } return; }
  if (this.dragging) this.send({ type: 'buttonUp', button: 1, x: this.x, y: this.y });
  else if (!contact.moved) this.click(at-contact.at>=holdDelay ? 3 : 1);
  this.holding = this.dragging = false; this.paint();
 }
 cancel() { clearTimeout(this.holdTimer);this.contacts.clear(); this.multi = null; this.dragging = this.holding = false; this.send({ type: 'releaseAll' }); this.paint(); }
 resetZoom() { this.zoom = this.zoom===1 ? 2 : 1; this.paint(); }
}

export function bindDesktopInput(input, { text, key, paste = text, focus = () => {} }) {
 let composing = false;
 const reset = () => { input.value='\u200b';input.setSelectionRange(1,1); };
 reset();
 input.addEventListener('compositionstart', () => { composing = true; });
 input.addEventListener('compositionend', event => { composing = false; if (event.data) text(event.data); reset(); });
 input.addEventListener('beforeinput', event => {
  if (composing || event.isComposing) return;
  event.preventDefault();
  if (event.inputType === 'deleteContentBackward') key('Backspace');
  else if (event.inputType === 'deleteContentForward') key('Delete');
  else if (['insertLineBreak','insertParagraph'].includes(event.inputType)) key('Enter');
  else if (event.inputType !== 'insertFromComposition' && event.data) text(event.data);
  reset();
 });
 input.addEventListener('paste', event => { event.preventDefault(); const value = event.clipboardData.getData('text/plain'); if (value) paste(value); });
 input.addEventListener('keydown', event => {
  if (composing || event.isComposing || ['Shift','Alt','Control','Meta'].includes(event.key)) return;
  const special = { ArrowLeft:'Left',ArrowRight:'Right',ArrowUp:'Up',ArrowDown:'Down',Escape:'Escape',Backspace:'Backspace',Delete:'Delete',Enter:'Enter',Tab:'Tab',Home:'Home',End:'End',PageUp:'PageUp',PageDown:'PageDown' };
  if (special[event.key] || event.ctrlKey || event.metaKey || event.altKey) { event.preventDefault(); key([...['Ctrl','Alt','Meta','Shift'].filter((_,i)=>[event.ctrlKey,event.altKey,event.metaKey,event.shiftKey][i]),special[event.key]||event.key].join('+')); }
 });
 input.addEventListener('focus', () => { reset();focus(true); }); input.addEventListener('blur', () => focus(false));
}

export class DesktopView {
 constructor({ stage, canvas, input, cursor, status, start, paste, state, focus, text, key, sensitivity }) {
  Object.assign(this, { stage, canvas, input, cursor, status, start, paste, state }); this.epoch = 0; this.queue = Promise.resolve();
  this.pointer = new DesktopPointer({ sensitivity, send: event => this.emit(event), view: view => {
   Object.assign(canvas.style, { left:view.left+'px',top:view.top+'px',width:view.width+'px',height:view.height+'px' });
   Object.assign(cursor.style, { left:(view.left+view.pointer.x*view.width)+'px',top:(view.top+view.pointer.y*view.height)+'px' });
   cursor.classList.toggle('holding',!!view.holding); cursor.classList.toggle('dragging',!!view.dragging);
  } });
  bindDesktopInput(input, { text,key,paste:value=>this.send('paste',value),focus });
  stage.oncontextmenu = event => event.preventDefault();
  const mouse = event => { const rect=stage.getBoundingClientRect(),image=this.pointer.image;if(!image)return;this.pointer.x=clamp((event.clientX-rect.left-image.left)/image.width,0,1);this.pointer.y=clamp((event.clientY-rect.top-image.top)/image.height,0,1);this.emit({type:'pointerMove',x:this.pointer.x,y:this.pointer.y});this.pointer.paint(); };
  const button = event => event.button===2?3:event.button===1?2:1;
  stage.onpointerdown = event => { event.preventDefault(); stage.setPointerCapture(event.pointerId);if(event.pointerType==='mouse'){mouse(event);this.mouseDown=true;this.emit({type:'buttonDown',button:button(event),x:this.pointer.x,y:this.pointer.y});return}this.pointer.down(event.pointerId,event.clientX,event.clientY,event.timeStamp); };
  stage.onpointermove = event => { if(event.pointerType==='mouse')mouse(event);else this.pointer.move(event.pointerId,event.clientX,event.clientY,event.timeStamp); };
  stage.onpointerup = event => { if(event.pointerType==='mouse'){mouse(event);this.mouseDown=false;this.emit({type:'buttonUp',button:button(event),x:this.pointer.x,y:this.pointer.y});return}this.pointer.up(event.pointerId,event.clientX,event.clientY,event.timeStamp); };
  stage.onpointercancel = () => this.pointer.cancel();
  stage.onlostpointercapture = event => { if(this.pointer.contacts.has(event.pointerId)||this.mouseDown){this.mouseDown=false;this.pointer.cancel()} };
  stage.onwheel = event => { event.preventDefault(); if (event.ctrlKey) { this.pointer.zoom=clamp(this.pointer.zoom*Math.exp(-event.deltaY*.01),1,6);this.pointer.paint(); } else this.emit({type:'wheel',axis:Math.abs(event.deltaX)>Math.abs(event.deltaY)?'horizontal':'vertical',delta:Math.sign(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*120,x:this.pointer.x,y:this.pointer.y}); };
  this.resize = new ResizeObserver(() => this.layout()); this.resize.observe(stage);
  this.onVisibility = () => { if (document.hidden) this.disconnect(); else this.connect(); };
  document.addEventListener('visibilitychange',this.onVisibility);
 }
 layout() { this.pointer.resize(this.canvas.width,this.canvas.height,this.stage.clientWidth,this.stage.clientHeight); }
 emit(event) { if (!this.ready || this.socket?.readyState!==WebSocket.OPEN) return false; this.socket.send(encodeInput(event,this.generation,0)); return true; }
 message(text) { this.status.textContent=text; this.status.hidden=!text; }
 async connect(take=false) {
  this.disconnect(); const epoch=this.epoch;
  if (!globalThis.VideoDecoder || !globalThis.EncodedVideoChunk) { this.message('This browser cannot decode the desktop stream. Update iOS or Safari.');return; }
  this.message('Connecting to your Mac…');
  try {
   await this.start(); if (epoch!==this.epoch) return;
   const url=new URL('/api/desktop/stream'+(take?'?take=1':''),location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
   const socket=this.socket=new WebSocket(url,'nsl1');socket.binaryType='arraybuffer';this.pending=new Map();let sequence=0,bytes=0;
   socket.onmessage=event=>{
    if (epoch!==this.epoch) return;
    try {
     const frame=parseMessage(event.data);if(frame.type==='cursor')return;if(frame.type!=='frame')throw Error('Unexpected desktop message');
     if(!this.generation){if(!frame.keyframe||frame.sequence!==1)throw Error('Desktop stream did not start with a keyframe');this.generation=frame.generation;}
     if(frame.generation!==this.generation||frame.sequence!==sequence+1||this.pending.size>=360||bytes+frame.data.byteLength>MAX_BYTES_IN_FLIGHT)throw Error('Desktop stream lost frame order');
     sequence=frame.sequence;bytes+=frame.data.byteLength;this.pending.set(frame.timestamp,{...frame,arrived:performance.now()});
     if(!this.decoder){
      this.canvas.width=frame.width;this.canvas.height=frame.height;this.layout();
      this.decoder=new VideoDecoder({output:decoded=>{
       try {
        if(epoch!==this.epoch)return;const pending=this.pending.get(decoded.timestamp);if(!pending)throw Error('Desktop frame has no matching timestamp');
        this.canvas.getContext('2d').drawImage(decoded,0,0);this.pending.delete(decoded.timestamp);bytes-=pending.data.byteLength;
        socket.send(encodeAck(pending.generation,pending.sequence,performance.now()-pending.arrived));
        if(!this.ready){this.ready=true;this.message('');this.state(true);}
       }catch(error){this.fail(error.message)}finally{decoded.close()}
      },error:error=>this.fail(error.message)});
      this.decoder.configure({codec:h264Codec(frame.data),codedWidth:frame.width,codedHeight:frame.height,optimizeForLatency:true});
     }
     this.decoder.decode(new EncodedVideoChunk({type:frame.keyframe?'key':'delta',timestamp:frame.timestamp,data:frame.data}));
    }catch(error){this.fail(error.message)}
   };
   socket.onclose=event=>{if(epoch===this.epoch)this.fail(event.code===4001?'Control moved to another viewer. Tap Reconnect to take it back.':'Desktop disconnected. Tap Reconnect to try again.');};
   socket.onerror=()=>{if(epoch===this.epoch)this.message('Desktop connection failed. Check the Mac bridge log, then Reconnect.');};
  }catch(error){if(epoch===this.epoch)this.fail(error.message)}
 }
 send(action,value) {
  const socket=this.socket;
  const delivery=this.queue.then(async()=>{
   if(!this.ready||socket!==this.socket)throw Error('Desktop is not connected');
   if(action==='paste'){await this.paste(value);if(socket!==this.socket||!this.ready)return false;for(const event of comboEvents('Meta+v'))this.emit(event);}
   else if(action==='key'){
    const chord=value.match(/^((?:(?:Ctrl|Alt|Shift|Meta|Cmd|Super)[+-])+)(.+)$/i);
    const key=chord?chord[1].replaceAll('-','+')+(/^[A-Z]$/.test(chord[2])?chord[2].toLowerCase():chord[2]):value;
    for(const event of comboEvents(key))this.emit(event);
   }
   else if(action==='input')for(const event of textEvents(value))this.emit(event);
   else throw Error('This action is unavailable in Desktop view');
   return true;
  });
  this.queue=delivery.catch(error=>{this.message(error.message);return false;});return this.queue;
 }
 fail(message) { this.disconnect();this.message(message); }
 disconnect() {
  this.pointer.cancel();this.epoch++;this.ready=false;this.state(false);
  const socket=this.socket;this.socket=null;if(socket&&socket.readyState<WebSocket.CLOSING)socket.close();
  if(this.decoder&&this.decoder.state!=='closed')this.decoder.close();this.decoder=null;this.generation=0;this.pending?.clear();
 }
 destroy() { this.disconnect();this.resize.disconnect();document.removeEventListener('visibilitychange',this.onVisibility); }
}
