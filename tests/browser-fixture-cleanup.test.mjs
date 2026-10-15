import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('browser-fixture.mjs',import.meta.url),'utf8');
const cleanup=source.slice(source.indexOf('async function cleanup(){'),source.indexOf('\nfunction finish('));
test('failed fixture cleanup replaces an older successful receipt instead of leaving false proof',async()=>{
 const before={active:true,windows:[{id:'window',selected_workspace_id:'user',workspaces:[{id:'user',title:'Original',selected:true,panes:[]}]}]},after=structuredClone(before);after.windows[0].workspaces[0].title='Changed while canary ran';
 let receipt={passed:true,time:'old'};
 const context=vm.createContext({closing:false,server:null,bridge:null,window:{id:'window'},ownership:{groups:new Set(),workspaces:new Set()},before,beforeGroups:[],rpc:method=>method==='system.tree'?after:{groups:[]},assert,Date,URL,JSON,setTimeout,writeFile:async(_,text)=>{receipt=JSON.parse(text)},console:{log(){}},log:'owned.log',published:false,process:{env:{}},unlink:async()=>{}});
 vm.runInContext(cleanup.replace('import.meta.url',JSON.stringify(import.meta.url)),context);
 await assert.rejects(context.cleanup(),/Expected values to be strictly deep-equal/);
 assert.equal(receipt.passed,false);assert.notEqual(receipt.time,'old');assert.equal(receipt.existingWorkspaceStateUnchanged,false);
});
