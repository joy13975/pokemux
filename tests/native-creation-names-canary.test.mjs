import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyCreationName} from './native-creation-names-canary.mjs';
async function fixture(t){
 const directory=await mkdtemp(join(tmpdir(),'pokemux-native-name-'));t.after(()=>rm(directory,{recursive:true}));let reads=0;const clicks=[];
 const app={click:async point=>clicks.push(point),typeText:async()=>{},getAXState:async()=>'',getScreenshot:async()=>Buffer.from('fixture')},inventory=async()=>({windows:[{groups:[],workspaces:[{id:'owned',title:'Owned',panes:[{surfaces:++reads<4?[]:[{id:'created',title:'Chosen'}]}]}]}]});
 return {clicks,run:verifyCreationName(app,{kind:'tab',name:'Chosen',openPrompt:[[1,1]],inventory,proofPrefix:join(directory,'proof')})};
}
test('native naming proof requires confirmation of the selected default',async t=>{
 const {run}=await fixture(t);await run.next();await assert.rejects(run.next(false),/entire default is selected/);
});
test('native naming proof cannot call an unchanged inventory a successful Cancel while the dialog remains open',async t=>{
 const {run,clicks}=await fixture(t);await run.next();await run.next(true);await run.next([20,30]);const before=clicks.length;await assert.rejects(run.next(false),/Cancel actually dismissed/);assert.equal(clicks.length,before,'A rejected Cancel proof must not open another creation dialog');
});
