import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RenderGrid, cursorOffset } from '../grid.mjs';
const full = { format: 'cmux.render-grid.v1', render_epoch: 'producer-a', render_revision: 1, rows: 3, columns: 20, full: true, scrollback_rows: 1, scrollback_spans: [{ row: 0, column: 0, text: 'history' }], row_spans: [{ row: 0, column: 0, text: 'hello' }, { row: 1, column: 0, text: '日本語', cell_width: 6 }], cursor: { row: 1, column: 6, visible: true } };
test('streamed scroll, row erase and cursor update preserve history without repeating output', () => {
  const grid = new RenderGrid(); grid.apply(full);
  grid.apply({ ...full, full: false, render_revision: 2, delta_base_render_revision: 1, scrolled_rows: 1, cleared_rows: [0, 2], row_spans: [{ row: 2, column: 0, text: 'new output' }], cursor: { row: 2, column: 10, visible: true } });
  assert.deepEqual(grid.history.map(row => row.map(s => s.text).join('')), ['history', 'hello']);
  assert.deepEqual(grid.screen.map(row => row.map(s => s.text).join('')), ['', '', 'new output']);
  assert.deepEqual(grid.cursor, { row: 2, column: 10, visible: true });
  assert.equal(grid.apply(full), false);
});
test('missing delta and retired producer cannot corrupt the screen; full replay establishes the new producer', () => {
  const grid = new RenderGrid(); grid.apply(full);
  assert.throws(() => grid.apply({ ...full, full: false, render_revision: 3, delta_base_render_revision: 2 }), /continuity/);
  assert.deepEqual(grid.screen[0].map(s => s.text), ['hello']);
  assert.throws(() => grid.apply({ ...full, full: false, render_epoch: 'producer-b' }), /continuity/);
  grid.apply({ ...full, render_epoch: 'producer-b' }); assert.equal(grid.epoch, 'producer-b');
});
test('remote cursor maps terminal cells to native text offsets for wide and combining characters', () => {
  assert.equal(cursorOffset('日本語abc', 6), 3);
  assert.equal(cursorOffset('e\u0301X', 1), 2);
  assert.equal(cursorOffset('🙂X', 2), 2);
  assert.equal(cursorOffset('abc', 0), 0);
});
test('screen-anchored full repaint retains primary history, alternate screen hides it, and burst scroll retains old screen', () => {
  const grid = new RenderGrid(); grid.apply({ ...full, anchor: 'screen', active_screen: 'primary' });
  grid.apply({ ...full, anchor: 'screen', active_screen: 'primary', render_revision: 2, scrollback_rows: 0, scrollback_spans: [] });
  assert.equal(grid.history[0][0].text, 'history');
  grid.apply({ ...full, anchor: 'screen', active_screen: 'alternate', render_revision: 3, scrollback_rows: 0, scrollback_spans: [] });
  assert.equal(grid.history[0][0].text, 'history');
  grid.apply({ ...full, anchor: 'screen', active_screen: 'primary', render_revision: 4, scrollback_rows: 0, scrollback_spans: [] });
  grid.apply({ ...full, full: false, render_revision: 5, delta_base_render_revision: 4, scrolled_rows: 4, scrollback_rows: 1, scrollback_spans: [{ row: 0, column: 0, text: 'missed between frames' }], row_spans: [{ row: 0, column: 0, text: 'current screen' }] });
  assert.deepEqual(grid.history.map(row => row.map(s => s.text).join('')), ['history', 'hello', '日本語', '', 'missed between frames']);
});
test('cold alternate-screen replay hydrates primary scrollback for return to the shell', () => {
  const grid = new RenderGrid(); grid.apply({ ...full, anchor: 'screen', active_screen: 'alternate' });
  grid.apply({ ...full, anchor: 'screen', active_screen: 'primary', render_revision: 2, scrollback_rows: 0, scrollback_spans: [] });
  assert.equal(grid.history[0]?.[0]?.text, 'history');
});

test('frame-local style IDs do not recolor unchanged output or scrollback', async () => {
  const { JSDOM } = await import('jsdom');
  const { document } = new JSDOM('<pre></pre>').window;
  const element = document.querySelector('pre'), grid = new RenderGrid();
  grid.apply({ ...full, styles: [{ id: 1, foreground: '#ff0000' }], scrollback_spans: [{ row: 0, column: 0, text: 'past', style_id: 1 }], row_spans: [{ row: 0, column: 0, text: 'unchanged', style_id: 1 }, { row: 1, column: 0, text: 'old', style_id: 1 }] });
  grid.apply({ ...full, full: false, render_revision: 2, delta_base_render_revision: 1, styles: [{ id: 1, foreground: '#00ff00' }], row_spans: [{ row: 1, column: 0, text: 'changed', style_id: 1 }], scrolled_rows: 0 });
  grid.paint(element);
  const colors = () => Object.fromEntries([...element.querySelectorAll('span:not(.remote-cursor)')].map(node => [node.textContent, node.style.color]));
  assert.deepEqual(colors(), { past: 'rgb(255, 0, 0)', unchanged: 'rgb(255, 0, 0)', changed: 'rgb(0, 255, 0)' });
  grid.apply({ ...full, full: false, render_revision: 3, delta_base_render_revision: 2, scrolled_rows: 4, styles: [{ id: 1, foreground: '#0000ff' }], scrollback_rows: 1, scrollback_spans: [{ row: 0, column: 0, text: 'burst', style_id: 1 }], row_spans: [{ row: 0, column: 0, text: 'now', style_id: 1 }] });
  grid.paint(element);
  assert.deepEqual(colors(), { past: 'rgb(255, 0, 0)', unchanged: 'rgb(255, 0, 0)', changed: 'rgb(0, 255, 0)', burst: 'rgb(0, 0, 255)', now: 'rgb(0, 0, 255)' });
});

