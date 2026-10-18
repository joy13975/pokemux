import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {CmuxBridge} from '../bridge.mjs';
import {application} from '../server.mjs';
import {validateFixtureRPC} from './fixture-ownership.mjs';
const native=(method,params)=>JSON.parse(execFileSync('/Applications/cmux.app/Contents/Resources/bin/cmux',['--socket','/Users/USER/.local/state/cmux/cmux.sock','--json','rpc',method,JSON.stringify(params)],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const before=native('system.tree',{all_windows:true}),window=before.windows[0],surfaces=new Set();
let workspace,bridge,server;
const runId=randomUUID();
const log=new URL('../state/terminal-click-'+runId+'-bytes.log',import.meta.url),info=new URL('../state/terminal-click-info.json',import.meta.url);
const claude=process.env.POKEMUX_CLICK_CLAUDE==='1',context=new URL('../state/terminal-click-'+runId+'-claude/',import.meta.url);
if(claude)await mkdir(new URL('cwd/',context),{recursive:true,mode:0o700});
const command=claude?`cd '${new URL('cwd/',context).pathname}' && exec `+['/usr/bin/env','CLAUDE_CONFIG_DIR='+new URL('config/',context).pathname,'ANTHROPIC_API_KEY=sk-ant-pokemux-canary-invalid','ANTHROPIC_BASE_URL=http://127.0.0.1:1','CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1','/Users/USER/.local/bin/claude','--bare','--setting-sources','','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--no-chrome','--permission-mode','plan'].map(value=>"'"+value.replaceAll("'","'\\''")+"'").join(' '):`/usr/bin/python3 -u ${new URL('terminal-click-fixture.py',import.meta.url).pathname} ${log.pathname}`;
const baseline=await readFile(new URL('../state/terminal-click-baseline.html',import.meta.url),'utf8');
const ownership={windowId:window.id,workspaces:new Set(),surfaces,groups:new Set(),panes:new Set()};
const guard=(method,params)=>validateFixtureRPC(method,params,ownership);
let closing=false;
async function close(){
 if(closing)return;closing=true;let passed=false;
 try{server?.closeAllConnections();if(server?.listening)await new Promise(r=>server.close(r));bridge?.close();if(workspace){guard('workspace.close',{workspace_id:workspace});native('workspace.close',{workspace_id:workspace,force:true});}const after=native('system.tree',{all_windows:true});const shape=t=>t.windows.map(w=>({id:w.id,selected:w.selected_workspace_id,workspaces:w.workspaces.map(ws=>({id:ws.id,title:ws.title,panes:ws.panes.map(p=>({id:p.id,selected:p.selected_surface_id,surfaces:p.surfaces.map(s=>({id:s.id,title:s.title}))}))}))}));assert.deepEqual(shape(after),shape(before));passed=true;}
 finally{await writeFile(new URL('../TERMINAL_CLICK_CLEANUP_RESULT.json',import.meta.url),JSON.stringify({runId,passed,at:new Date().toISOString(),existingWorkspacesUnchanged:passed},null,2));}
}
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>close().then(()=>process.exit(0),error=>{console.error(error);process.exit(1)}));
try{
 await writeFile(new URL('../TERMINAL_CLICK_CLEANUP_RESULT.json',import.meta.url),JSON.stringify({runId,passed:false,at:new Date().toISOString(),pending:true}));
 const create={window_id:window.id,title:claude?'Pokemux Claude mouse test':'Pokemux terminal clicks test',initial_command:command,focus:false};guard('workspace.create',create);const created=native('workspace.create',create);assert.match(created.workspace_id||'',/^[a-f0-9-]{36}$/i);assert.match(created.surface_id||'',/^[a-f0-9-]{36}$/i);assert.ok(!before.windows.some(w=>w.workspaces.some(ws=>ws.id===created.workspace_id)));workspace=created.workspace_id;ownership.workspaces.add(workspace);surfaces.add(created.surface_id);
 bridge=new CmuxBridge();const rpc=bridge.rpc.bind(bridge);bridge.rpc=(method,params)=>{guard(method,params);return rpc(method,params)};await bridge.connect();
 const inventory=bridge.tree.bind(bridge);bridge.tree=async()=>{const t=await inventory();return {...t,notifications:[],windows:t.windows.filter(w=>w.id===window.id).map(w=>({...w,groups:[],workspaces:w.workspaces.filter(ws=>ws.id===workspace)}))}};
 const auth={origin:'http://localhost:4394',credentials:[],session:()=>({authenticated:true}),require:()=>({authenticated:true}),sameOrigin(){}};
 server=application({bridge,auth});const handler=server.listeners('request')[0];server.removeAllListeners('request');server.on('request',(req,res)=>{if(!['localhost:4394','127.0.0.1:4394'].includes(req.headers.host)){res.writeHead(403);res.end();return}if(req.url==='/baseline'){req.url='/';const end=res.end.bind(res);res.end=(_, ...args)=>end(baseline,...args);}handler(req,res)});
 await new Promise(r=>server.listen(4394,'127.0.0.1',r));await writeFile(info,JSON.stringify({runId,pid:process.pid,origin:auth.origin,workspaceId:workspace,surfaceId:created.surface_id,windowId:window.id,log:log.pathname,claude,route:`/#${window.id}/${workspace}/${created.surface_id}`},null,2));
 const target={workspace_id:workspace,surface_id:created.surface_id};
 await new Promise(r=>setTimeout(r,1000));guard('terminal.replay',target);const replay=native('terminal.replay',{...target,anchor:'screen'});await writeFile(new URL('../state/terminal-click-before-replay.json',import.meta.url),JSON.stringify(replay,null,2));
 console.log(JSON.stringify({ready:true,...JSON.parse(await readFile(info,'utf8')),replayFields:Object.keys(replay),linkedSpans:replay.render_grid.row_spans.filter(s=>s.text.includes('Artiport'))}));
}catch(error){console.error(error);await close();process.exit(1)}
