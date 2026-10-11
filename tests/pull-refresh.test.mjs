import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = html.slice(html.indexOf('function bindSwipes()'), html.indexOf('function bindTabDragging()'));
function gesture(typing = false, selected = false, shortcuts = false) {
  const node = () => ({ hidden: true, textContent: '', dataset: {}, style: { setProperty(k, v) { this[k] = v; } }, classList: { toggle() {}, add() {}, remove() {} } });
  const nodes = { content: node(), pullIndicator: node(), pullLabel: node(), dialog: {...node(),open:shortcuts} };
  nodes.content.querySelector = () => node();
  let reloads = 0, sidebars = 0, keyboards = 0, dismissals=0; const keys = []; const output = {};
  nodes.dialog.contains=()=>false;nodes.dialog.classList.contains=()=>shortcuts;nodes.dialog.close=()=>{nodes.dialog.open=false;dismissals++};
  const context = vm.createContext({ $: id => nodes[id], document: { activeElement: typing ? output : {} }, inputSurface: () => output, getSelection: () => ({ toString: () => selected ? 'selected terminal text' : '' }), matchMedia: () => ({ matches: true }), activeSurface: () => ({ kind: 'terminal' }), connected: true, terminalTyping:typing, focusInput() {}, sendKey(key) { keys.push(key); }, openSidebar() { sidebars++; }, keyboardDialog() { keyboards++; }, location: { reload: () => reloads++ }, requestAnimationFrame: fn => fn() });
  vm.runInContext(source + '\nbindSwipes()', context);
  const target = header => ({ closest: selector => selector === '.workspacehead' && header ? {} : null });
  const event = (y, header = true, x = 100) => ({ target: target(header), clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true, preventDefault() {} });
  nodes.content.setPointerCapture = () => {};
  return {
    down(y = 25, header = true) { (nodes.content.onpointerdown || nodes.content.onmousedown)(event(y, header)); },
    move(y, x = 100) { (nodes.content.onpointermove || nodes.content.onmousemove)(event(y, true, x)); },
    up(y, x = 100) { (nodes.content.onpointerup || nodes.content.onmouseup)(event(y, true, x)); },
    select() { selected = true; },
    cancel() { (nodes.content.onpointercancel || nodes.content.ontouchcancel)(); },
    get reloads() { return reloads; },
    get sidebars() { return sidebars; },
    get keyboards() { return keyboards; },
    get dismissals() { return dismissals; },
    get keys() { return keys; },
    get offset() { return parseFloat(nodes.content.style['--pull-offset']) || 0; },
    get indicatorVisible() { return !nodes.pullIndicator.hidden; }
  };
}

test('top-bar pull moves the page and exposes feedback without reloading while held', () => {
  const g = gesture(); g.down(); g.move(80);
  assert.ok(g.offset > 0); assert.ok(g.indicatorVisible); assert.equal(g.reloads, 0);
  g.move(185); assert.equal(g.reloads, 0);
});
test('releasing an armed pull reloads the page exactly once', () => {
  const g = gesture(); g.down(); g.move(185); g.up(185); assert.equal(g.reloads, 1);
});
test('crossing the threshold then dragging back before release cancels refresh', () => {
  const g = gesture(); g.down(); g.move(185); g.move(45); assert.equal(g.reloads, 0);
  g.up(45); assert.equal(g.reloads, 0); assert.equal(g.offset, 0); assert.equal(g.indicatorVisible, false);
});
test('release position disarms even if the last move event was above threshold', () => {
  const g = gesture(); g.down(); g.move(185); g.up(45); assert.equal(g.reloads, 0);
});
test('short pull and OS-canceled pull restore the page without reloading', () => {
  const short = gesture(); short.down(); short.move(65); short.up(65); assert.equal(short.reloads, 0); assert.equal(short.offset, 0);
  const canceled = gesture(); canceled.down(); canceled.move(185); canceled.cancel(); assert.equal(canceled.reloads, 0); assert.equal(canceled.offset, 0); assert.equal(canceled.indicatorVisible, false);
});
test('pull starting in terminal output never reloads', () => {
  const g = gesture(); g.down(200, false); g.move(400); g.up(400); assert.equal(g.reloads, 0); assert.equal(g.offset, 0);
});
test('diagonal movement disarms a previously armed vertical pull', () => {
  const g = gesture(); g.down(); g.move(185); g.move(185, 300); g.up(185, 300); assert.equal(g.reloads, 0);
});

test('horizontal terminal gestures remain scrolling in reading and typing modes', () => {
  for(const typing of [false,true])for(const x of [10,260]){
    const g=gesture(typing);g.down(240,false);g.move(240,x);g.up(240,x);
    assert.equal(g.sidebars,0);assert.equal(g.keyboards,0);assert.equal(g.reloads,0);assert.deepEqual(g.keys,[]);
  }
});
test('navbar horizontal drags never open navigation, including while typing', () => {
  for(const typing of [false,true]){
    const left=gesture(typing);left.down();left.move(25,10);left.up(25,10);assert.equal(left.sidebars,0);assert.equal(left.keyboards,0);assert.deepEqual(left.keys,[]);
    const right=gesture(typing);right.down();right.move(25,260);right.up(25,260);assert.equal(right.sidebars,0);assert.equal(right.keyboards,0);
  }
});
test('text selection preserves terminal scrolling without input or navigation',()=>{
  for(const typing of [false,true])for(const preselected of [false,true]){
    const g=gesture(typing,preselected);g.down(240,false);if(!preselected)g.select();g.move(240,10);g.up(240,10);
    assert.deepEqual(g.keys,[]);assert.equal(g.keyboards,0);assert.equal(g.sidebars,0);
  }
});
test('terminal horizontal drag leaves expanded shortcuts unchanged',()=>{
  for(const typing of [false,true]){
    const g=gesture(typing,false,true);g.down(240,false);g.move(240,260);g.up(240,260);
    assert.equal(g.dismissals,0);assert.equal(g.sidebars,0);assert.deepEqual(g.keys,[]);
  }
});
