import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateFixtureRPC} from './fixture-ownership.mjs';
const owned={windowId:'window',workspaces:new Set(['workspace','anchor']),groups:new Set(['group']),surfaces:new Set(['surface']),panes:new Set(['pane'])};
const validate=(method,params)=>validateFixtureRPC(method,params,owned);
test('fixture permits UI creation in its window and management of dynamically owned targets',()=>{
 assert.doesNotThrow(()=>validate('workspace.create',{window_id:'window',group_id:'group',focus:false}));assert.doesNotThrow(()=>validate('workspace.group.create',{window_id:'window',name:'New group',child_workspace_ids:['workspace']}));assert.doesNotThrow(()=>validate('workspace.group.add',{window_id:'window',workspace_id:'workspace',group_id:'group',placement:'end'}));assert.doesNotThrow(()=>validate('workspace.group.remove',{window_id:'window',workspace_id:'workspace'}));assert.doesNotThrow(()=>validate('workspace.reorder',{window_id:'window',workspace_id:'workspace',before_workspace_id:'anchor'}));assert.doesNotThrow(()=>validate('terminal.input',{workspace_id:'workspace',surface_id:'surface',text:'test'}));
});
test('fixture rejects every foreign reference before native mutation, including group adoption and focus',()=>{
 for(const [method,params]of[
 ['workspace.create',{window_id:'foreign',focus:false}],['workspace.create',{window_id:'window',focus:true}],['workspace.create',{window_id:'window',group_id:'foreign',focus:false}],
 ['workspace.group.create',{window_id:'window',child_workspace_ids:['foreign']}],['workspace.group.create',{window_id:'window',anchor_workspace_id:'foreign'}],
 ['workspace.reorder',{workspace_id:'workspace',before_workspace_id:'foreign'}],['workspace.reorder',{workspace_id:'workspace',after_workspace_id:'foreign'}],['workspace.group.add',{workspace_id:'workspace',group_id:'foreign'}],['workspace.group.add',{workspace_id:'workspace',group_id:'group',reference_workspace_id:'foreign'}],['workspace.group.remove',{workspace_id:'foreign'}],['workspace.move',{workspace_id:'workspace'}],
 ['workspace.group.rename',{group_id:'foreign'}],['surface.reorder',{workspace_id:'workspace',surface_id:'surface',before_surface_id:'foreign'}],['surface.reorder',{workspace_id:'workspace',surface_id:'surface',after_surface_id:'foreign'}],['surface.create',{workspace_id:'workspace',pane_id:'foreign'}],['terminal.input',{workspace_id:'workspace',surface_id:'foreign'}],['terminal.replay',{workspace_id:'foreign',surface_id:'foreign'}],['system.quit',{workspace_id:'workspace'}]
 ])assert.throws(()=>validate(method,params),undefined,method+' '+JSON.stringify(params));
});