test('authoritative empty replay clears history after erase and across producer epochs', () => {
  for (const epoch of [full.render_epoch, 'replacement-producer']) {
    const grid = new RenderGrid(); grid.apply(full);
    grid.apply({ ...full, anchor:'screen', active_screen:'primary', render_epoch:epoch, render_revision:2, history_rows:0, row_space_revision:2, scrollback_rows:0, scrollback_spans:[] });
    assert.deepEqual(grid.history,[], 'An authoritative empty history must not retain removed text');
  }
});

test('cached search text preserves screen spacing across styles and excludes scrollback',()=>{
 const grid=new RenderGrid();grid.apply({format:'cmux.render-grid.v1',render_epoch:'search',render_revision:1,full:true,rows:2,columns:40,scrollback_rows:1,scrollback_spans:[{row:0,column:0,text:'private old output'}],row_spans:[{row:0,column:0,text:'HELLO',cell_width:5},{row:0,column:6,text:'world',cell_width:5},{row:1,column:0,text:'日本語',cell_width:6}],cursor:{row:0,column:11}});
 assert.equal(grid.searchText,'hello world\n日本語');grid.apply({format:'cmux.render-grid.v1',render_epoch:'search',render_revision:2,delta_base_render_revision:1,full:false,rows:2,columns:40,cleared_rows:[0,1],row_spans:[],cursor:{row:0,column:0}});assert.equal(grid.searchText,'\n');
});

test('one-cell input echo keeps unchanged scrollback nodes and still erases authoritative removed history',async()=>{
 const {JSDOM}=await import('jsdom'),dom=new JSDOM('<pre></pre>'),output=dom.window.document.querySelector('pre'),grid=new RenderGrid();
 try{
  const frame={...full,rows:30,columns:120,scrollback_rows:4000,scrollback_spans:Array.from({length:4000},(_,row)=>({row,column:0,text:`History ${row}`})),row_spans:[{row:0,column:0,text:'> '}],cursor:{row:0,column:2,visible:true,style:'bar'}};
  grid.apply(frame);grid.paint(output);const history=output.firstElementChild;
  grid.apply({...frame,render_revision:2,row_spans:[{row:0,column:0,text:'> a'}],cursor:{row:0,column:3,visible:true,style:'bar'}});grid.paint(output);
  assert.equal(output.firstElementChild,history,'A typed character must not rebuild unchanged scrollback');assert.equal(output.children[4000].textContent,'> a\n');assert.equal(output.querySelector('.remote-cursor').style.left,'3ch');
  grid.apply({...frame,render_revision:3,history_rows:0,scrollback_rows:0,scrollback_spans:[],row_spans:[{row:0,column:0,text:'erased'}]});grid.paint(output);assert.equal(output.children.length,30);assert.equal(output.firstElementChild.textContent,'erased\n');assert.equal(output.textContent.includes('History'),false);
 }finally{dom.window.close()}
});

test('native composition survives paint deferral, then unchanged authoritative rows replace native edits',async()=>{
 const {JSDOM}=await import('jsdom'),dom=new JSDOM('<pre></pre>'),output=dom.window.document.querySelector('pre'),grid=new RenderGrid();
 try{
  const frame={...full,scrollback_rows:0,scrollback_spans:[],row_spans:[{row:0,column:0,text:'unchanged'},{row:1,column:0,text:'prompt'}],cursor:{row:1,column:6,visible:true,style:'bar'}};
  grid.apply(frame);grid.paint(output);const edited=output.firstElementChild,untouched=output.children[2];
  output.composing=true;const native=dom.window.document.createTextNode('日本');edited.append(native);
  grid.apply({...frame,render_revision:2,cursor:{row:1,column:7,visible:true,style:'bar'}});
  assert.equal(grid.paint(output),false);assert.equal(native.isConnected,true,'Painting must not remove an active native composition');
  output.composing=false;assert.equal(grid.paint(output),true);
  assert.equal(output.firstElementChild.textContent,'unchanged\n','The remote row wins even when its spans have not changed');
  assert.equal(native.isConnected,false);assert.equal(output.children[2],untouched,'Other unchanged rows remain reusable');
  assert.equal(output.querySelectorAll('.remote-cursor').length,1);assert.equal(output.querySelector('.remote-cursor').style.left,'7ch');
 }finally{dom.window.close()}
});
