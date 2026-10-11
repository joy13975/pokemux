import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {CmuxBridge} from '../bridge.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function fixture(){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,close(){this.closed=true}});return nodes.get(id)};
 const surfaces=['one','two','three'].map(id=>({id,name:id})),current={id:'workspace',window:'window',activePane:'pane',panes:[{id:'pane',active:'two',tabs:surfaces}]},preferences={};
 const ctx=vm.createContext({current,preferences,$:node,esc:String,connected:true,orderedTabs:()=>{const order=preferences.tabOrder?.workspace||surfaces.map(s=>s.id);return order.map(id=>({pane:current.panes[0],surface:surfaces.find(s=>s.id===id)}))},openDialog(title,body){node('dialog').closed=false;node('dialogTitle').textContent=title;node('dialogBody').innerHTML=body;for(const id of ['tabLeft','tabRight','tabClose'])node(id).disabled=new RegExp(`id="${id}"[^>]*disabled`).test(body)},persistPreferences(){},mods:{clear(){}},render(){},activeSurface:()=>surfaces[1],history:{replaceState(){}},renameTab(){},api:async()=>({}),loadTree:async()=>{},say(){}});
 vm.runInContext(html.slice(html.indexOf('function reorderTab('),html.indexOf('function selectSurface(')),ctx);
 return {ctx,node,current,preferences};
}
test('moving a tab keeps controls open and updates both directional boundaries after repeated moves',()=>{
 const {ctx,node,preferences}=fixture();ctx.tabActions('pane','two');node('tabLeft').onclick();
 assert.notEqual(node('dialog').closed,true);assert.deepEqual(Array.from(preferences.tabOrder.workspace),['two','one','three']);assert.equal(node('tabLeft').disabled,true);assert.equal(node('tabRight').disabled,false);
 node('tabRight').onclick();node('tabRight').onclick();assert.deepEqual(Array.from(preferences.tabOrder.workspace),['one','three','two']);assert.equal(node('tabRight').disabled,true);assert.notEqual(node('dialog').closed,true);
});
test('tab controls provide explicit close and reject delivery while disconnected',async()=>{
 const {ctx,node}=fixture();const calls=[];ctx.api=async(path,body)=>calls.push({path,body});ctx.tabActions('pane','two');assert.match(node('dialogBody').innerHTML,/Close tab/);
 await node('tabClose').onclick();assert.equal(calls.length,1);assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{path:'action',body:{action:'close',workspace_id:'workspace',surface_id:'two'}});
 ctx.connected=false;ctx.tabActions('pane','one');assert.equal(node('tabClose').disabled,true);
});
test('close validates live target membership before the exact native surface close',async()=>{
 const workspace_id=randomUUID(),surface_id=randomUUID(),bridge=new CmuxBridge(),calls=[];let valid=true;
 bridge.rpc=async(method,params)=>{calls.push({method,params});if(method==='surface.health')return{workspace_id,surfaces:valid?[{id:surface_id,type:'terminal'}]:[]};return{surface_id}};
 await bridge.action({action:'close',workspace_id,surface_id});assert.deepEqual(calls[1],{method:'surface.close',params:{workspace_id,surface_id,force:true}});
 valid=false;await assert.rejects(bridge.action({action:'close',workspace_id,surface_id}),/no longer/);assert.equal(calls.length,3);
});
