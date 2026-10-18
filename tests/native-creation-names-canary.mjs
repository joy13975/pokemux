import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
// CUA native taps only. Inspect the current Simulator screenshot before supplying coordinates.
export async function* verifyCreationName(app,{kind,name,openPrompt,cancelPoint,confirmPoint,inventory,proofPrefix}){
 assert.ok(['workspace','tab'].includes(kind));
 const shape=tree=>tree.windows.flatMap(w=>w.workspaces.map(ws=>({id:ws.id,title:ws.title,group:w.groups.find(g=>g.anchor_workspace_id===ws.id||g.member_workspace_ids.includes(ws.id))?.id,surfaces:ws.panes.flatMap(p=>p.surfaces.map(s=>({id:s.id,title:s.title})))})));
 const before=shape(await inventory());
 const open=async()=>{for(const point of openPrompt){await app.click(point);await app.getAXState({emit:false})}};
 await open();assert.deepEqual(shape(await inventory()),before,'Opening the prompt must not create a native object');
 await writeFile(proofPrefix+'-selected.png',await app.getScreenshot({emit:false}));yield 'Review the fully selected default in the native screenshot';
 await app.typeText(name);await app.getAXState({emit:false});await app.click(cancelPoint);await app.getAXState({emit:false});assert.deepEqual(shape(await inventory()),before,'Cancel must leave native objects unchanged');yield 'Cancel creates nothing';
 await open();await app.typeText(name);await app.getAXState({emit:false});await app.click(confirmPoint);await app.getAXState({emit:false});
 let after;const deadline=Date.now()+10000;while(true){after=shape(await inventory());const named=kind==='workspace'?after.find(w=>!before.some(b=>b.id===w.id)&&w.title===name):after.flatMap(w=>w.surfaces).find(s=>!before.flatMap(w=>w.surfaces).some(b=>b.id===s.id)&&s.title===name);if(named)break;assert.ok(Date.now()<deadline,'Typed name must replace the default in the actual created object');await new Promise(r=>setTimeout(r,40))}
 await writeFile(proofPrefix+'-created.png',await app.getScreenshot({emit:false}));yield 'Native inventory confirms the exact typed name';
 return{kind,name,before,after};
}
