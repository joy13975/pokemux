import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { RenderGrid } from '../grid.mjs';
import { KanaComposer } from '../kana.mjs';
import { installPopover } from './popover-fixture.mjs';

const frame = (row_spans, extra = {}) => ({ format:'cmux.render-grid.v1', render_epoch:'links', render_revision:1, full:true, rows:3, columns:80, row_spans, ...extra });
function painted(data) {
  const dom=new JSDOM('<pre></pre>'),output=dom.window.document.querySelector('pre'),grid=new RenderGrid();
  grid.apply(data);grid.paint(output);geometry(output,grid.columns);
  return { dom, output, grid, at(col,row=0){return grid.urlAt(output,10+col*10+5,20+row*20+5)} };
}
function geometry(output,columns) {
  output.getBoundingClientRect=()=>({left:10,top:20,width:columns*10,height:output.children.length*20});
  for(const [row,element] of [...output.children].entries())element.getBoundingClientRect=()=>({top:20+row*20,height:20});
}
test('visible URLs retain cell identity across styled runs, wide graphemes and punctuation',()=>{
  const fixture=painted(frame([{row:0,column:0,text:'日本 e\u0301 ('},{row:0,column:8,text:'https://example.test/a_(b)',style_id:1},{row:0,column:34,text:'). next'},{row:1,column:0,text:'https://example.test/?x=1&y=2'}],{styles:[{id:1,underline:true}]}));
  try{
    assert.equal(fixture.at(10),'https://example.test/a_(b)');
    assert.equal(fixture.at(31),'https://example.test/a_(b)');
    for(const col of [0,1,7,34,35,38])assert.equal(fixture.at(col),null);
    assert.equal(fixture.at(2,1),'https://example.test/?x=1&y=2');
  }finally{fixture.dom.window.close()}
});
test('URL lookup rejects unsafe schemes, styled labels, invisible spans and ambiguous row-edge truncation',()=>{
  for(const text of ['javascript:alert(1)','file:///tmp/test','Open the benchmark report','javascript:https://example.test','https://example.test\\evil']){
    const fixture=painted(frame([{row:0,column:0,text,style_id:1}],{styles:[{id:1,underline:true,foreground:'#0000ff'}]}));
    try{for(let col=0;col<text.length;col++)assert.equal(fixture.at(col),null,text)}finally{fixture.dom.window.close()}
  }
  const hidden=painted(frame([{row:0,column:0,text:'https://example.test',style_id:1}],{styles:[{id:1,invisible:true}]}));
  try{assert.equal(hidden.at(5),null)}finally{hidden.dom.window.close()}
  const wrapped=painted(frame([{row:0,column:0,text:'https://example.test/'},{row:1,column:0,text:'remaining-path'}],{columns:21}));
  try{assert.equal(wrapped.at(5),null,'No wrap metadata means the first row cannot prove a complete destination');assert.equal(wrapped.at(5,1),null)}finally{wrapped.dom.window.close()}
});
test('historical links can open without turning scrollback into live mouse cells and stale paints cannot identify links',()=>{
  const fixture=painted(frame([{row:0,column:0,text:'https://current.test'}],{scrollback_rows:1,scrollback_spans:[{row:0,column:0,text:'https://history.test'}]}));
  try{
    assert.equal(fixture.at(5),'https://history.test/');
    assert.equal(fixture.grid.cellAt(fixture.output,65,25),null);
    assert.equal(fixture.at(5,1),'https://current.test/');
    fixture.grid.apply(frame([{row:0,column:0,text:'https://replacement.test'}],{render_revision:2}));
    assert.equal(fixture.at(5),null,'Painted cell and stream revision must agree');
  }finally{fixture.dom.window.close()}
});
test('URL hit tests reject missing cells, inconsistent declared widths and clipped destinations',()=>{
  for(const spans of [
    [{row:0,column:0,text:'https://example.test',cell_width:18}],
    [{row:0,column:0,text:'https://'},{row:0,column:9,text:'example.test'}],
    [{row:0,column:0,text:'https://example.test/'+ 'a'.repeat(80)}]
  ]){
    const fixture=painted(frame(spans));
    try{assert.equal(fixture.at(5),null)}finally{fixture.dom.window.close()}
  }
});

