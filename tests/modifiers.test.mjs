import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
const html = readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source = html.slice(html.indexOf('function bindKeys('),html.indexOf('function normalizedKey('));
function fixture() {
  const buttons = Array.from({length:2},()=>({dataset:{key:'Ctrl'},pressed:'false',active:false,classList:{toggle(name,on){this.owner[name]=on},remove(){this.owner.active=false}},setAttribute(name,value){if(name==='aria-pressed')this.pressed=value}}));
  buttons.forEach(b=>b.classList.owner=b);
  const roots=buttons.map(b=>({querySelectorAll: selector=>selector==='[data-key]'?[b]:[]}));
  const status={textContent:''},mods=new Map(),sent=[];let interrupts=0;
  const context=vm.createContext({mods,kanaActive:()=>false,updateKeyboardLabels(){},connected:true,modifierKeys:['Ctrl','Alt','Shift'],preferences:{shortcuts:[]},document:{querySelectorAll:()=>buttons},$:()=>status,interruptDialog(){interrupts++},sendTerminal(kind,value){sent.push({kind,value})}});
  vm.runInContext(source,context); roots.forEach(root=>context.bindKeys(root));
  return {buttons,mods,sent,context,get interrupts(){return interrupts}};
}
test('Ctrl-C consumed before cancel leaves every modifier control off and next character plain',()=>{
  const f=fixture();f.buttons[0].onclick();f.context.directInput('c');
  assert.equal(f.interrupts,1);assert.equal(f.mods.size,0);
  assert.ok(f.buttons.every(b=>!b.active&&b.pressed==='false'));
  f.context.directInput('x');assert.deepEqual(f.sent,[{kind:'input',value:'x'}]);
});
test('toggling a modifier projects to both rail and panel; arrow consumes it once',()=>{
  const f=fixture();f.buttons[0].onclick();assert.ok(f.buttons.every(b=>b.active&&b.pressed==='true'));
  f.context.sendKey('←');assert.ok(f.buttons.every(b=>!b.active&&b.pressed==='false'));
  f.context.directInput('x');assert.deepEqual(f.sent,[{kind:'key',value:'Ctrl+←'},{kind:'input',value:'x'}]);
});
test('literal plus stays a plus when translating a shortcut chord',()=>{
  const context=vm.createContext({});
  vm.runInContext(html.slice(html.indexOf('function normalizedKey('),html.indexOf('function sendTerminal(')),context);
  assert.equal(context.normalizedKey('+'),'+');
  assert.equal(context.normalizedKey('Ctrl-+'),'Ctrl-+');
  assert.equal(context.normalizedKey('Ctrl+←'),'Ctrl-Left');
});
