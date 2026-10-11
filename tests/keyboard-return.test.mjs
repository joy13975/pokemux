import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { RenderGrid } from '../grid.mjs';
import { KanaComposer } from '../kana.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function client(saved={}) {
 const dom=new JSDOM(html,{url:'https://pokemux-test.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem('cmux-pocket-customizations',JSON.stringify({shortcuts:[],snippets:[],...saved}));
 w.ResizeObserver=class{observe(){} disconnect(){}};w.matchMedia=()=>({matches:true});w.visualViewport={width:428,height:926,scale:1,offsetTop:0,offsetLeft:0,addEventListener(){}};
 w.HTMLElement.prototype.setPointerCapture=()=>{};w.EventSource=class{addEventListener(){} close(){}};
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
test('both menu and fourth floating action return to Pokemux keyboard and preserve Japanese preference',async()=>{
 for(const path of ['menu','floating']){const dom=client({keyboardMode:'native',keyboardLanguage:'system',customKeyboardLanguage:'katakana'}),w=dom.window,d=w.document;
 try{if(path==='menu'){w.fixture.appMenu();const button=d.querySelector('#menuPokemuxKeyboard');assert.ok(button);button.click()}else{d.querySelector('#floatingHandle').click();d.querySelector('#floatingFunctions [data-function="3"]').click()}assert.equal(w.fixture.preferences.keyboardMode,'custom');assert.equal(w.fixture.preferences.keyboardLanguage,'katakana');assert.equal(d.querySelector('.terminal').getAttribute('inputmode'),'none');assert.equal(d.querySelector('#dialog').open,false);w.fixture.appMenu();assert.equal(d.querySelector('#menuPokemuxKeyboard'),null)}finally{w.close()}}
});
test('language picker remembers custom Japanese mode across a system keyboard round trip',()=>{
 const dom=client(),w=dom.window,d=w.document;
 try{w.fixture.languageDialog();d.querySelector('#languageKatakana').click();w.fixture.languageDialog();d.querySelector('#languageSystem').click();assert.equal(w.fixture.preferences.customKeyboardLanguage,'katakana');w.fixture.appMenu();d.querySelector('#menuPokemuxKeyboard').click();assert.equal(w.fixture.preferences.keyboardLanguage,'katakana')}finally{w.close()}
});
test('existing three custom floating actions survive and receive a fourth keyboard action',()=>{
 const dom=client({floatingFunctions:['key:Ctrl-C','frequent','paste']}),w=dom.window;
 try{assert.deepEqual([...w.fixture.floatingChoices()],['key:Ctrl-C','recent','paste','keyboard']);w.fixture.displaySettings();assert.equal(w.document.querySelectorAll('[data-function-setting]').length,4);assert.equal(w.document.querySelectorAll('#floatingFunctions [data-function]').length,4)}finally{w.close()}
});
