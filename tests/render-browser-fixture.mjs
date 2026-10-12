// Browser renderer fixture only: no connection to cmux and no user terminal data.
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { application } from '../server.mjs';
import { eastAsianWidth } from 'get-east-asian-width';
const cells=text=>[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].reduce((n,{segment})=>n+(/\p{Emoji_Presentation}|\uFE0F/u.test(segment)?2:eastAsianWidth(segment.codePointAt(0))),0);
const workspace=randomUUID(),surface=randomUUID(),secondSurface=randomUUID(),pane=randomUUID(),window=randomUUID();
const frame={format:'cmux.render-grid.v1',render_epoch:'glyph-probe',render_revision:1,full:true,rows:10,columns:99,row_spans:[],styles:[{id:1,bold:true},{id:2,background:'#2255aa'}],cursor:{row:4,column:21,visible:true,style:'block'}};
for(const [row,text] of ['ASCII','BOLD','Powerline \ue0b0','日本語 😀','CURSOR'].entries())frame.row_spans.push({row,column:0,text,cell_width:[5,4,11,9,6][row],style_id:row===1?1:row===2?2:undefined},{row,column:21,text:'|',cell_width:1});
frame.row_spans.push({row:8,column:0,text:'⏺ Writing  ⎿ Tool'});
const echoMode=process.env.POKEMUX_CANARY_ECHO==='1';
let echoText='',echoColumn=0;
if(process.env.POKEMUX_CANARY_HISTORY==='1'){frame.scrollback_rows=4005;frame.scrollback_spans=Array.from({length:4005},(_,row)=>({row,column:0,text:'History '+row,cell_width:('History '+row).length}));}
if(echoMode){frame.styles.push({id:3,foreground:'#CC372E'});frame.cursor={row:6,column:2,visible:true,style:'block'};frame.row_spans.push({row:6,column:0,text:'> ',cell_width:2});}
const subscribers=new Set();
const bridge=Object.assign(new EventEmitter(),{connected:true,async connect(){},async status(){return {connected:true}},observeMetadata(){},async target(t){if(t.workspace_id!==workspace||![surface,secondSurface].includes(t.surface_id))throw new Error('Unknown fixture target')},async tree(){return {notifications:[],windows:[{id:window,groups:[],workspaces:[{id:workspace,title:'Renderer test',panes:[{id:pane,selected_surface_id:surface,surfaces:[{id:surface,title:process.env.POKEMUX_CANARY_LONG_TABS==='1'?'Glyph probe · terminal rendering':'Glyph probe',type:'terminal'},{id:secondSurface,title:process.env.POKEMUX_CANARY_LONG_TABS==='1'?'Second terminal · input stream':'Second terminal',type:'terminal'}]}]}]}]}},watch(target,deliver){subscribers.add(deliver);deliver(frame);return ()=>subscribers.delete(deliver)},async action(data){await this.target(data);if(echoMode){const beforeText=echoText,beforeColumn=echoColumn;
if(data.text!==undefined){echoText=echoText.slice(0,echoColumn)+data.text+echoText.slice(echoColumn);echoColumn+=data.text.length;}
else if(data.key==='Backspace'&&echoColumn>0){echoText=echoText.slice(0,echoColumn-1)+echoText.slice(echoColumn);echoColumn--;}
else if(data.key==='Left'&&echoColumn>0)echoColumn--;
else if(data.key==='Right'&&echoColumn<echoText.length)echoColumn++;
if(echoText!==beforeText||echoColumn!==beforeColumn){frame.row_spans=frame.row_spans.filter(span=>span.row!==6);frame.row_spans.push({row:6,column:0,text:'> ',cell_width:2});if(echoText)frame.row_spans.push({row:6,column:2,text:echoText,cell_width:cells(echoText),style_id:3});frame.cursor.column=2+cells(echoText.slice(0,echoColumn));frame.render_revision++;for(const deliver of subscribers)deliver(frame)}
}else if(data.text==='h'){frame.render_revision++;frame.scrollback_rows=4005;frame.scrollback_spans=Array.from({length:4005},(_,row)=>({row,column:0,text:'History '+row,cell_width:12}));for(const deliver of subscribers)deliver(frame)}console.log(JSON.stringify({fixtureAction:data.action,workspace_id:data.workspace_id,surface_id:data.surface_id,key:data.key,text:data.text}));return {ok:true}}});
const auth={origin:'http://localhost:4392',credentials:[],session:()=>({authenticated:true}),require:()=>({authenticated:true}),sameOrigin(){}};
const server=application({bridge,auth});
{
 const handler=server.listeners('request')[0];server.removeAllListeners('request');server.on('request',(req,res)=>{
  if(req.url==='/__glyph-control'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Terminal symbol presentation</title><p style="font:24px monospace">Default: ⏺ ⏹ ⏸ 😀</p><p style="font:24px monospace;font-variant-emoji:text">Text CSS: ⏺ ⏹ ⏸ 😀</p><p style="font:24px monospace;font-variant-emoji:unicode">Unicode CSS: ⏺ ⏹ ⏸ 😀</p><p style="font:24px monospace">Text selectors: ⏺︎ ⏹︎ ⏸︎ 😀</p><p>Plain browser font: こんにちは ネコ 日本語</p><p style="font-family:-apple-system">Apple system family: こんにちは ネコ 日本語</p><p style="font-family:monospace">Monospace: こんにちは ネコ 日本語</p><p style="font-family:sans-serif">Sans serif: こんにちは ネコ 日本語</p><p style="font-family:system-ui">System UI: こんにちは ネコ 日本語</p><p style="font-family:ui-monospace">UI monospace: こんにちは ネコ 日本語</p>');return}
  handler(req,res);
 });
}
if(process.env.POKEMUX_CANARY_TRACE==='1'){
 const handler=server.listeners('request')[0];server.removeAllListeners('request');server.on('request',(req,res)=>{
  if(req.url==='/__input-trace'&&req.method==='POST'){let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{console.log(JSON.stringify({inputTrace:JSON.parse(body)}));res.end('{}')});return}
  if(req.url==='/'){
   const end=res.end.bind(res);res.end=(body,...args)=>end(String(body).replace('</head>',`<script>for(const type of ['pointerdown','pointerup','click','focusin','focusout','beforeinput'])document.addEventListener(type,e=>{const at=performance.now(),target=e.target.className,detail=e.detail;setTimeout(()=>fetch('/__input-trace',{method:'POST',body:JSON.stringify({type,at,target,detail,focus:document.activeElement.className,selection:getSelection()?.toString().length||0,prevented:e.defaultPrevented})}),0)},true)</script></head>`),...args);
  }
  handler(req,res);
 });
}
await new Promise(r=>server.listen(4392,'127.0.0.1',r));
await writeFile(new URL('../state/render-fixture-info.json',import.meta.url),JSON.stringify({origin:auth.origin,workspaceId:workspace,surfaceId:surface,windowId:window}));
process.on('SIGINT',()=>{server.closeAllConnections();server.close(()=>process.exit(0))});
console.log('Browser-only renderer fixture ready on loopback4392; no cmux connection.');
