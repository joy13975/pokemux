import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { RenderGrid } from '../grid.mjs';
import { BlockSelection } from '../block-selection.mjs';
import { KeyboardDecoder, calibrate } from '../keyboard.mjs';
import { KanaComposer } from '../kana.mjs';
import { installPopover } from './popover-fixture.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function client(saved={},boot=false) {
 const dom=new JSDOM(html,{url:'https://pokemux-test.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem('cmux-pocket-customizations',JSON.stringify({shortcuts:[],snippets:[],...saved}));
 w.ResizeObserver=class{observe(){} disconnect(){}};w.matchMedia=()=>({matches:true});w.visualViewport={width:428,height:926,scale:1,offsetTop:0,offsetLeft:0,addEventListener(){}};
 installPopover(w);w.HTMLElement.prototype.setPointerCapture=()=>{};w.EventSource=class{addEventListener(){} close(){}};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.show=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.isSecureContext=true;
 const tree={notifications:[],windows:[{id:'owned-window',groups:[],workspaces:[{id:'owned-workspace',title:'Owned workspace',panes:[{id:'owned-pane',selected_surface_id:'owned-surface',surfaces:[{id:'owned-surface',type:'terminal',title:'Owned terminal'}]}]}]}]};
 const responses={'/api/auth':{authenticated:true},'/api/status':{connected:true},'/api/tree':tree};
 w.actions=[];w.fetch=async(path,options)=>{if(path==='/api/action')w.actions.push(JSON.parse(options.body));return {ok:true,status:200,json:async()=>responses[path]??{}}};
 w.__BlockSelection=BlockSelection;w.__RenderGrid=RenderGrid;w.__KanaComposer=KanaComposer;w.__KeyboardDecoder=KeyboardDecoder;w.__calibrate=calibrate;
 const script=html.split('<script type="module">\n')[1].split('</script>')[0];
 if(boot){w.ready=w.eval(script.replace("await import('./grid.mjs')","{RenderGrid:window.__RenderGrid}").replaceAll("await import('./block-selection.mjs')","{BlockSelection:window.__BlockSelection}").replace("await import('./keyboard.mjs')","{KeyboardDecoder:window.__KeyboardDecoder,calibrate:window.__calibrate}").replace("await import('./kana.mjs')","{KanaComposer:window.__KanaComposer}"));return dom}
 w.eval(script.slice(0,script.lastIndexOf('(async()=>{'))+`
  RenderGrid=window.__RenderGrid;KanaComposer=window.__KanaComposer;kana=new KanaComposer();
  current=workspace('owned-workspace','Owned workspace',null,'','',[pane('owned-pane',[surface('owned-surface','Owned terminal'),surface('owned-other','Other terminal')])],'owned-window');workspaces.push(current);selectedWindow=current.window;connected=true;render();syncFloating();
  window.fixture={runFloating,sendKey,displaySettings,appMenu,languageDialog,preferences,floatingChoices,syncFloating,setConnection,switchTerminal(){selectSurface('owned-pane','owned-other')}};
 `);
 return dom;
}
test('existing three custom floating actions survive and receive a fourth keyboard action',()=>{
 const dom=client({floatingFunctions:['key:Ctrl-C','frequent','paste']}),w=dom.window;
 try{assert.deepEqual([...w.fixture.floatingChoices()],['key:Ctrl-C','recent','paste','keyboard','scratchpad']);w.fixture.displaySettings();assert.equal(w.document.querySelectorAll('[data-function-setting]').length,5);assert.equal(w.document.querySelectorAll('#floatingFunctions [data-function]').length,5)}finally{w.close()}
});
test('custom input still accepts a physical keyboard while terminal focus is released',{timeout:5000},async()=>{
 const dom=client({keyboardMode:'custom',keyboardLanguage:'english'}),w=dom.window,d=w.document;
 try{d.querySelector('.terminalwrap').click();
 let received;const delivery=new Promise(resolve=>received=resolve),fetch=w.fetch;w.fetch=(path,options)=>{const reply=fetch(path,options);if(path==='/api/action'&&JSON.parse(options.body).action==='input')received();return reply};
 d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'x',bubbles:true}));await delivery;
 assert.equal(w.actions.length,1);assert.equal(w.actions[0].action,'input');assert.equal(w.actions[0].text,'x');
 w.fixture.appMenu();d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'y',bubbles:true}));await new Promise(r=>setTimeout(r,0));assert.equal(w.actions.length,1);
 }finally{w.close()}
});

