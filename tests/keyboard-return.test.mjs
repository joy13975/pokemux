import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { RenderGrid } from '../grid.mjs';
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
 w.__RenderGrid=RenderGrid;w.__KanaComposer=KanaComposer;w.__KeyboardDecoder=KeyboardDecoder;w.__calibrate=calibrate;
 const script=html.split('<script type="module">\n')[1].split('</script>')[0];
 if(boot){w.ready=w.eval(script.replace("await import('./grid.mjs')","{RenderGrid:window.__RenderGrid}").replace("await import('./keyboard.mjs')","{KeyboardDecoder:window.__KeyboardDecoder,calibrate:window.__calibrate}").replace("await import('./kana.mjs')","{KanaComposer:window.__KanaComposer}"));return dom}
 w.eval(script.slice(0,script.lastIndexOf('(async()=>{'))+`
  RenderGrid=window.__RenderGrid;KanaComposer=window.__KanaComposer;kana=new KanaComposer();
  current=workspace('owned-workspace','Owned workspace',null,'','',[pane('owned-pane',[surface('owned-surface','Owned terminal'),surface('owned-other','Other terminal')])],'owned-window');workspaces.push(current);selectedWindow=current.window;connected=true;render();syncFloating();
  window.fixture={runFloating,sendKey,displaySettings,appMenu,languageDialog,preferences,floatingChoices,syncFloating,switchTerminal(){selectSurface('owned-pane','owned-other')}};
 `);
 return dom;
}
test('existing three custom floating actions survive and receive a fourth keyboard action',()=>{
 const dom=client({floatingFunctions:['key:Ctrl-C','frequent','paste']}),w=dom.window;
 try{assert.deepEqual([...w.fixture.floatingChoices()],['key:Ctrl-C','recent','paste','keyboard','scratchpad']);w.fixture.displaySettings();assert.equal(w.document.querySelectorAll('[data-function-setting]').length,5);assert.equal(w.document.querySelectorAll('#floatingFunctions [data-function]').length,5)}finally{w.close()}
});
test('custom input still accepts a physical keyboard while terminal focus is released',async()=>{
 const dom=client({keyboardMode:'custom',keyboardLanguage:'english'}),w=dom.window,d=w.document;
 try{d.querySelector('.terminalwrap').click();
 d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'x',bubbles:true}));await new Promise(r=>setTimeout(r,0));
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
