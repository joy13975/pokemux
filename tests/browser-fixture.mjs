import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { CmuxBridge } from '../bridge.mjs';
import { Passkeys } from '../auth.mjs';
import { application } from '../server.mjs';
const cli='/Applications/cmux.app/Contents/Resources/bin/cmux';
const rpc=(method,params)=>JSON.parse(execFileSync(cli,['--socket','/Users/USER/.local/state/cmux/cmux.sock','--json','--id-format','both','rpc',method,JSON.stringify(params)],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const before=rpc('system.tree',{all_windows:true}),window=before.windows[0];
const prefix=new URL('../state/browser-fixture-'+randomUUID()+'-',import.meta.url).pathname;
const info=new URL('../state/browser-fixture-info.json',import.meta.url);
const log=prefix+'terminal.log';
const command=`/usr/bin/python3 -u ${new URL('terminal-fixture.py',import.meta.url).pathname} ${log}`;
let workspaceId, groupedWorkspaceId, groupId, bridge, server, auth, closing=false, published=false;
async function cleanup(){
 if(closing)return;closing=true;
 if(server?.listening){server.closeAllConnections();await new Promise(r=>server.close(r));}
 bridge?.close();
 if(groupId)rpc('workspace.group.ungroup',{window_id:window.id,group_id:groupId});
 const remaining=rpc('system.tree',{all_windows:true}).windows.flatMap(w=>w.workspaces).map(w=>w.id);
 for(const id of [groupedWorkspaceId,workspaceId])if(remaining.includes(id))rpc('workspace.close',{workspace_id:id,force:true});
 let after;const deadline=Date.now()+10000;
 do{after=rpc('system.tree',{all_windows:true});if(!after.windows.some(w=>w.workspaces.some(ws=>ws.id===workspaceId)))break;assert.ok(Date.now()<deadline,'Owned workspace closes');await new Promise(r=>setTimeout(r,50));}while(true);
 const shape=t=>({active:t.active,windows:t.windows.map(w=>({id:w.id,selected:w.selected_workspace_id,workspaces:w.workspaces.map(ws=>({id:ws.id,title:ws.title,selected:ws.selected,panes:ws.panes.map(p=>({id:p.id,selected:p.selected_surface_id,surfaces:p.surfaces.map(s=>({id:s.id,title:s.title}))}))}))}))});
 assert.deepEqual(shape(after),shape(before));
 await writeFile(new URL('../BROWSER_FIXTURE_CLEANUP.json',import.meta.url),JSON.stringify({passed:true,time:new Date().toISOString(),existingWorkspaceStateUnchanged:true},null,2)+'\n');
 for(const path of [log,log+'-second',...(published?[info]:[])])try{await unlink(path);}catch(error){if(error.code!=='ENOENT')throw error;}
 console.log('Owned browser fixtures removed; existing workspace state unchanged.');
}
function finish(code){cleanup().then(()=>process.exit(code),error=>{console.error(error);process.exit(1);});}
process.on('uncaughtException',error=>{console.error(error);finish(1);});
process.on('SIGINT',()=>finish(0));process.on('SIGTERM',()=>finish(0));
process.on('SIGUSR1',()=>{bridge.local.close();console.log('Disconnected owned fixture RPC socket.');});
process.on('SIGUSR2',()=>{auth.sessions.clear();bridge.local.close();console.log('Expired owned fixture browser session.');});
async function main(){
const created=rpc('workspace.create',{window_id:window.id,title:'Pokemux live browser test',initial_command:command,focus:false});
console.log('Created fixture:',JSON.stringify(created));
workspaceId=created.workspace_id;const surfaceId=created.surface_id;
assert.match(workspaceId,/^[0-9a-f-]{36}$/i);
const owned=()=>({workspace_id:workspaceId,surface_id:surfaceId});
let ws;const deadline=Date.now()+10000;
while(!ws){ws=rpc('system.tree',{all_windows:true}).windows.flatMap(w=>w.workspaces).find(w=>w.id===workspaceId);if(!ws){assert.ok(Date.now()<deadline);await new Promise(r=>setTimeout(r,50));}}
const second=rpc('surface.create',{workspace_id:workspaceId,pane_id:ws.panes[0].id,type:'terminal',initial_command:command+'-second',focus:false}).surface_id;
const shellSurfaceId=process.env.POKEMUX_CANARY_SHELL==='1'?rpc('surface.create',{workspace_id:workspaceId,pane_id:ws.panes[0].id,type:'terminal',initial_command:process.env.POKEMUX_CANARY_GLYPHS==='1'?`/bin/zsh -f -c 'printf "\\ue0a0 \\ue0b0 \\ue0b1 \\ue0b2 \\ue0b3\\n"; exec /bin/zsh -f'`:'/bin/zsh -f',focus:false}).surface_id:undefined;
let groupedSurfaceId;
if(process.env.POKEMUX_CANARY_GROUP==='1'){
 const child=rpc('workspace.create',{window_id:window.id,title:'Pokemux grouped child',initial_command:'/bin/zsh -f',focus:false});groupedWorkspaceId=child.workspace_id;groupedSurfaceId=child.surface_id;
 groupId=rpc('workspace.group.create',{window_id:window.id,name:'Pokemux owned group',child_workspace_ids:[workspaceId,groupedWorkspaceId],external_id:randomUUID()}).group.id;
}
bridge=new CmuxBridge();
const rawRPC=bridge.rpc.bind(bridge),allowedReads=new Set(['system.ping','system.tree','workspace.group.list','notification.list','terminal.replay']);
bridge.rpc=(method,params)=>{assert.ok(allowedReads.has(method)||params?.workspace_id===workspaceId||groupedWorkspaceId&&params?.workspace_id===groupedWorkspaceId,'Fixture RPC cannot mutate any existing workspace');return rawRPC(method,params)};
await bridge.initialize();
const inventory=bridge.tree.bind(bridge);
bridge.tree=async()=>{const t=await inventory();return {...t,notifications:t.notifications.filter(n=>n.workspace_id===workspaceId||n.workspace_id===groupedWorkspaceId),windows:t.windows.filter(w=>w.id===window.id).map(w=>({...w,groups:w.groups.filter(g=>g.id===groupId),workspaces:w.workspaces.filter(ws=>ws.id===workspaceId||ws.id===groupedWorkspaceId)}))};};
const authFile=new URL('../state/browser-fixture-passkeys.json',import.meta.url);
auth=new Passkeys({origin:'http://localhost:4391',ownerLogin:'fixture@example.invalid',file:authFile});await auth.initialize();
const id=randomBytes(32).toString('hex');auth.sessions.set(id,{authenticated:true,expires:Date.now()+3600000});
server=application({bridge,auth});const handler=server.listeners('request')[0];server.removeAllListeners('request');
server.on('request',(req,res)=>{
 if(req.url==='/fixture'){res.writeHead(302,{'Set-Cookie':auth.cookie(id),Location:`/#${window.id}/${workspaceId}/${surfaceId}`});res.end();}
 else handler(req,res);
});
await new Promise((resolve,reject)=>server.once('error',reject).listen(4391,'127.0.0.1',resolve));
await writeFile(info,JSON.stringify({origin:auth.origin,windowId:window.id,workspaceId,surfaceId,secondSurfaceId:second,shellSurfaceId,groupId,groupedWorkspaceId,groupedSurfaceId,log},null,2));published=true;
console.log(JSON.stringify({origin:auth.origin,...owned(),second,ready:true}));
}
main().catch(error=>{console.error(error);finish(1);});
