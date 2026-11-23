import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CmuxBridge, RequestError } from '../bridge.mjs';
import { application } from '../server.mjs';

test('selected files require the live terminal and session; images preview without active-file execution',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'pokemux-selected-')),image=join(directory,'画面 (1).png'),svg=join(directory,'active.svg'),source=await readFile(new URL('../app-icon.png',import.meta.url));
 await writeFile(image,source);await writeFile(svg,'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
 const target={workspace_id:randomUUID(),surface_id:randomUUID()},bridge=new CmuxBridge();bridge.connected=true;
 bridge.rpc=async(method)=>{assert.equal(method,'surface.health');return {workspace_id:target.workspace_id,surfaces:[{id:target.surface_id,type:'terminal'}]}};
 let allowed=true;const auth={origin:'http://localhost',session:()=>({authenticated:allowed}),require(){if(!allowed)throw new RequestError(401,'Locked');return {}}};
 const app=application({bridge,auth});await new Promise(r=>app.listen(0,'127.0.0.1',r));auth.origin=`http://localhost:${app.address().port}`;
 const get=(path,ids=target)=>fetch(auth.origin+'/api/file?'+new URLSearchParams({workspace:ids.workspace_id,surface:ids.surface_id,path}));
 try{
  const opened=await get(image);assert.equal(opened.status,200);assert.equal(opened.headers.get('content-type'),'image/png');assert.match(opened.headers.get('content-disposition'),/^inline;/);assert.ok(opened.headers.get('content-disposition').includes(encodeURIComponent('画面')));assert.deepEqual(Buffer.from(await opened.arrayBuffer()),source);
  const download=await get(svg);assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment;/);assert.equal(download.headers.get('content-type'),'application/octet-stream');assert.ok(download.headers.get('content-security-policy').includes('sandbox'));await download.arrayBuffer();
  allowed=false;assert.equal((await get(image)).status,401);allowed=true;
  assert.equal((await get(image,{...target,surface_id:randomUUID()})).status,404);
  assert.equal((await get('relative.png')).status,400);assert.equal((await get(directory)).status,400);assert.equal((await get(join(directory,'gone.png'))).status,404);
 }finally{bridge.close();app.closeAllConnections();await new Promise(r=>app.close(r));await rm(directory,{recursive:true})}
});
