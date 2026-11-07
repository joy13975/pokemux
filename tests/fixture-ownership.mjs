import assert from 'node:assert/strict';
export function validateFixtureRPC(method,params,owned){
 const reads=new Set(['system.ping','system.tree','workspace.group.list','notification.list']);
 if(reads.has(method))return;
 if(method.startsWith('terminal.')||['surface.send_key','surface.read_text','surface.close','surface.action','surface.reorder'].includes(method)){
  assert.ok(typeof params?.workspace_id==='string'&&params.workspace_id.length,'Fixture terminal request requires an explicit workspace ID');
  assert.ok(typeof params?.surface_id==='string'&&params.surface_id.length,'Fixture terminal request requires an explicit surface ID');
 }
 assert.ok(!params?.window_id||params.window_id===owned.windowId,'Fixture window must be owned');
 for(const key of ['workspace_id','before_workspace_id','after_workspace_id','reference_workspace_id'])if(params?.[key])assert.ok(owned.workspaces.has(params[key]),'Fixture workspace reference must be owned: '+key);
 if(params?.group_id)assert.ok(owned.groups.has(params.group_id),'Fixture group reference must be owned');
 for(const key of ['surface_id','before_surface_id','after_surface_id'])if(params?.[key])assert.ok(owned.surfaces.has(params[key]),'Fixture surface reference must be owned: '+key);
 if(params?.pane_id)assert.ok(owned.panes.has(params.pane_id),'Fixture pane reference must be owned');
 if(method==='workspace.create'){assert.equal(params.window_id,owned.windowId);assert.equal(params.focus,false);return}
 if(method==='workspace.group.create'){assert.equal(params.window_id,owned.windowId);assert.ok(!params.anchor_workspace_id,'Fixture group cannot adopt an existing anchor');for(const id of params.child_workspace_ids||[])assert.ok(owned.workspaces.has(id),'Fixture group child must be owned');return}
 if(['workspace.group.rename','workspace.group.ungroup'].includes(method)){assert.ok(owned.groups.has(params.group_id));return}
 assert.ok(new Set(['workspace.reorder','workspace.group.add','workspace.group.remove','workspace.rename','workspace.close','surface.create','surface.health','surface.list','surface.send_key','surface.read_text','surface.close','surface.action','surface.reorder','terminal.replay','terminal.viewport','terminal.size_state','terminal.size_policy.set','terminal.mouse','terminal.scroll','terminal.input','terminal.paste']).has(method),'Fixture RPC method is not allowed');
 assert.ok(owned.workspaces.has(params?.workspace_id),'Fixture RPC cannot mutate any existing workspace');
}
