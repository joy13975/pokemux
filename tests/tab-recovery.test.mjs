import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CmuxBridge,RequestError} from '../bridge.mjs';

test('recovery works after the workspace closed and waits for the newly restored native target',async()=>{
 const bridge=new CmuxBridge(),calls=[],restored={window_id:'window',workspace_id:'recovered-workspace',pane_id:'recovered-pane',surface_id:'recovered-tab'};let pending=true;
 bridge.tree=async()=>({windows:[{id:'window',groups:[],workspaces:[]}]});
 bridge.reopenNativeTab=async()=>calls.push('native-reopen');
 bridge.rpc=async(method,params)=>{calls.push({method,params});if(method==='window.focus')return {};if(method==='system.tree'){if(pending){pending=false;return {active:{},windows:[]}}return {active:restored,windows:[]}}throw Error(method)};
 try{assert.deepEqual(await bridge.manage({action:'recover-tab',window_id:'window'}),restored);assert.deepEqual(calls.slice(0,2),[{method:'window.focus',params:{window_id:'window'}},'native-reopen']);assert.equal(calls.filter(c=>c.method==='system.tree').length,2)}finally{bridge.close()}
});

test('recovery validates the requested window before invoking the native command',async()=>{
 const bridge=new CmuxBridge();bridge.tree=async()=>({windows:[]});bridge.reopenNativeTab=async()=>assert.fail('A stale window cannot invoke native recovery');bridge.rpc=async()=>assert.fail('A stale window cannot change Mac focus');
 try{await assert.rejects(bridge.manage({action:'recover-tab',window_id:'gone'}),e=>e.status===404)}finally{bridge.close()}
});

test('native recovery failures are surfaced without selecting an existing terminal',async()=>{
 const bridge=new CmuxBridge();bridge.tree=async()=>({windows:[{id:'window',groups:[],workspaces:[]}]});bridge.rpc=async method=>{assert.equal(method,'window.focus');return {}};bridge.reopenNativeTab=async()=>{throw new RequestError(409,'No closed tabs to recover')};
 try{await assert.rejects(bridge.manage({action:'recover-tab',window_id:'window'}),e=>e.status===409&&e.message==='No closed tabs to recover')}finally{bridge.close()}
});

for(const wholeWorkspace of [false,true])test(`close waits for native ${wholeWorkspace?'workspace':'tab'} removal before reporting success`,async()=>{
 const bridge=new CmuxBridge(),target={workspace_id:'workspace',surface_id:'tab'};let reads=0,closed=false;
 const surface={id:target.surface_id,type:'terminal'},workspace={id:target.workspace_id,panes:[{surfaces:[surface]}]},window={id:'window',groups:[],workspaces:[workspace]};
 bridge.tree=async()=>({windows:[window]});bridge.target=async()=>({surfaces:[surface,{id:'sibling',type:'terminal'}]});
 bridge.rpc=async method=>{
  if(method===(wholeWorkspace?'workspace.close':'surface.close')){closed=true;return target}
  assert.equal(method,'system.tree');assert.equal(closed,true);reads++;
  return {windows:[{...window,workspaces:reads===1?[workspace]:wholeWorkspace?[]:[{...workspace,panes:[{surfaces:[{id:'sibling'}]}]}]}]};
 };
 try{if(wholeWorkspace)await bridge.manage({action:'close-workspace',window_id:'window',workspace_id:target.workspace_id,confirmed:true});else await bridge.action({action:'close',...target});assert.ok(reads>=2,'A close acknowledgement precedes the actual native removal')}finally{bridge.close()}
});
