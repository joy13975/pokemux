import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {CmuxBridge} from '../bridge.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function sidebar(){
 const dom=new JSDOM(html),document=dom.window.document,$=id=>document.getElementById(id),calls=[],timers=new Map(),frames=[];let timer=0;
 const workspace=(id,group=null)=>({id,name:id,window:'window',group,description:'',branch:'',panes:[]});
 const workspaces=[workspace('outside'),workspace('anchor','group'),workspace('one','group'),workspace('two','group'),workspace('other-anchor','other-group'),workspace('three','other-group')],groups=[{id:'group',name:'Group',anchor:'anchor',window:'window'},{id:'other-group',name:'Other',anchor:'other-anchor',window:'window'}];
 const ctx=vm.createContext({document,$,workspaces,groups,current:workspaces[2],selectedWindow:'window',grids:new Map(),esc:String,statusIndicator:()=>'',workspaceState:()=>'',attention:()=>false,connected:true,icon:()=>'',setTimeout:fn=>{timers.set(++timer,fn);return timer},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>frames.push(fn),api:async(path,body)=>{calls.push({path,body:JSON.parse(JSON.stringify(body))});return{workspace_id:'created'}},loadTree:async()=>{},selectWorkspace:id=>calls.push({selected:id}),say:message=>calls.push({error:message}),editName:(_title,_value,apply)=>apply('New group'),openDialog(title,body){$('dialogTitle').textContent=title;$('dialogBody').innerHTML=body;$('dialog').open=true}});
 $('dialog').close=()=>{$('dialog').open=false};dom.window.HTMLElement.prototype.setPointerCapture=()=>{};
 vm.runInContext(html.slice(html.indexOf('function renderSidebar()'),html.indexOf('function selectWorkspace(')),ctx);
 const creationStart=html.includes('function newWorkspaceMenu(')?html.indexOf('function newWorkspaceMenu('):html.indexOf('async function createWorkspace(');
 vm.runInContext(html.slice(creationStart,html.indexOf('function inboxDialog(')),ctx);
 vm.runInContext(html.match(/\$\('newWorkspace'\)\.onclick=[^;]+;/)[0],ctx);ctx.renderSidebar();
 const pointer=(target,type,x,y)=>{const event=new dom.window.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:1,button:0,isPrimary:true,clientX:x,clientY:y});target.dispatchEvent(event)};
 return{dom,ctx,$,calls,workspaces,groups,pointer,paint(){for(const fn of frames.splice(0))fn()},hold(){for(const [id,fn]of timers){timers.delete(id);fn()}}};
}
test('sidebar plus asks what to create before mutating, then creates the chosen group',async()=>{
 const f=sidebar();try{f.$('newWorkspace').click();assert.equal(f.calls.length,0);const group=f.$('createGroup');assert.ok(group);assert.ok(f.$('createWorkspace'));await group.onclick();assert.deepEqual(f.calls[0],{path:'manage',body:{action:'new-group',window_id:'window',name:'New group'}})}finally{f.dom.window.close()}
});
test('workspace choice retains the current group and explicit native creation target',async()=>{
 const f=sidebar();try{f.$('newWorkspace').click();assert.ok(f.$('createWorkspace'));await f.$('createWorkspace').onclick();assert.deepEqual(f.calls[0],{path:'manage',body:{action:'new-workspace',window_id:'window',group_id:'group'}});assert.equal(f.calls[1].selected,'created')}finally{f.dom.window.close()}
});
test('sidebar preserves cmux top-level order instead of putting every group first',()=>{
 const f=sidebar();try{const list=f.$('workspaceList');assert.equal(list.firstElementChild.querySelector('[data-workspace]').dataset.workspace,'outside')}finally{f.dom.window.close()}
});
test('holding and dragging reorders a workspace natively; short movement scrolls and cancellation sends nothing',async()=>{
 const f=sidebar();try{const one=f.$('workspaceList').querySelector('[data-workspace="one"]'),two=f.$('workspaceList').querySelector('[data-workspace="two"]');two.closest('.workspacerow').getBoundingClientRect=()=>({top:100,bottom:150});f.ctx.document.elementFromPoint=()=>two;
 f.$('workspaceList').scrollTop=100;f.pointer(one,'pointerdown',60,80);f.pointer(one,'pointermove',60,120);f.pointer(one,'pointerup',60,120);assert.equal(f.calls.length,0);assert.equal(f.$('workspaceList').scrollTop,60);
 f.pointer(one,'pointerdown',60,80);f.hold();f.pointer(one,'pointermove',60,140);f.pointer(one,'pointercancel',60,140);assert.equal(f.calls.length,0);
 f.pointer(one,'pointerdown',60,80);f.hold();f.pointer(one,'pointermove',60,140);f.pointer(one,'pointerup',60,140);await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(f.calls[0],{path:'manage',body:{action:'move-workspace',window_id:'window',workspace_id:'one',group_id:'group',before_workspace_id:null,move_group:false}})}finally{f.dom.window.close()}
});
test('drop on another group changes membership; dragging the group anchor moves the whole group',async()=>{
 const f=sidebar();try{const one=f.$('workspaceList').querySelector('[data-workspace="one"]'),other=f.$('workspaceList').querySelector('[data-workspace="other-anchor"]');f.ctx.document.elementFromPoint=()=>other;other.closest('.grouprow').getBoundingClientRect=()=>({top:100,bottom:140});f.pointer(one,'pointerdown',60,80);f.hold();f.pointer(one,'pointermove',60,120);f.pointer(one,'pointerup',60,120);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls[0].body.group_id,'other-group');assert.equal(f.calls[0].body.before_workspace_id,null);
 const anchor=f.$('workspaceList').querySelector('[data-workspace="anchor"]');f.pointer(anchor,'pointerdown',60,80);f.hold();f.pointer(anchor,'pointermove',60,110);f.pointer(anchor,'pointerup',60,110);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls[1].body.move_group,true);assert.equal(f.calls[1].body.before_workspace_id,'other-anchor');assert.equal(f.calls[1].body.group_id,null)}finally{f.dom.window.close()}
});
test('implicit child capture loss does not cancel a held drag, and its release click cannot select a workspace',async()=>{
 const f=sidebar();try{const one=f.$('workspaceList').querySelector('[data-workspace="one"]'),two=f.$('workspaceList').querySelector('[data-workspace="two"]');two.closest('.workspacerow').getBoundingClientRect=()=>({top:100,bottom:150});f.ctx.document.elementFromPoint=()=>two;f.pointer(one,'pointerdown',60,80);f.hold();f.pointer(one,'lostpointercapture',60,80);f.pointer(f.$('workspaceList'),'pointermove',60,110);f.pointer(f.$('workspaceList'),'pointerup',60,110);f.ctx.renderSidebar();f.$('workspaceList').dispatchEvent(new f.dom.window.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls.length,1);assert.equal(f.calls[0].body.before_workspace_id,'two');
 const next=f.$('workspaceList').querySelector('[data-workspace="two"]');f.pointer(next,'pointerdown',60,110);f.pointer(next,'pointerup',60,110);next.dispatchEvent(new f.dom.window.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.equal(f.calls[1].selected,'two')}finally{f.dom.window.close()}
});
test('structural replacement cancels a pending hold and moving over the source never reorders it',async()=>{
 const f=sidebar();try{let one=f.$('workspaceList').querySelector('[data-workspace="one"]');f.pointer(one,'pointerdown',60,80);f.workspaces.push({...f.workspaces[0],id:'added'});f.ctx.renderSidebar();f.hold();assert.equal(f.$('workspaceList').classList.contains('workspace-dragging'),false);one=f.$('workspaceList').querySelector('[data-workspace="one"]');f.ctx.document.elementFromPoint=()=>one;f.pointer(one,'pointerdown',60,80);f.hold();f.pointer(one,'pointermove',60,85);f.pointer(one,'pointerup',60,85);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls.length,0)}finally{f.dom.window.close()}
});
for(const phase of ['pending','active'])test('same-list title and status metadata preserves a '+phase+' workspace hold through native reorder',async()=>{
 const f=sidebar();try{const one=f.$('workspaceList').querySelector('[data-workspace="one"]'),two=f.$('workspaceList').querySelector('[data-workspace="two"]');two.closest('.workspacerow').getBoundingClientRect=()=>({top:100,bottom:150});f.ctx.document.elementFromPoint=()=>two;f.pointer(one,'pointerdown',60,80);if(phase==='active')f.hold();f.workspaces[2].name='Startup title';f.workspaces[2].branch='main';f.workspaces[2].description='Agent ready';f.ctx.workspaceState=()=> 'attention';f.ctx.renderSidebar();if(phase==='pending')f.hold();assert.equal(f.$('workspaceList').classList.contains('workspace-dragging'),true,'Metadata must not cancel the held gesture');assert.equal(f.$('workspaceList').querySelector('[data-workspace="one"]'),one,'Metadata must not replace the contacted element');f.pointer(f.$('workspaceList'),'pointermove',60,110);f.pointer(f.$('workspaceList'),'pointerup',60,110);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls.length,1);assert.equal(f.calls[0].body.before_workspace_id,'two');f.paint();assert.match(f.$('workspaceList').querySelector('[data-workspace="one"]').textContent,/Startup title/);
 }finally{f.dom.window.close()}
});
test('metadata during a short contact preserves its compatibility click before the deferred render',()=>{
 const f=sidebar();try{const one=f.$('workspaceList').querySelector('[data-workspace="one"]');f.pointer(one,'pointerdown',60,80);f.workspaces[2].name='Startup title';f.ctx.renderSidebar();f.pointer(one,'pointerup',60,80);one.dispatchEvent(new f.dom.window.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.deepEqual(f.calls,[{selected:'one'}]);f.paint();assert.match(f.$('workspaceList').querySelector('[data-workspace="one"]').textContent,/Startup title/);
 }finally{f.dom.window.close()}
});
for(const change of ['order','membership'])for(const phase of ['pending','active'])test(change+' replacement cancels a '+phase+' workspace hold without native mutation',async()=>{
 const f=sidebar();try{const one=f.$('workspaceList').querySelector('[data-workspace="one"]');f.pointer(one,'pointerdown',60,80);if(phase==='active')f.hold();if(change==='order')[f.workspaces[2],f.workspaces[3]]=[f.workspaces[3],f.workspaces[2]];else f.workspaces[2].group='other-group';f.ctx.renderSidebar();f.hold();assert.equal(f.$('workspaceList').classList.contains('workspace-dragging'),false);const two=f.$('workspaceList').querySelector('[data-workspace="two"]');f.ctx.document.elementFromPoint=()=>two;f.pointer(f.$('workspaceList'),'pointermove',60,110);f.pointer(f.$('workspaceList'),'pointerup',60,110);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls.length,0);
 }finally{f.dom.window.close()}
});
for(const sourceId of ['outside-b','anchor'])test('drop after a top-level workspace excludes the moving '+sourceId+' and inserts before the next group block',async()=>{
 const f=sidebar();try{f.workspaces.push({...f.workspaces[0],id:'outside-b',name:'Outside B'});f.ctx.renderSidebar();const source=f.$('workspaceList').querySelector('[data-workspace="'+sourceId+'"]'),outside=f.$('workspaceList').querySelector('[data-workspace="outside"]');outside.closest('.workspacerow').getBoundingClientRect=()=>({top:100,bottom:150});f.ctx.document.elementFromPoint=()=>outside;
 f.pointer(source,'pointerdown',60,80);f.hold();f.pointer(source,'pointermove',60,140);f.pointer(source,'pointerup',60,140);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls[0].body.before_workspace_id,sourceId==='anchor'?'other-anchor':'anchor');assert.equal(f.calls[0].body.group_id,null);assert.equal(f.calls[0].body.move_group,sourceId==='anchor');
 }finally{f.dom.window.close()}
});
test('manage validates native group creation and exact workspace move membership',async()=>{
 const bridge=new CmuxBridge(),calls=[];bridge.tree=async()=>({windows:[{id:'window',groups:[{id:'group',anchor_workspace_id:'anchor'},{id:'other'}],workspaces:[{id:'anchor'},{id:'one'},{id:'two'}]}]});bridge.rpc=async(method,params)=>{calls.push({method,params});return{}};
 try{await bridge.manage({action:'new-group',window_id:'window',name:'New group'});assert.deepEqual(calls.shift(),{method:'workspace.group.create',params:{window_id:'window',name:'New group'}});
 await bridge.manage({action:'move-workspace',window_id:'window',workspace_id:'one',group_id:'other',before_workspace_id:'two',move_group:false});assert.deepEqual(calls.shift(),{method:'workspace.group.add',params:{window_id:'window',workspace_id:'one',group_id:'other',placement:'end'}});assert.deepEqual(calls.shift(),{method:'workspace.reorder',params:{window_id:'window',workspace_id:'one',before_workspace_id:'two'}});
 await assert.rejects(bridge.manage({action:'move-workspace',window_id:'window',workspace_id:'one',group_id:'gone'}),/group no longer/i);await assert.rejects(bridge.manage({action:'move-workspace',window_id:'window',workspace_id:'one',before_workspace_id:'gone'}),/destination/i);await assert.rejects(bridge.manage({action:'move-workspace',window_id:'window',workspace_id:'one',move_group:true}),/anchor/i);await assert.rejects(bridge.manage({action:'new-group',window_id:'window',name:' '}),/name/i);assert.equal(calls.length,0)}finally{bridge.close()}
});
test('installed desktop reorder works without the advertised but rejected mobile workspace.move route',async()=>{
 const bridge=new CmuxBridge(),calls=[],window={id:'window',groups:[{id:'group',anchor_workspace_id:'anchor',member_workspace_ids:['anchor','one','two']}],workspaces:[{id:'anchor'},{id:'one'},{id:'two'}]};bridge.tree=async()=>({windows:[window]});bridge.rpc=async(method,params)=>{calls.push({method,params});if(method==='workspace.move')throw new Error('cmux workspace.move rejected (method_not_found)');assert.equal(method,'workspace.reorder');return{}};
 try{await bridge.manage({action:'move-workspace',window_id:'window',workspace_id:'two',group_id:'group',before_workspace_id:'one'});assert.deepEqual(calls,[{method:'workspace.reorder',params:{window_id:'window',workspace_id:'two',before_workspace_id:'one'}}]);calls.length=0;await bridge.manage({action:'move-workspace',window_id:'window',workspace_id:'anchor',move_group:true});assert.deepEqual(calls,[{method:'workspace.reorder',params:{window_id:'window',workspace_id:'anchor',index:window.workspaces.length-1}}])}finally{bridge.close()}
});
test('removing membership refreshes the native inventory before computing end index after generated-anchor cleanup',async()=>{
 const bridge=new CmuxBridge(),calls=[],window={id:'window',groups:[{id:'group',anchor_workspace_id:'anchor',member_workspace_ids:['anchor','one']}],workspaces:[{id:'outside'},{id:'anchor'},{id:'one'}]};bridge.tree=async()=>({windows:[structuredClone(window)]});bridge.rpc=async(method,params)=>{calls.push({method,params});if(method==='workspace.move')throw new Error('cmux workspace.move rejected (method_not_found)');if(method==='workspace.group.remove'){window.groups=[];window.workspaces=window.workspaces.filter(w=>w.id!=='anchor')}return{}};
 try{await bridge.manage({action:'move-workspace',window_id:'window',workspace_id:'one',group_id:null});assert.deepEqual(calls,[{method:'workspace.group.remove',params:{window_id:'window',workspace_id:'one'}},{method:'workspace.reorder',params:{window_id:'window',workspace_id:'one',index:1}}])}finally{bridge.close()}
});
