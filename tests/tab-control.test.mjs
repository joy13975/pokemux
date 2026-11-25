import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {CmuxBridge} from '../bridge.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function fixture(){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,close(){this.closed=true}});return nodes.get(id)};
 const surfaces=['one','two','three'].map(id=>({id,name:id})),current={id:'workspace',window:'window',activePane:'pane',panes:[{id:'pane',active:'two',tabs:surfaces}]},nextOrders=[],actions=[];
 const ctx=vm.createContext({current,$:node,esc:String,connected:true,openDialog(title,body){node('dialog').closed=false;node('dialogTitle').textContent=title;node('dialogBody').innerHTML=body;for(const id of ['tabLeft','tabRight','tabClose'])node(id).disabled=new RegExp(`id="${id}"[^>]*disabled`).test(body)},orderedTabs:()=>current.panes.flatMap(pane=>pane.tabs.map(surface=>({pane,surface}))),activeSurface:()=>current.panes.find(p=>p.id===current.activePane).tabs.find(s=>s.id===current.panes.find(p=>p.id===current.activePane).active),history:{replaceState(){}},mods:{clear(){}},renameTab(){},api:async(path,body)=>actions.push(body),loadTree:async()=>{const order=nextOrders.shift();if(order)current.panes[0].tabs=order.map(id=>surfaces.find(s=>s.id===id))},say(){}});
 vm.runInContext(html.slice(html.indexOf('async function reorderTab('),html.indexOf('function selectSurface(')),ctx);
 return {ctx,node,current,nextOrders,actions};
}
test('moving a tab keeps controls open and reads native order after each repeated move',async()=>{
 const {ctx,node,current,nextOrders,actions}=fixture(),order=()=>current.panes[0].tabs.map(s=>s.id);
 nextOrders.push(['two','one','three'],['one','two','three'],['one','three','two']);
 ctx.tabActions('pane','two');await node('tabLeft').onclick();
 assert.notEqual(node('dialog').closed,true);assert.deepEqual(order(),['two','one','three']);assert.equal(node('tabLeft').disabled,true);assert.equal(node('tabRight').disabled,false);
 await node('tabRight').onclick();await node('tabRight').onclick();assert.deepEqual(order(),['one','three','two']);assert.equal(node('tabRight').disabled,true);assert.notEqual(node('dialog').closed,true);
 assert.deepEqual(actions.map(a=>({action:a.action,source:a.surface_id,anchor:a.reference_surface_id,after:a.after})),[{action:'reorder',source:'two',anchor:'one',after:false},{action:'reorder',source:'two',anchor:'one',after:true},{action:'reorder',source:'two',anchor:'three',after:true}]);
 ctx.connected=false;ctx.tabActions('pane','two');assert.equal(node('tabLeft').disabled,true);assert.equal(node('tabRight').disabled,true);assert.equal(current.panes[0].active,'two');
});
test('tab controls provide explicit close and reject delivery while disconnected',async()=>{
 const {ctx,node}=fixture();const calls=[];ctx.api=async(path,body)=>calls.push({path,body});ctx.tabActions('pane','two');
 await node('tabClose').onclick();assert.equal(calls.length,1);assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{path:'action',body:{action:'close',workspace_id:'workspace',surface_id:'two'}});
 ctx.connected=false;ctx.tabActions('pane','one');assert.equal(node('tabClose').disabled,true);
});
test('close validates live target membership before the exact native surface close',async()=>{
 const workspace_id=randomUUID(),surface_id=randomUUID(),bridge=new CmuxBridge(),calls=[];let valid=true;
 bridge.rpc=async(method,params)=>{calls.push({method,params});if(method==='system.tree')return {windows:[]};if(method==='surface.health'||method==='surface.list')return{workspace_id,surfaces:valid?[{id:surface_id,type:'terminal'},{id:randomUUID(),type:'terminal'}]:[]};return{surface_id}};
 await bridge.action({action:'close',workspace_id,surface_id});assert.deepEqual(calls[1],{method:'surface.close',params:{workspace_id,surface_id,force:true}});
 valid=false;await assert.rejects(bridge.action({action:'close',workspace_id,surface_id}),/no longer/);assert.equal(calls.length,4);
});
test('closing the only live surface closes its workspace, while another browser surface keeps it open',async()=>{
 const workspace_id=randomUUID(),surface_id=randomUUID(),bridge=new CmuxBridge();let surfaces=[{id:surface_id,type:'terminal'}],workspaceOpen=true,closed=[];
 bridge.rpc=async(method,params)=>{
  if(method==='system.tree')return {windows:workspaceOpen?[{workspaces:[{id:workspace_id,panes:[{surfaces}]}]}]:[]};
  if(method==='surface.health'||method==='surface.list')return {workspace_id,surfaces};
  if(method==='surface.close'){if(surfaces.length===1)throw new Error('cmux surface.close rejected (invalid_state)');surfaces=surfaces.filter(s=>s.id!==params.surface_id);closed.push(params.surface_id);return {surface_id}}
  if(method==='workspace.close'){assert.equal(params.workspace_id,workspace_id);workspaceOpen=false;surfaces=[];return {workspace_id}}
  throw new Error(method);
 };
 try{
  await bridge.action({action:'close',workspace_id,surface_id});assert.equal(workspaceOpen,false);assert.deepEqual(surfaces,[]);
  workspaceOpen=true;surfaces=[{id:surface_id,type:'terminal'},{id:randomUUID(),type:'browser'}];
  await bridge.action({action:'close',workspace_id,surface_id});assert.equal(workspaceOpen,true);assert.equal(surfaces.length,1);assert.equal(surfaces[0].type,'browser');assert.deepEqual(closed,[surface_id]);
 }finally{bridge.close()}
});
test('a target removed before close inventory validation cannot close its remaining sibling workspace',async()=>{
 const workspace_id=randomUUID(),surface_id=randomUUID(),sibling={id:randomUUID(),type:'terminal'},bridge=new CmuxBridge();let workspaceOpen=true;
 bridge.rpc=async(method,params)=>{
  if(method==='surface.health')return {workspace_id,surfaces:params.surface_id?[{id:surface_id,type:'terminal'}]:[sibling]};
  if(method==='surface.list')return {workspace_id,surfaces:[sibling]};
  if(method==='workspace.close'){workspaceOpen=false;return {workspace_id}}
  throw new Error(method);
 };
 try{await assert.rejects(bridge.action({action:'close',workspace_id,surface_id}),/no longer/);assert.equal(workspaceOpen,true)}finally{bridge.close()}
});


