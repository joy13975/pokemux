import assert from 'node:assert/strict';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
import {RenderGrid} from '../grid.mjs';

const frame={format:'cmux.render-grid.v1',render_epoch:'block',render_revision:1,full:true,columns:36,rows:4,active_screen:'alternate',row_spans:[
 {row:0,column:0,text:'| alpha | first cell | neighbour |'},
 {row:1,column:0,text:'| beta  | wraps here | other     |'},
 {row:2,column:0,text:'| gamma | ends here  | last      |'}
]};
test('rectangle copies only the chosen table column in either drag direction',()=>{
 const grid=new RenderGrid();grid.apply(frame);
 assert.equal(grid.copyRectangle({col:10,row:0},{col:19,row:2}),'first cell\nwraps here\nends here');
 assert.equal(grid.copyRectangle({col:19,row:2},{col:10,row:0}),'first cell\nwraps here\nends here');
});
test('rectangle preserves graphemes, real gaps and blank lines while omitting concealed text',()=>{
 const grid=new RenderGrid();grid.apply({...frame,active_screen:'primary',scrollback_rows:1,scrollback_spans:[{row:0,column:2,text:'older'}],styles:[{id:1,invisible:true}],row_spans:[{row:0,column:1,text:'日e\u0301🙂'},{row:0,column:9,text:'end'},{row:2,column:0,text:'secret',style_id:1},{row:2,column:8,text:'ok'}]});
 assert.equal(grid.copyRectangle({col:2,row:-1},{col:11,row:2}),'older\n日e\u0301🙂   end\n\n      ok');
 assert.equal(grid.copyRectangle({col:4,row:0},{col:4,row:0}),'🙂');
});
function pointer(w,target,type,x,y){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{button:0,isPrimary:true,pointerId:1,clientX:x,clientY:y});target.dispatchEvent(e)}
test('block drag and corner adjustment copy the frozen paint, then Done restores live rendering',async()=>{
 const {BlockSelection}=await import('../block-selection.mjs');
 const dom=new JSDOM('<div class="terminalwrap"><pre></pre></div><div id="layer"></div>',{pretendToBeVisual:true}),w=dom.window,d=w.document,output=d.querySelector('pre'),grid=new RenderGrid(),copied=[];let closed=0;
 w.HTMLElement.prototype.setPointerCapture=()=>{};grid.apply(frame);grid.paint(output);
 const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
 output.getBoundingClientRect=()=>rect(10,80,360,80);for(const [row,line]of [...output.children].entries())line.getBoundingClientRect=()=>rect(10,80+row*20,360,20);
 output.parentElement.getBoundingClientRect=()=>rect(10,80,360,80);d.querySelector('#layer').getBoundingClientRect=()=>rect(0,0,400,240);
 const block=new BlockSelection({output,grid,layer:d.querySelector('#layer'),copy:async text=>copied.push(text),onClose:()=>closed++});
 try{
  const stage=d.querySelector('.block-select-stage');assert.ok(stage);assert.equal(output.blockSelection,true);
  pointer(w,stage,'pointerdown',115,85);pointer(w,stage,'pointermove',205,105);pointer(w,stage,'pointerup',205,105);
  const end=d.querySelector('[data-block-corner="end"]');pointer(w,end,'pointerdown',210,120);pointer(w,end,'pointermove',205,125);pointer(w,end,'pointerup',205,125);
  grid.apply({...frame,render_revision:2,row_spans:[{row:0,column:0,text:'new streamed output'}]});assert.equal(grid.paint(output),false);assert.ok(output.textContent.includes('first cell'));
  d.querySelector('[data-block-copy]').click();await new Promise(r=>setTimeout(r,0));assert.deepEqual(copied,['first cell\nwraps here\nends here']);
  d.querySelector('[data-block-done]').click();assert.equal(output.blockSelection,false);assert.equal(closed,1);assert.equal(d.querySelector('.block-select-stage'),null);assert.equal(grid.paint(output),true);assert.ok(output.textContent.includes('new streamed output'));
 }finally{block.close();w.close()}
});

test('selection reaches visible edges from inside the rim, including a zoomed and panned terminal',async()=>{
 const {BlockSelection}=await import('../block-selection.mjs');const dom=new JSDOM('<div class="terminalwrap"><pre></pre></div><div id="layer"></div>'),d=dom.window.document,output=d.querySelector('pre'),grid=new RenderGrid();grid.apply(frame);grid.paint(output);let textLeft=10,textWidth=360;
 const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});output.getBoundingClientRect=()=>rect(textLeft,80,textWidth,80);for(const[row,line]of [...output.children].entries())line.getBoundingClientRect=()=>rect(textLeft,80+row*20,textWidth,20);output.parentElement.getBoundingClientRect=()=>rect(10,80,360,80);d.querySelector('#layer').getBoundingClientRect=()=>rect(0,0,400,240);
 const block=new BlockSelection({output,grid,layer:d.querySelector('#layer'),copy:()=>{},onClose:()=>{}});
 try{assert.deepEqual(block.point({clientX:28,clientY:98}),{col:0,row:0});assert.deepEqual(block.point({clientX:352,clientY:142}),{col:35,row:3});const columns=new Set(Array.from({length:140},(_,n)=>block.point({clientX:10+n/2,clientY:120}).col));for(let col=0;col<6;col++)assert.ok(columns.has(col),'Edge assistance must leave every nearby column reachable');textLeft=-100;textWidth=720;assert.deepEqual(block.point({clientX:28,clientY:98}),{col:5,row:0});assert.deepEqual(block.point({clientX:352,clientY:142}),{col:23,row:3});}finally{block.close();dom.window.close()}
});
