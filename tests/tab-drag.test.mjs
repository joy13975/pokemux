import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function bindTabDragging()'),html.indexOf('function selectSurface('));
test('held tab drag requests native reorder, selects the moved tab, and cannot move across panes',async()=>{
 const agent={id:'agent'},logs={id:'logs'},side={id:'side'},panes=[{id:'main',active:'agent',tabs:[agent,logs]},{id:'sidepane',active:'side',tabs:[side]}];
 const current={id:'workspace',window:'window',activePane:'main',panes},calls=[],classes={add(){},remove(){}};
 const button=(surface,pane)=>({dataset:{surface,pane},classList:classes,setPointerCapture(){},getBoundingClientRect:()=>({x:0,width:100})});
 const a=button('agent','main'),l=button('logs','main'),other=button('side','sidepane');let clock=0;
 const context=vm.createContext({performance:{now:()=>clock},current,connected:true,document:{querySelectorAll:selector=>selector==='[data-surface]'?[a,l,other]:[],elementFromPoint:()=>({closest:selector=>selector==='[data-surface]'?a:null})},setTimeout:()=>1,clearTimeout(){},orderedTabs:()=>panes.flatMap(pane=>pane.tabs.map(surface=>({pane,surface}))),activeSurface:()=>panes.find(p=>p.id===current.activePane).tabs.find(s=>s.id===panes.find(p=>p.id===current.activePane).active),history:{replaceState(){}},mods:{clear(){}},api:async(path,body)=>calls.push(body),loadTree:async()=>{panes[0].tabs=[logs,agent]},say(){}});
 vm.runInContext(source+';bindTabDragging()',context);const event=x=>({button:0,clientX:x,clientY:50,pointerId:1,preventDefault(){}});
 l.onpointerdown(event(160));clock=400;l.onpointermove(event(10));await l.onpointerup(event(10));
 assert.deepEqual(JSON.parse(JSON.stringify(calls)),[{action:'reorder',workspace_id:'workspace',surface_id:'logs',reference_surface_id:'agent',after:false}]);
 assert.deepEqual(panes.map(p=>p.tabs.map(t=>t.id)),[['logs','agent'],['side']]);assert.equal(current.activePane,'main');assert.equal(panes[0].active,'logs');
 other.onpointerdown(event(160));clock=800;other.onpointermove(event(10));await other.onpointerup(event(10));assert.equal(calls.length,1,'Dragging across panes cannot create a phone-only order or change pane membership');
});
