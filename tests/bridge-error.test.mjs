import { socketPath } from './socket-fixture.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:net';
import { createInterface } from 'node:readline';
import { inspect } from 'node:util';
import { CmuxBridge } from '../bridge.mjs';
test('local socket rejection reports the operation but cannot expose pasted terminal text', async () => {
  const privateText='private-pasted-fixture-value',path=socketPath();
  const sockets=new Set();
  const server=createServer(socket=>{
    sockets.add(socket);socket.on('close',()=>sockets.delete(socket));
    createInterface({input:socket}).on('line',line=>{
      const r=JSON.parse(line);
      socket.write(JSON.stringify({id:r.id,ok:false,error:{code:'rejected',message:r.params.text}})+'\n');
    });
  });
  await new Promise(r=>server.listen(path,r));
  const bridge=new CmuxBridge({socketPath:path});
  try {
    let failed;try{await bridge.rpc('terminal.paste',{text:privateText});}catch(error){failed=error;}
    assert.ok(failed);assert.match(failed.message,/terminal.paste/);assert.doesNotMatch(inspect(failed),new RegExp(privateText));assert.equal(failed.status,502);
  } finally {bridge.close();for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));}
});

test('unavailable cmux socket rejects without an unhandled readline error',async()=>{
  const {execFile}=await import('node:child_process');
  const {promisify}=await import('node:util');
  const path=socketPath();
  const source=`import {CmuxBridge} from './bridge.mjs';const b=new CmuxBridge({socketPath:${JSON.stringify(path)}});try{await b.status();process.exitCode=2;}catch(e){if(e.status!==502)throw e;}finally{b.close();}`;
  await promisify(execFile)(process.execPath,['--input-type=module','-e',source],{cwd:new URL('..',import.meta.url)});
});
