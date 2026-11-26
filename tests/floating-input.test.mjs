import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { RenderGrid } from '../grid.mjs';
import { KanaComposer } from '../kana.mjs';
import { installPopover } from './popover-fixture.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function client(saved={}) {
 const dom=new JSDOM(html,{url:'https://pokemux-test.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem('cmux-pocket-customizations',JSON.stringify({shortcuts:[],snippets:[],...saved}));
 w.ResizeObserver=class{observe(){} disconnect(){}};w.matchMedia=()=>({matches:true});w.visualViewport={width:428,height:926,scale:1,offsetTop:0,offsetLeft:0,addEventListener(){}};
 installPopover(w);w.HTMLElement.prototype.setPointerCapture=()=>{};w.EventSource=class{addEventListener(){} close(){}};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.show=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.actions=[];w.fetch=async(path,options)=>{if(path==='/api/action')w.actions.push(JSON.parse(options.body));return {ok:true,status:200,json:async()=>({})}};
 w.__RenderGrid=RenderGrid;w.__KanaComposer=KanaComposer;
 const script=html.split('<script type="module">\n')[1].split('</script>')[0];
 w.eval(script.slice(0,script.lastIndexOf('(async()=>{'))+`
  RenderGrid=window.__RenderGrid;KanaComposer=window.__KanaComposer;kana=new KanaComposer();
  current=workspace('owned-workspace','Owned workspace',null,'','',[pane('owned-pane',[surface('owned-surface','Owned terminal'),surface('owned-other','Other terminal')])],'owned-window');workspaces.push(current);selectedWindow=current.window;connected=true;render();syncFloating();
  window.fixture={runFloating,sendKey,displaySettings,appMenu,languageDialog,preferences,floatingChoices,syncFloating,switchTerminal(){selectSurface('owned-pane','owned-other')}};
 `);
 return dom;
}
const flush=w=>new Promise(resolve=>w.setTimeout(resolve,0));
test('handle and expanded-button transparency migrate together, then change and persist independently',()=>{
 const dom=client({floatingTransparency:35}),w=dom.window,d=w.document;let saved;
 try{
  w.fixture.displaySettings();const handles=d.querySelector('#floatingTransparency'),buttons=d.querySelector('#floatingButtonsTransparency');assert.ok(buttons,'Expanded buttons have their own slider');assert.equal(Number(buttons.value),Number(handles.value));
  handles.value='15';handles.dispatchEvent(new w.Event('input'));assert.equal(buttons.value,'35');buttons.value='60';buttons.dispatchEvent(new w.Event('input'));assert.equal(handles.value,'15');saved=JSON.parse(w.localStorage.getItem('cmux-pocket-customizations'));
 }finally{w.close()}
 const reloaded=client(saved);try{reloaded.window.fixture.displaySettings();const d=reloaded.window.document;assert.equal(d.querySelector('#floatingTransparency').value,'15');assert.equal(d.querySelector('#floatingButtonsTransparency').value,'60')}finally{reloaded.window.close()}
});
test('floating function handle uses an unselectable icon rather than text',()=>{
 const dom=client(),w=dom.window,handle=w.document.querySelector('#floatingHandle');
 try{assert.ok(handle.querySelector('svg'));assert.equal(handle.textContent.trim(),'');assert.equal(w.getComputedStyle(handle).userSelect,'none');assert.equal(w.getComputedStyle(handle.querySelector('svg')).userSelect,'none')}finally{w.close()}
});
test('default and saved Scratchpad actions switch selection mode, persist it and agree with Settings while retaining custom actions',async()=>{
 for(const floatingFunctions of [undefined,['key:Ctrl-C','frequent','paste'],['key:Ctrl-C','recent','paste','keyboard'],['key:Ctrl-C','recent','paste','keyboard','scratchpad']]){
  const dom=client(floatingFunctions?{floatingFunctions}:{}),w=dom.window,d=w.document;
  try{
   const choice=d.querySelector('[data-function="4"]'),open=()=>d.querySelector('#floatingHandle').click();
   assert.equal(choice.textContent,'Box select');open();choice.click();
   assert.equal(d.documentElement.classList.contains('block-selection-default'),false);assert.equal(choice.textContent,'Native select');
   const saved=JSON.parse(w.localStorage.getItem('cmux-pocket-customizations'));assert.equal(saved.blockSelection,false);
   const reloaded=client(saved);try{assert.equal(reloaded.window.document.documentElement.classList.contains('block-selection-default'),false);assert.equal(reloaded.window.document.querySelector('[data-function="4"]').textContent,'Native select')}finally{reloaded.window.close()}
   w.fixture.displaySettings();const setting=d.querySelector('#blockSelectionEnabled');assert.equal(setting.checked,false);setting.checked=true;setting.dispatchEvent(new w.Event('change'));d.querySelector('#dialog').close();
   assert.equal(d.documentElement.classList.contains('block-selection-default'),true);assert.equal(choice.textContent,'Box select');
   open();choice.click();open();choice.click();assert.equal(d.documentElement.classList.contains('block-selection-default'),true);assert.equal(w.actions.length,0);
   if(floatingFunctions){open();d.querySelector('[data-function="0"]').click();await flush(w);assert.equal(w.actions.at(-1).key,'Ctrl-C')}
  }finally{w.close()}
 }
});
test('recent shortcut follows successful usage rather than historical frequency',async()=>{
 const dom=client({shortcutUsage:{'Ctrl-C':100}}),w=dom.window;
 try{w.fixture.sendKey('Ctrl-C');await flush(w);w.fixture.sendKey('Ctrl-W');await flush(w);w.fixture.syncFloating();const recent=w.document.querySelector('#floatingFunctions [data-function="1"]');assert.equal(recent.textContent,'Ctrl-W');await w.fixture.runFloating('recent');await flush(w);assert.equal(w.actions.at(-1).key,'Ctrl-W')}finally{w.close()}
});
test('denied drag-release clipboard access exposes an explicit native paste surface and retains destination',async()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{Object.defineProperty(w.navigator,'clipboard',{value:{readText:async()=>{throw new w.DOMException('The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.','NotAllowedError')}}});await w.fixture.runFloating('paste');assert.equal(d.querySelector('#dialog').open,true);const field=d.querySelector('#nativePaste');assert.ok(field);assert.match(d.querySelector('#dialogBody').textContent,/clipboard access.*blocked/i);w.fixture.switchTerminal();const event=new w.Event('paste',{bubbles:true,cancelable:true});event.clipboardData={getData:()=> '日本語\nnext line'};field.dispatchEvent(event);await flush(w);assert.equal(w.actions.length,1);assert.equal(w.actions[0].action,'paste');assert.equal(w.actions[0].text,'日本語\nnext line');assert.equal(w.actions[0].surface_id,'owned-surface');assert.equal(d.querySelector('#dialog').open,false)}finally{w.close()}
});
test('clipboard reading starts in the triggering call stack and paste does not append Return',async()=>{
 const dom=client(),w=dom.window;let read=false;
 try{Object.defineProperty(w.navigator,'clipboard',{value:{readText:()=>{read=true;return Promise.resolve('pasted text')}}});const paste=w.fixture.runFloating('paste');assert.equal(read,true);await paste;await flush(w);assert.equal(w.actions.length,1);assert.equal(w.actions[0].action,'paste');assert.equal(w.actions[0].text,'pasted text')}finally{w.close()}
});
test('unexpected clipboard failures stay visible and reject instead of masquerading as permission denial',async()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{const error=new Error('Clipboard transport failed');Object.defineProperty(w.navigator,'clipboard',{value:{readText:()=>Promise.reject(error)}});await assert.rejects(w.fixture.runFloating('paste'),error);assert.equal(d.querySelector('#nativePaste'),null);assert.match(d.querySelector('#toast').textContent,/Clipboard transport failed/)}finally{w.close()}
});
