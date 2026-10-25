import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function syncViewport()'),html.indexOf('function insertText('));
function fixture(restoreOverview=true){
 const input={},properties={},root={clientHeight:844,clientWidth:390,style:{setProperty:(k,v)=>properties[k]=v},classList:{toggle:(k,v)=>properties[k]=v}};
 const context=vm.createContext({window:{innerHeight:844,visualViewport:{height:844,scale:1,offsetTop:0}},document:{documentElement:root,activeElement:input},inputSurface:()=>input,joystickSteering:false,customInput:()=>false,preferences:{restoreOverview},manualScale:1.3,terminalTyping:true,keyboardVisible:true,restingHeight:844,viewportWidth:390,$:()=>({classList:{toggle:(k,v)=>properties[k]=v}}),fitTerminal(){},syncFloating(){},syncDock(){},syncPanelLayout(){},requestAnimationFrame:fn=>fn(),revealInputLine(){}});
 vm.runInContext(source,context);
 return {resize(height,scale=1,layout=844){root.clientHeight=layout;context.window.visualViewport.height=height;context.window.visualViewport.scale=scale;context.syncViewport();return {...properties,manualScale:context.manualScale}}};
}
test('keyboard reduces available layout height',()=>{const p=fixture().resize(430);assert.equal(p['--viewport-height'],'430px');assert.equal(p['keyboard-open'],true)});
test('manual pinch does not masquerade as keyboard; pinch with keyboard retains reduced height',()=>{const f=fixture();assert.equal(f.resize(422,2)['keyboard-open'],false);assert.equal(f.resize(215,2)['keyboard-open'],true);assert.equal(f.resize(215,2)['--viewport-height'],'215px')});
test('closing keyboard resets local pinch to saved readable size by default; disabling restore retains pinch',()=>{assert.equal(fixture().resize(844).manualScale,null);assert.equal(fixture(false).resize(844).manualScale,1.3)});
test('shortcut strip returns on second keyboard opening even when layout viewport shrinks too',()=>{const f=fixture();for(let cycle=0;cycle<2;cycle++){assert.equal(f.resize(430,1,430).typing,true,`keyboard cycle ${cycle+1} must show shortcuts`);assert.equal(f.resize(844).typing,false);}});
