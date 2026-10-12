import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
const source=readFileSync(new URL('./browser-fixture.mjs',import.meta.url),'utf8');
const owned={windowId:'window',workspaces:new Set(['workspace','anchor']),groups:new Set(['group']),surfaces:new Set(['surface']),panes:new Set(['pane'])};
function guard(text=source){
 const context=vm.createContext({assert});
 if(text.includes('export function validateFixtureRPC')){vm.runInContext(text.slice(text.indexOf('export function validateFixtureRPC'),text.indexOf('const cli=')).replace('export ',''),context);return(method,params)=>context.validateFixtureRPC(method,params,owned)}
 Object.assign(context,{workspaceId:'workspace',groupedWorkspaceId:null,allowedReads:new Set(['system.ping','system.tree','workspace.group.list','notification.list','terminal.replay']),rawRPC(){},bridge:{}});vm.runInContext(text.match(/bridge\.rpc=\(method,params\)=>\{[^\n]+/)[0],context);return context.bridge.rpc;
}
test('fixture permits UI creation in its window and management of dynamically owned targets',()=>{
 const validate=guard();assert.doesNotThrow(()=>validate('workspace.create',{window_id:'window',group_id:'group',focus:false}));assert.doesNotThrow(()=>validate('workspace.group.create',{window_id:'window',name:'New group',child_workspace_ids:['workspace']}));assert.doesNotThrow(()=>validate('workspace.move',{window_id:'window',workspace_id:'workspace',group_id:'group',before_workspace_id:'anchor'}));assert.doesNotThrow(()=>validate('terminal.input',{workspace_id:'workspace',surface_id:'surface',text:'test'}));
});
test('fixture rejects every foreign reference before native mutation, including group adoption and focus',()=>{
 const validate=guard();for(const [method,params]of[
 ['workspace.create',{window_id:'foreign',focus:false}],['workspace.create',{window_id:'window',focus:true}],['workspace.create',{window_id:'window',group_id:'foreign',focus:false}],
 ['workspace.group.create',{window_id:'window',child_workspace_ids:['foreign']}],['workspace.group.create',{window_id:'window',anchor_workspace_id:'foreign'}],
 ['workspace.move',{workspace_id:'workspace',before_workspace_id:'foreign'}],['workspace.move',{workspace_id:'workspace',group_id:'foreign'}],['workspace.move',{workspace_id:'foreign'}],
 ['workspace.group.rename',{group_id:'foreign'}],['surface.create',{workspace_id:'workspace',pane_id:'foreign'}],['terminal.input',{workspace_id:'workspace',surface_id:'foreign'}],['terminal.replay',{workspace_id:'foreign',surface_id:'foreign'}],['system.quit',{workspace_id:'workspace'}]
 ])assert.throws(()=>validate(method,params),undefined,method+' '+JSON.stringify(params));
});