test('authenticated startup with a saved emulated keyboard offers only the native toggle',async()=>{
 const dom=client({keyboardMode:'custom',keyboardDefaultVersion:1,keyboardLanguage:'katakana'},true),w=dom.window,d=w.document;
 try{
  await w.ready;
  const terminal=d.querySelector('.terminal'),floating=d.querySelector('[data-function="3"]');
  assert.ok(terminal);
  assert.notEqual(d.activeElement,terminal);
  d.querySelector('#floatingHandle').click();
  assert.equal(floating.textContent,'Show keyboard');
  floating.click();
  assert.equal(d.activeElement,terminal);
  assert.equal(terminal.getAttribute('inputmode'),'text');
  assert.equal(d.querySelector('#softwareKeyboard').hidden,true);
  assert.equal(JSON.parse(w.localStorage.getItem('cmux-pocket-customizations')).customKeyboardLanguage,'katakana');
 }finally{w.close()}
});

test('right sidebar recovers once while pending, then selects the restored workspace and tab',async()=>{
 const dom=client({keyboardMode:'native',keyboardLanguage:'system'}),w=dom.window,d=w.document,calls=[];let finish;
 const restored={window_id:'restored-window',workspace_id:'restored-workspace',pane_id:'restored-pane',surface_id:'restored-tab'},fetch=w.fetch;
 w.fetch=async(path,options)=>{
  if(path==='/api/manage'){calls.push(JSON.parse(options.body));return new Promise(resolve=>finish=()=>resolve({ok:true,status:200,json:async()=>restored}))}
  if(path==='/api/tree')return {ok:true,status:200,json:async()=>({notifications:[],windows:[{id:restored.window_id,groups:[],workspaces:[{id:restored.workspace_id,title:'Recovered workspace',panes:[{id:restored.pane_id,selected_surface_id:restored.surface_id,surfaces:[{id:restored.surface_id,title:'Recovered tab',type:'terminal'}]}]}]}]})};
  return fetch(path,options);
 };
 try{
  w.fixture.appMenu();const button=d.querySelector('#menuRecoverTab');assert.ok(button,'The right sidebar offers Recover last closed tab');w.fixture.setConnection(false);assert.equal(button.disabled,true);w.fixture.setConnection(true);assert.equal(button.disabled,false);button.click();button.click();
  assert.deepEqual(calls,[{action:'recover-tab',window_id:'owned-window'}]);w.fixture.appMenu();assert.equal(d.querySelector('#menuRecoverTab').disabled,true,'Reopening the drawer cannot submit twice');
  finish();await new Promise(r=>w.setTimeout(r,0));assert.equal(d.querySelector('#dialog').open,false);assert.equal(w.location.hash,'#restored-window/restored-workspace/restored-tab');assert.equal(d.querySelector('#windowSelect').value,'restored-window');assert.equal(d.querySelector('[data-surface="restored-tab"]').classList.contains('active'),true);assert.equal(d.activeElement.closest('.terminal'),null,'Recovery cannot automatically activate the keyboard');
 }finally{w.close()}
});

test('failed recovery keeps its right sidebar action available and shows the native reason',async()=>{
 const dom=client(),w=dom.window,d=w.document,fetch=w.fetch;
 w.fetch=(path,options)=>path==='/api/manage'?Promise.resolve({ok:false,status:409,json:async()=>({error:'No closed tabs to recover'})}):fetch(path,options);
 try{w.fixture.appMenu();const button=d.querySelector('#menuRecoverTab');assert.ok(button);button.click();await new Promise(r=>w.setTimeout(r,0));assert.equal(d.querySelector('#dialog').open,true);assert.equal(button.disabled,false);assert.equal(d.querySelector('#toast').textContent,'No closed tabs to recover')}finally{w.close()}
});
