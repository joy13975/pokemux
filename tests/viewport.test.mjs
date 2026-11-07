import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const compactSource=html.match(/^function compactLayout\(\).*$/m)[0];
const source=html.slice(html.indexOf('function syncViewport()'),html.indexOf('function insertText('));
function fixture(restoreOverview=true,scrolling=false,geometry={width:390,layoutWidth:390,layoutHeight:844},device={width:390,height:844,coarse:true}){
 const input={},properties={},root={clientHeight:geometry.layoutHeight,clientWidth:geometry.layoutWidth,style:{setProperty:(k,v)=>properties[k]=v},classList:{toggle:(k,v)=>properties[k]=v}};
 const context=vm.createContext({screen:device,matchMedia:()=>({matches:device.coarse}),window:{innerHeight:geometry.layoutHeight,visualViewport:{width:geometry.width,height:844,scale:1,offsetTop:0,offsetLeft:0}},document:{documentElement:root,activeElement:input},inputSurface:()=>input,joystickSteering:false,edgeContact:scrolling?{scroll:{}}:undefined,customInput:()=>false,preferences:{restoreOverview},manualScale:1.3,terminalTyping:true,keyboardVisible:true,restingHeight:844,viewportWidth:geometry.layoutWidth,$:()=>({classList:{toggle:(k,v)=>properties[k]=v}}),syncViewportLayer(){},syncSidebarState(){},syncTerminalEditing(){},fitTerminal(){},syncFloating(){},syncDock(){},syncPanelLayout(){},requestAnimationFrame:fn=>fn(),revealInputLine(){}});
 vm.runInContext(compactSource+'\n'+source,context);
 return {openKeyboard(){context.terminalTyping=true},resize(height,scale=1,layout=844,width=geometry.width/scale,layoutWidth=geometry.layoutWidth){root.clientHeight=layout;root.clientWidth=layoutWidth;context.window.visualViewport.width=width;context.window.visualViewport.height=height;context.window.visualViewport.scale=scale;context.syncViewport();return {...properties,manualScale:context.manualScale}}};
}
test('keyboard reduces available layout height',()=>{const p=fixture().resize(430);assert.equal(p['--viewport-height'],'430px');assert.equal(p['keyboard-open'],true)});
test('manual pinch does not masquerade as keyboard; pinch with keyboard retains reduced height',()=>{const f=fixture();assert.equal(f.resize(422,2)['keyboard-open'],false);assert.equal(f.resize(215,2)['keyboard-open'],true);assert.equal(f.resize(215,2)['--viewport-height'],'215px')});
test('closing keyboard resets local pinch to saved readable size by default; disabling restore retains pinch',()=>{assert.equal(fixture().resize(844).manualScale,null);assert.equal(fixture(false).resize(844).manualScale,1.3)});
test('shortcut strip returns on second keyboard opening even when layout viewport shrinks too',()=>{const f=fixture();for(let cycle=0;cycle<2;cycle++){f.openKeyboard();assert.equal(f.resize(430,1,430).typing,true,`keyboard cycle ${cycle+1} must show shortcuts`);assert.equal(f.resize(844).typing,false);}});

test('keyboard closure during a content drawer pull preserves its zoom boundary',()=>{assert.equal(fixture(true,true).resize(844).manualScale,1.3)});

test('native half-scale and stale double-sized layout roots do not masquerade as an open keyboard',()=>{const f=fixture(true,false,{width:420,layoutWidth:840,layoutHeight:1688});assert.equal(f.resize(1688,.5,1688)['keyboard-open'],false);assert.equal(f.resize(844,1,1688)['keyboard-open'],false);assert.equal(f.resize(428,1,1688)['keyboard-open'],true)});

test('iPhone rotation keeps the sidebar in drawer mode at the reported 1088-point visual width',()=>{
 const geometry={width:420,layoutWidth:840,layoutHeight:1688};
 const phone=fixture(true,false,geometry,{width:420,height:912,coarse:true});
 assert.equal(phone.resize(1688,.5,1688)['landscape-layout'],false);
 const rotated=phone.resize(840,.5965909361839294,840,1824,1824);
 assert.equal(rotated['compact-layout'],true,'Safari rotation must keep the phone drawer dismissible');
 assert.equal(rotated['landscape-layout'],true,'Landscape safe areas and shortcuts must still apply');
 const desktop=fixture(true,false,{width:1088,layoutWidth:1088,layoutHeight:500},{width:1920,height:1080,coarse:false});
 assert.equal(desktop.resize(500,1,500)['wide-layout'],true);
});
