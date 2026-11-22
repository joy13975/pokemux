import { homedir } from 'node:os';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateFixtureRPC} from '../tests/fixture-ownership.mjs';
export async function* verifyTabOrder(tab,cdp){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8'));
 assert.ok((await tab.url()).endsWith(`/${info.workspaceId}/${info.surfaceId}`));
 const native=async()=>JSON.parse(await readFile(new URL('state/tab-order-native.json',root),'utf8')).panes;
 const phone=()=>tab.playwright.locator('.surfacetab').evaluateAll(bs=>bs.map(b=>b.dataset.surface));
 const before=await native(),pane=before.find(p=>p.tabs.includes(info.surfaceId)),original=pane.tabs;
 const box=s=>tab.playwright.locator(s).evaluate(e=>e.getBoundingClientRect().toJSON());
 const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 const tap=async s=>{const r=await box(s);await touch('touchStart',[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]);await touch('touchEnd');await tab.getAXState({emit:false})};
 const hold=async id=>{const r=await box(`[data-surface="${id}"]`);await touch('touchStart',[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]);await new Promise(r=>setTimeout(r,600));await touch('touchEnd');await tab.getAXState({emit:false})};
 const wait=async test=>{const until=Date.now()+5000;while(!await test()){if(Date.now()>until)return false;await new Promise(r=>setTimeout(r,30))}return true};
 const target=[info.secondSurfaceId,info.surfaceId],checks=[];
 await hold(info.secondSurfaceId);assert.equal(await tab.playwright.locator('#dialog').getAttribute('open'),'');await tap('#tabLeft');
 yield {snapshotRequired:'after-phone-left',phone:await phone()};
 const current=await native(),synced=JSON.stringify(current[0].tabs)===JSON.stringify(target)&&JSON.stringify(await phone())===JSON.stringify(target);
 const first={time:new Date().toISOString(),passed:synced,phone:await phone(),native:current,original,expected:target};
 await writeFile(new URL('state/tab-order-move-reproduction.json',root),JSON.stringify(first,null,2)+'\n');assert.ok(synced,'Phone Move left must change native cmux order, not only a local preference');
 assert.equal(current[0].active,info.secondSurfaceId,'Native reorder selects its moved tab');assert.equal(await tab.playwright.locator('.surfacetab.active').getAttribute('data-surface'),info.secondSurfaceId);assert.equal(await tab.playwright.locator('#dialog').getAttribute('open'),'');
 assert.equal(await tab.playwright.locator('#tabLeft').getAttribute('disabled'),'');checks.push('Finger hold and Move left update native order while keeping controls open');yield checks.at(-1);
 await tap('#tabRight');yield {snapshotRequired:'after-phone-right',phone:await phone()};assert.equal(JSON.stringify((await native())[0].tabs),JSON.stringify(original));assert.equal(JSON.stringify(await phone()),JSON.stringify(original));assert.equal(await tab.playwright.locator('#dialog').getAttribute('open'),'');checks.push('Move right restores native order and selects the moved native tab');yield checks.at(-1);
 await tab.reload();await tab.getAXState({emit:false});assert.equal(JSON.stringify(await phone()),JSON.stringify(original));
 yield {nativeReorderRequired:true};assert.ok(await wait(async()=>JSON.stringify(await phone())===JSON.stringify(target)),'Desktop-side native reorder reaches the phone');
 await tab.reload();await tab.getAXState({emit:false});assert.equal(JSON.stringify(await phone()),JSON.stringify(target));assert.equal((await native())[0].active,info.secondSurfaceId);assert.equal(await tab.playwright.locator('.surfacetab.active').getAttribute('data-surface'),info.secondSurfaceId);
 checks.push('Native reorder is mirrored without a phone gesture and survives refresh');yield checks.at(-1);
 const screenshot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(new URL('proof-native-tab-order.png',root),Buffer.from(screenshot.data,'base64'));
 const hashes={};for(const f of ['index.html','bridge.mjs'])hashes[f]=createHash('sha256').update(await readFile(new URL(f,root))).digest('hex');
 const result={passed:true,time:new Date().toISOString(),scope:'Chrome iPhone13ProMax428x879 actual finger UI and stock cmux native pane inventory in owned workspace',checks,before,after:await native(),phone:await phone(),hashes};await writeFile(new URL('BROWSER_TAB_ORDER_RESULT.json',root),JSON.stringify(result,null,2)+'\n');return result;
}

export async function snapshotNativeTabOrder(reorder=false){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8'));
 const rpc=(method,params)=>JSON.parse(execFileSync('/Applications/cmux.app/Contents/Resources/bin/cmux',['--socket',`${homedir()}/.local/state/cmux/cmux.sock`,'--json','rpc',method,JSON.stringify(params)],{encoding:'utf8'}));
 let panes=rpc('pane.list',{workspace_id:info.workspaceId}).panes;
 if(reorder){const params={workspace_id:info.workspaceId,surface_id:info.secondSurfaceId,before_surface_id:info.surfaceId,focus:false};validateFixtureRPC('surface.reorder',params,{windowId:info.windowId,workspaces:new Set([info.workspaceId]),groups:new Set(),panes:new Set(panes.map(p=>p.id)),surfaces:new Set([info.surfaceId,info.secondSurfaceId])});rpc('surface.reorder',params);panes=rpc('pane.list',{workspace_id:info.workspaceId}).panes}
 await writeFile(new URL('state/tab-order-native.json',root),JSON.stringify({time:new Date().toISOString(),panes:panes.map(p=>({id:p.id,active:p.selected_surface_id,tabs:p.surface_ids}))},null,2)+'\n');
}

export async function* verifyTabDrag(tab,cdp){
 const root=new URL('../',import.meta.url),info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8'));
 const native=async()=>JSON.parse(await readFile(new URL('state/tab-order-native.json',root),'utf8')).panes;
 const before=await native(),pane=before.find(p=>p.tabs.includes(info.secondSurfaceId)),expected=pane.tabs.filter(id=>id!==info.secondSurfaceId);expected.splice(expected.indexOf(info.surfaceId)+1,0,info.secondSurfaceId);
 const box=id=>tab.playwright.locator(`[data-surface="${id}"]`).evaluate(e=>e.getBoundingClientRect().toJSON());
 const source=await box(info.secondSurfaceId),target=await box(info.surfaceId);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:source.x+source.width/2,y:source.y+source.height/2}]});
 await new Promise(r=>setTimeout(r,400));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:target.right-6,y:target.y+target.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await tab.getAXState({emit:false});
 yield {snapshotRequired:'after-held-tab-drag'};
 const after=await native(),phone=await tab.playwright.locator('.surfacetab').evaluateAll(es=>es.map(e=>e.dataset.surface));
 assert.deepEqual(after.find(p=>p.id===pane.id).tabs,expected);assert.equal(JSON.stringify(phone),JSON.stringify(expected));assert.equal(after.find(p=>p.id===pane.id).active,info.secondSurfaceId);assert.equal(await tab.playwright.locator('.surfacetab.active').getAttribute('data-surface'),info.secondSurfaceId);
 const result={passed:true,time:new Date().toISOString(),before,after,phone,expected,scope:'Actual held finger drag to native same-pane anchor; other tabs preserved'};
 await writeFile(new URL('BROWSER_TAB_DRAG_RESULT.json',root),JSON.stringify(result,null,2)+'\n');return result;
}
