import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { CmuxBridge, RequestError } from '../bridge.mjs';
import { application } from '../server.mjs';

test('authenticated binary image upload preserves bytes and target, with text limits and invalid uploads enforced before terminal delivery',async()=>{
 const target={workspace_id:randomUUID(),surface_id:randomUUID()},bridge=new CmuxBridge(),writes=[];
 bridge.connected=true;bridge.rpc=async(method,params)=>{if(method==='surface.health')return {workspace_id:target.workspace_id,surfaces:[{id:target.surface_id,type:'terminal'}]};writes.push({method,params});return {ok:true}};
 let allowed=true;
 const auth={origin:'http://localhost',session:()=>({authenticated:allowed}),require(){if(!allowed)throw new RequestError(401,'Locked');return {}},sameOrigin(req){if(req.headers.origin!==this.origin)throw new RequestError(403,'Wrong origin')}};
 const app=application({bridge,auth});await new Promise(r=>app.listen(0,'127.0.0.1',r));auth.origin=`http://localhost:${app.address().port}`;
 const image=await readFile(new URL('../app-icon.png',import.meta.url)),path='/api/image?'+new URLSearchParams({workspace:target.workspace_id,surface:target.surface_id});
 const post=(route,body,headers={})=>fetch(auth.origin+route,{method:'POST',headers:{origin:auth.origin,'Content-Type':'image/png',...headers},body});
 try{
  assert.equal((await post(path,image)).status,200);
  assert.equal(writes.length,1);assert.equal(writes[0].method,'terminal.input');
  assert.equal(writes[0].params.workspace_id,target.workspace_id);assert.equal(writes[0].params.surface_id,target.surface_id);
  const file=execFileSync('/bin/sh',['-c','printf %s '+writes[0].params.text],{encoding:'utf8'});
  assert.equal(writes[0].params.text,file,'Paths without shell-special characters match native cmux image paste');
  assert.deepEqual(await readFile(file),image);assert.equal((await stat(file)).mode&0o777,0o600);
  for(const [body,headers,status] of [[image,{'Content-Type':'image/jpeg'},400],[Buffer.from('not an image'),{},400],[Buffer.alloc(10*1024*1024+1),{},413],[image,{origin:'https://attacker.invalid'},403]])assert.equal((await post(path,body,headers)).status,status);
  allowed=false;assert.equal((await post(path,image)).status,401);allowed=true;
  assert.equal((await post(path.replace(target.surface_id,randomUUID()),image)).status,404);
  assert.equal((await post('/api/action',JSON.stringify({action:'paste',...target,text:'x'.repeat(100001)}),{'Content-Type':'application/json'})).status,413);
  assert.equal(writes.length,1,'Rejected uploads cannot send any terminal bytes');
 }finally{for(const write of writes)if(write.method==='terminal.input')await rm(dirname(execFileSync('/bin/sh',['-c','printf %s '+write.params.text],{encoding:'utf8'})),{recursive:true});bridge.close();app.closeAllConnections();await new Promise(r=>app.close(r))}
});