test('native reorder validates sibling pane membership and supports nonterminal tabs with scoped native anchors',async()=>{
 const workspace_id=randomUUID(),surface_id=randomUUID(),reference_surface_id=randomUUID(),pane_id=randomUUID(),other_pane=randomUUID(),bridge=new CmuxBridge(),calls=[];
 let siblings=[{id:surface_id,type:'browser',pane_id},{id:reference_surface_id,type:'terminal',pane_id}];
 bridge.rpc=async(method,params)=>{calls.push({method,params});if(['surface.list','surface.health'].includes(method))return {workspace_id,surfaces:siblings};if(method==='surface.reorder')return {surface_id};throw new Error(method)};
 try{
  await bridge.action({action:'reorder',workspace_id,surface_id,reference_surface_id,after:false});
  assert.deepEqual(calls.at(-1),{method:'surface.reorder',params:{workspace_id,surface_id,before_surface_id:reference_surface_id,focus:false}});
  await bridge.action({action:'reorder',workspace_id,surface_id,reference_surface_id,after:true});
  assert.deepEqual(calls.at(-1),{method:'surface.reorder',params:{workspace_id,surface_id,after_surface_id:reference_surface_id,focus:false}});
  siblings[1].pane_id=other_pane;await assert.rejects(bridge.action({action:'reorder',workspace_id,surface_id,reference_surface_id,after:false}),/same pane/);
  siblings=[siblings[0]];await assert.rejects(bridge.action({action:'reorder',workspace_id,surface_id,reference_surface_id,after:false}),/no longer/);
  assert.equal(calls.filter(c=>c.method==='surface.reorder').length,2,'Invalid or moved anchors never reach a native mutation');
 }finally{bridge.close()}
});
