import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { CmuxBridge, privateJSON } from '../bridge.mjs';
import { Passkeys } from '../auth.mjs';
import { application } from '../server.mjs';
import { validateFixtureRPC } from './fixture-ownership.mjs';
const cli='/Applications/cmux.app/Contents/Resources/bin/cmux';
const native=(method,params)=>JSON.parse(execFileSync(cli,['--socket','/Users/USER/.local/state/cmux/cmux.sock','--json','--id-format','both','rpc',method,JSON.stringify(params)],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const before=native('system.tree',{all_windows:true}),window=before.windows[0],beforeWorkspaceIds=new Set(before.windows.flatMap(w=>w.workspaces.map(ws=>ws.id))),beforeGroups=native('workspace.group.list',{window_id:window.id}).groups;
const ownership={windowId:window.id,workspaces:new Set(),groups:new Set(),surfaces:new Set(),panes:new Set()};let metadata;
const rpc=(method,params)=>{validateFixtureRPC(method,params,ownership);return native(method,params)};
const persistInfo=()=>privateJSON(info,{...metadata,ownedWorkspaceIds:[...ownership.workspaces],ownedGroupIds:[...ownership.groups]});
function rememberTree(tree){for(const win of tree.windows)for(const ws of win.workspaces)if(ownership.workspaces.has(ws.id))for(const pane of ws.panes){ownership.panes.add(pane.id);for(const surface of pane.surfaces)ownership.surfaces.add(surface.id)}}
const runId=randomUUID(),prefix=new URL('../state/creation-names-fixture-'+runId+'-',import.meta.url).pathname;
const info=new URL('../state/creation-names-fixture-info.json',import.meta.url);
const log=prefix+'terminal.log';
const command=`/usr/bin/python3 -u ${new URL('terminal-fixture.py',import.meta.url).pathname} ${log}`;
let workspaceId, groupedWorkspaceId, groupId, bridge, server, auth, closing=false, published=false;
async function cleanup(){
 if(closing)return;closing=true;let passed=false,unchanged=false;
 try{
 if(server?.listening){server.closeAllConnections();await new Promise(r=>server.close(r));}
 bridge?.close();
 const liveGroups=rpc('workspace.group.list',{window_id:window.id}).groups;for(const group of liveGroups)if(ownership.groups.has(group.id)){assert.ok(group.member_workspace_ids.every(id=>ownership.workspaces.has(id)),'Owned cleanup group contains only owned workspaces');rpc('workspace.group.ungroup',{window_id:window.id,group_id:group.id})}
 const remaining=rpc('system.tree',{all_windows:true}).windows.flatMap(w=>w.workspaces).map(w=>w.id);
 for(const id of ownership.workspaces)if(remaining.includes(id))rpc('workspace.close',{workspace_id:id,force:true});
 let after;const deadline=Date.now()+10000;
 do{after=rpc('system.tree',{all_windows:true});if(!after.windows.some(w=>w.workspaces.some(ws=>ownership.workspaces.has(ws.id))))break;assert.ok(Date.now()<deadline,'Owned workspace closes');await new Promise(r=>setTimeout(r,50));}while(true);
 const shape=t=>({active:t.active,windows:t.windows.map(w=>({id:w.id,selected:w.selected_workspace_id,workspaces:w.workspaces.map(ws=>({id:ws.id,title:ws.title,selected:ws.selected,panes:ws.panes.map(p=>({id:p.id,selected:p.selected_surface_id,surfaces:p.surfaces.map(s=>({id:s.id,title:s.title}))}))}))}))});
 assert.deepEqual(shape(after),shape(before));assert.deepEqual(rpc('workspace.group.list',{window_id:window.id}).groups,beforeGroups);
 unchanged=true;
 for(const path of [log,log+'-second',...(published?[info]:[])])try{await unlink(path);}catch(error){if(error.code!=='ENOENT')throw error;}
 passed=true;console.log('Owned browser fixtures removed; existing workspace state unchanged.');
 }finally{await writeFile(new URL('../CREATION_NAMES_CLEANUP.json',import.meta.url),JSON.stringify({passed,time:new Date().toISOString(),existingWorkspaceStateUnchanged:unchanged},null,2)+'\n');}
}
function finish(code){cleanup().then(()=>process.exit(code),error=>{console.error(error);process.exit(1);});}
process.on('uncaughtException',error=>{console.error(error);finish(1);});
process.on('SIGINT',()=>finish(0));process.on('SIGTERM',()=>finish(0));
process.on('SIGUSR1',()=>{bridge.local.close();console.log('Disconnected owned fixture RPC socket.');});
process.on('SIGUSR2',()=>{auth.sessions.clear();bridge.local.close();console.log('Expired owned fixture browser session.');});
async function main(){
const created=rpc('workspace.create',{window_id:window.id,title:'Pokemux live browser test',initial_command:command,focus:false});
console.log('Created fixture:',JSON.stringify(created));
workspaceId=created.workspace_id;const surfaceId=created.surface_id;assert.match(workspaceId||'',/^[0-9a-f-]{36}$/i);assert.match(surfaceId||'',/^[0-9a-f-]{36}$/i);assert.ok(!beforeWorkspaceIds.has(workspaceId));ownership.workspaces.add(workspaceId);ownership.surfaces.add(surfaceId);
assert.match(workspaceId,/^[0-9a-f-]{36}$/i);
const owned=()=>({workspace_id:workspaceId,surface_id:surfaceId});
let ws;const deadline=Date.now()+10000;
while(!ws){ws=rpc('system.tree',{all_windows:true}).windows.flatMap(w=>w.workspaces).find(w=>w.id===workspaceId);if(!ws){assert.ok(Date.now()<deadline);await new Promise(r=>setTimeout(r,50));}}
rememberTree(rpc('system.tree',{all_windows:true}));
const second=rpc('surface.create',{workspace_id:workspaceId,pane_id:ws.panes[0].id,type:'terminal',initial_command:command+'-second',focus:false}).surface_id;
const shellSurfaceId=process.env.POKEMUX_CANARY_SHELL==='1'?rpc('surface.create',{workspace_id:workspaceId,pane_id:ws.panes[0].id,type:'terminal',initial_command:process.env.POKEMUX_CANARY_TUI==='1'?'/Users/USER/.local/bin/claude --bare':process.env.POKEMUX_CANARY_GLYPHS==='1'?`/bin/zsh -f -c 'printf "\\ue0a0 \\ue0b0 \\ue0b1 \\ue0b2 \\ue0b3\\n\\u23fa Writing \\u23fa\\ufe0e Text \\u23fa\\ufe0f Emoji\\n"; exec /bin/zsh -f'`:process.env.POKEMUX_CANARY_STYLED==='1'?`/bin/zsh -i -c '/usr/bin/python3 ${new URL('styled-output-fixture.py',import.meta.url).pathname}; exec /bin/zsh -i'`:'/bin/zsh -f',focus:false}).surface_id:undefined;
let groupedSurfaceId;
if(process.env.POKEMUX_CANARY_GROUP==='1'){
 const child=rpc('workspace.create',{window_id:window.id,title:'Pokemux grouped child',initial_command:'/bin/zsh -f',focus:false});groupedWorkspaceId=child.workspace_id;ownership.workspaces.add(groupedWorkspaceId);groupedSurfaceId=child.surface_id;
 const group=rpc('workspace.group.create',{window_id:window.id,name:'Pokemux owned group',child_workspace_ids:[workspaceId,groupedWorkspaceId],external_id:randomUUID()}).group;groupId=group.id;ownership.groups.add(groupId);if(!group.is_empty){assert.ok(!beforeWorkspaceIds.has(group.anchor_workspace_id));ownership.workspaces.add(group.anchor_workspace_id)}
}
bridge=new CmuxBridge();
rememberTree(rpc('system.tree',{all_windows:true}));
const rawRPC=bridge.rpc.bind(bridge);
bridge.rpc=async(method,params)=>{validateFixtureRPC(method,params,ownership);const result=await rawRPC(method,params);
 if(method==='workspace.create'){assert.ok(!beforeWorkspaceIds.has(result.workspace_id));ownership.workspaces.add(result.workspace_id)}
 if(method==='workspace.group.create'){const group=result.group;assert.ok(group?.id&&!beforeGroups.some(g=>g.id===group.id));ownership.groups.add(group.id);if(!group.is_empty){assert.ok(!beforeWorkspaceIds.has(group.anchor_workspace_id));ownership.workspaces.add(group.anchor_workspace_id)}}
 if(result.surface_id&&['workspace.create','surface.create'].includes(method))ownership.surfaces.add(result.surface_id);
 if(['workspace.create','workspace.group.create','surface.create'].includes(method)){rememberTree(await rawRPC('system.tree',{all_windows:true}));if(published)await persistInfo()}
 return result};
await bridge.initialize();
const inventory=bridge.tree.bind(bridge);
bridge.manage=CmuxBridge.prototype.manage.bind({tree:inventory,rpc:bridge.rpc.bind(bridge)});
bridge.tree=async()=>{const t=await inventory();return {...t,notifications:t.notifications.filter(n=>ownership.workspaces.has(n.workspace_id)),windows:t.windows.filter(w=>w.id===window.id).map(w=>({...w,groups:w.groups.filter(g=>ownership.groups.has(g.id)),workspaces:w.workspaces.filter(ws=>ownership.workspaces.has(ws.id))}))};};
const authFile=new URL('../state/creation-names-fixture-passkeys.json',import.meta.url);
auth=new Passkeys({origin:'http://localhost:4395',ownerLogin:'fixture@example.invalid',file:authFile});await auth.initialize();
const id=randomBytes(32).toString('hex');auth.sessions.set(id,{authenticated:true,expires:Date.now()+3600000});
server=application({bridge,auth});const handler=server.listeners('request')[0];server.removeAllListeners('request');
server.on('request',async(req,res)=>{
 if(!['localhost:4395','127.0.0.1:4395'].includes(req.headers.host)){res.writeHead(403);res.end();return}
 if(process.env.POKEMUX_CANARY_LINKS==='1'&&req.url==='/__link-probe'){res.setHeader('Content-Type','text/html');res.end(await readFile(new URL('link-handoff-probe.html',import.meta.url)));return}
 if(process.env.POKEMUX_CANARY_LINKS==='1'&&req.url==='/__link-probe.webmanifest'){res.setHeader('Content-Type','application/manifest+json');res.end(JSON.stringify({id:'/__link-probe',name:'Pokemux link probe',start_url:'/__link-probe',scope:'/__link-',display:'standalone'}));return}
 if(process.env.POKEMUX_CANARY_TRACE==='1'&&req.url==='/__input-trace'){let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{console.log('Input trace: '+body);res.end('{}')});return}
 if(process.env.POKEMUX_CANARY_TRACE==='1'&&req.url==='/'){
  const end=res.end.bind(res);res.end=(body,...args)=>end(String(body).replace('</head>',`<script>const traceStarts=new WeakMap();for(const type of ['pointerdown','pointerup','click','focusin','focusout']){document.addEventListener(type,e=>traceStarts.set(e,performance.now()),true);document.addEventListener(type,e=>{const target=e.target.id||e.target.dataset?.typingKey||e.target.tagName,detail=e.detail,dispatchMs=performance.now()-traceStarts.get(e);setTimeout(()=>fetch('/__input-trace',{method:'POST',body:JSON.stringify({type,target,detail,dispatchMs,hidden:document.querySelector('#softwareKeyboard')?.hidden,focus:document.activeElement.className})}),0)})}</script></head>`),...args);
 }
 if(req.url==='/fixture'){res.writeHead(302,{'Set-Cookie':auth.cookie(id),Location:`/#${window.id}/${workspaceId}/${surfaceId}`});res.end();}
 else {
  if(req.url==='/?clipboard=denied'){
   const end=res.end.bind(res);res.end=(body,...args)=>end(String(body).replace('</head>',`<script>Object.defineProperty(navigator,'clipboard',{value:{readText:()=>Promise.reject(new DOMException('Fixture clipboard denial','NotAllowedError'))}})</script></head>`),...args);
  }
  handler(req,res);
 }

});
await new Promise((resolve,reject)=>server.once('error',reject).listen(4395,'127.0.0.1',resolve));
metadata={runId,route:`/#${window.id}/${workspaceId}/${surfaceId}`,pid:process.pid,origin:auth.origin,windowId:window.id,workspaceId,surfaceId,secondSurfaceId:second,shellSurfaceId,groupId,groupedWorkspaceId,groupedSurfaceId,log};await persistInfo();published=true;
console.log(JSON.stringify({origin:auth.origin,...owned(),second,ready:true}));
}
main().catch(error=>{console.error(error);finish(1);});
