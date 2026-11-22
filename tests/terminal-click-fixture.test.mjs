import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
test('failed fixture startup cannot leave an earlier successful run as current proof',async()=>{
 const source=await readFile(new URL('terminal-click-fixture.mjs',import.meta.url),'utf8'),startup=source.slice(source.indexOf('const '),source.indexOf('let workspace,bridge,server;'));let receipt={passed:true,runId:'old'};
 const context=vm.createContext({homedir,execFileSync(){throw new Error('Native socket unavailable')},randomUUID:()=> 'new-run',writeFile:async(_,text)=>{receipt=JSON.parse(text)},Date,URL,JSON});
 await assert.rejects(vm.runInContext('(async()=>{'+startup.replaceAll('import.meta.url',JSON.stringify(import.meta.url))+'})()',context),/Native socket unavailable/);assert.equal(receipt.runId,'new-run');assert.equal(receipt.passed,false);assert.equal(receipt.pending,true);
});
test('terminal-click cleanup replaces older success proof when current native state verification fails',async()=>{
 const source=await readFile(new URL('terminal-click-fixture.mjs',import.meta.url),'utf8'),cleanup=source.slice(source.indexOf('async function close(){'),source.indexOf('\nfor(const signal'));
 const before={windows:[{id:'window',selected_workspace_id:'existing',workspaces:[{id:'existing',title:'Before',panes:[]}]}]},after=structuredClone(before);after.windows[0].workspaces[0].title='User changed title';let receipt={passed:true,runId:'old'};
 const context=vm.createContext({closing:false,server:null,bridge:null,workspace:null,before,native:()=>after,guard(){},runId:'current',assert,Date,URL,JSON,writeFile:async(_,text)=>{receipt=JSON.parse(text)}});
 vm.runInContext(cleanup.replace('import.meta.url',JSON.stringify(import.meta.url)),context);await assert.rejects(context.close(),/Expected values to be strictly deep-equal/);assert.equal(receipt.passed,false);assert.equal(receipt.runId,'current');assert.equal(receipt.existingWorkspacesUnchanged,false);
});
