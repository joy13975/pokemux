import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
import {CmuxBridge} from '../bridge.mjs';
import {RenderGrid} from '../grid.mjs';
import {KanaComposer} from '../kana.mjs';
import {installPopover} from './popover-fixture.mjs';

test('live notification read state drives only its tab/workspace indicators and inbox, including workspace-only notices',async()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://pokemux-test.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,bridge=new CmuxBridge();
 let notices=[];
 const tree={windows:[{id:'window',workspaces:[{id:'owned',title:'Owned',panes:[{id:'pane',selected_surface_id:'one',surfaces:[{id:'one',title:'One',type:'terminal'},{id:'two',title:'Two',type:'terminal'}]}]},{id:'other',title:'Other',panes:[{id:'other-pane',surfaces:[{id:'other-tab',title:'Other tab',type:'terminal'}]}]}]}]};
 bridge.rpc=async method=>{if(method==='system.tree')return structuredClone(tree);if(method==='workspace.group.list')return {groups:[{id:'group',name:'Owned group',anchor_workspace_id:'owned',member_workspace_ids:['owned'],is_empty:false}]};if(method==='notification.list')return {notifications:structuredClone(notices)};throw new Error(method)};
 w.ResizeObserver=class{observe(){}disconnect(){}};w.matchMedia=()=>({matches:true});w.visualViewport={width:428,height:926,scale:1,offsetTop:0,offsetLeft:0,addEventListener(){}};
 w.EventSource=class{addEventListener(){}close(){}};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};installPopover(w);
 w.__RenderGrid=RenderGrid;w.__KanaComposer=KanaComposer;w.fetch=async path=>({ok:true,status:200,json:async()=>{assert.equal(path,'/api/tree');return bridge.tree()}});
 const script=d.querySelector('script[type="module"]').textContent;
 w.eval(script.slice(0,script.lastIndexOf('(async()=>{'))+'RenderGrid=window.__RenderGrid;KanaComposer=window.__KanaComposer;kana=new KanaComposer();connected=true;window.loadInventory=loadTree;window.openInbox=inboxDialog;');
 const dot=s=>d.querySelector(s+' .dot.amber'),tab=id=>`.surfacetab[data-surface="${id}"]`,workspace=id=>`[data-workspace="${id}"]`;
 try{
  await w.loadInventory();assert.equal(dot(tab('one')),null);
  notices=[{id:'read',workspace_id:'owned',surface_id:'two',title:'Already read',is_read:true},{id:'unread',workspace_id:'owned',surface_id:'one',title:'Agent needs review',is_read:false}];
  await w.loadInventory();assert.ok(dot(tab('one')),'Actual unread notification must produce an orange tab dot');assert.equal(dot(tab('two')),null);assert.ok(dot(workspace('owned')));assert.equal(dot(workspace('other')),null);assert.equal(d.querySelector('#inboxCount').textContent,'1');
  w.openInbox();assert.match(d.querySelector('#dialogBody').textContent,/Agent needs review/);
  notices[1].is_read=true;await w.loadInventory();assert.equal(dot(tab('one')),null);assert.equal(dot(workspace('owned')),null);assert.equal(d.querySelector('#inboxCount').textContent,'0');
  notices.push({id:'workspace-only',workspace_id:'other',surface_id:null,title:'Workspace notice',is_read:false});await w.loadInventory();assert.ok(dot(workspace('other')));assert.equal(dot(workspace('owned')),null);w.openInbox();assert.match(d.querySelector('#dialogBody').textContent,/Workspace notice/);
  notices=[];await w.loadInventory();assert.equal(dot(workspace('other')),null);
 }finally{bridge.close();w.close()}
});