function terminal() {
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),virtualConsole=new VirtualConsole();
  virtualConsole.on('jsdomError',error=>{if(error.type==='unhandled-exception')throw error});
  const dom=new JSDOM(html,{virtualConsole,url:'https://pokemux-test.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
  w.localStorage.setItem('cmux-pocket-customizations',JSON.stringify({shortcuts:[],snippets:[],keyboardMode:'native',keyboardDefaultVersion:1}));
  installPopover(w);w.isSecureContext=true;w.ResizeObserver=class{observe(){}disconnect(){}};w.HTMLElement.prototype.setPointerCapture=()=>{};
  w.document.elementFromPoint=()=>null;w.Range.prototype.getClientRects=()=>[];w.matchMedia=()=>({matches:true});w.visualViewport={width:390,height:844,scale:1,offsetTop:0,offsetLeft:0,addEventListener(){}};
  w.EventSource=class{addEventListener(){}close(){}};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.__RenderGrid=RenderGrid;w.__KanaComposer=KanaComposer;w.actions=[];w.opened=[];w.open=(...args)=>{w.opened.push(args);return null};
  w.fetch=async(path,options)=>{if(path==='/api/action')w.actions.push(JSON.parse(options.body));return {ok:true,status:200,json:async()=>({})}};
  const script=html.split('<script type="module">\n')[1].split('</script>')[0];
  w.eval(script.slice(0,script.lastIndexOf('(async()=>{'))+`
    RenderGrid=window.__RenderGrid;KanaComposer=window.__KanaComposer;kana=new KanaComposer();
    current=workspace('owned-workspace','Owned',null,'','',[pane('owned-pane',[surface('owned-surface','Owned terminal')])],'owned-window');workspaces.push(current);selectedWindow=current.window;connected=true;
    const model=new RenderGrid();model.apply(${JSON.stringify(frame([{row:0,column:0,text:'https://example.test/report'},{row:1,column:0,text:'Open the benchmark report',style_id:1},{row:2,column:0,text:'/tmp/pokemux-preview.png'}],{styles:[{id:1,foreground:'#0000ff',underline:true}],modes:[{code:1000,on:true,ansi:false}]}))});grids.set('owned-surface',model);render();window.fixture={model,paintTerminal,metadata(){render()},switchTerminal(){current.panes[0].tabs.push(surface('other-surface','Other'));selectSurface('owned-pane','other-surface')}};
  `);
  const output=w.document.querySelector('.terminal');geometry(output,80);
  return dom;
}
function pointer(w,root,type,col,row=0){const event=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:1,button:0,isPrimary:true,clientX:10+col*10+5,clientY:20+row*20+5});root.dispatchEvent(event)}
function highlight(w,row){const range=w.document.createRange();range.selectNodeContents(w.document.querySelector('.terminal').children[row]);range.getClientRects=()=>[{left:10,right:810,top:20+row*20,bottom:40+row*20}];w.getSelection().removeAllRanges();w.getSelection().addRange(range)}
test('holding selected URL or full image path opens a new client tab, preserves selection and never clicks the host',async()=>{
 const dom=terminal(),w=dom.window,wrap=w.document.querySelector('.terminalwrap');
 try{
  for(const row of [0,2]){highlight(w,row);const text=w.getSelection().toString(),url=w.location.href;pointer(w,wrap,'pointerdown',5,row);w.fixture.metadata();await new Promise(r=>w.setTimeout(r,550));pointer(w,wrap,'pointerup',5,row);assert.equal(w.opened.length,row===0?1:2);assert.equal(w.opened.at(-1)[1],'_blank');assert.equal(w.location.href,url);assert.equal(w.getSelection().toString(),text)}
  assert.equal(w.opened[0][0],'https://example.test/report');const file=new URL(w.opened[1][0],w.location);assert.equal(file.pathname,'/api/file');assert.equal(file.searchParams.get('path'),'/tmp/pokemux-preview.png');assert.equal(file.searchParams.get('workspace'),'owned-workspace');assert.equal(file.searchParams.get('surface'),'owned-surface');assert.equal(w.actions.length,0);
 }finally{w.close()}
});
test('short selected taps, drags, cancellation, changed selection and a switched tab cannot open a resource',async()=>{
 const dom=terminal(),w=dom.window,wrap=w.document.querySelector('.terminalwrap');
 try{
  highlight(w,2);pointer(w,wrap,'pointerdown',5,2);pointer(w,wrap,'pointerup',5,2);
  for(const cancel of [()=>pointer(w,wrap,'pointermove',9,2),()=>pointer(w,wrap,'pointercancel',5,2),()=>highlight(w,1),()=>w.fixture.switchTerminal()]){highlight(w,2);pointer(w,wrap,'pointerdown',5,2);cancel();await new Promise(r=>w.setTimeout(r,550));pointer(w,wrap,'pointerup',5,2)}
  assert.equal(w.opened.length,0);assert.equal(w.actions.length,0);
 }finally{w.close()}
});
test('trusted URL tap opens on client immediately and never forwards host mouse; ordinary TUI label click still forwards',async()=>{
  const dom=terminal(),w=dom.window,wrap=w.document.querySelector('.terminalwrap');
  try{
    pointer(w,wrap,'pointerdown',5);pointer(w,wrap,'pointerup',5);
    assert.deepEqual(w.opened,[['https://example.test/report','_blank','noopener,noreferrer']],'Open must happen in the release event, before an async action');
    await new Promise(resolve=>w.setTimeout(resolve,0));assert.equal(w.actions.length,0);
    pointer(w,wrap,'pointerdown',5,1);pointer(w,wrap,'pointerup',5,1);
    await new Promise(resolve=>w.setTimeout(resolve,0));assert.deepEqual(w.actions.map(({action,col,row})=>({action,col,row})),[{action:'mouse',col:5,row:1}]);
    assert.equal(w.opened.length,1,'Underline and color must not invent an unknown destination');
  }finally{w.close()}
});
test('URL destination is captured with the painted press and drags, selection and cancellation cannot open it',()=>{
  const dom=terminal(),w=dom.window,output=w.document.querySelector('.terminal'),wrap=w.document.querySelector('.terminalwrap');
  try{
    pointer(w,wrap,'pointerdown',5);w.fixture.model.apply(frame([{row:0,column:0,text:'https://changed.test'}],{render_revision:2}));pointer(w,wrap,'pointerup',5);
    assert.equal(w.opened[0][0],'https://example.test/report');
    w.fixture.paintTerminal();geometry(output,80);
    pointer(w,wrap,'pointerdown',5);pointer(w,wrap,'pointermove',7);pointer(w,wrap,'pointerup',5);
    pointer(w,wrap,'pointerdown',5);pointer(w,wrap,'pointercancel',5);pointer(w,wrap,'pointerup',5);
    const range=w.document.createRange();range.selectNodeContents(output.firstElementChild);w.getSelection().addRange(range);pointer(w,wrap,'pointerdown',5);pointer(w,wrap,'pointerup',5);
    assert.equal(w.opened.length,1);
  }finally{w.close()}
});
