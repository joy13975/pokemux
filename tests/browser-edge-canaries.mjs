import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function verifyEdgeDrawers(tab,cdp){
 const steps=[],checks=[],observe=()=>tab.getAXState({emit:false});
 const wait=async test=>{const end=Date.now()+3000;while(!await test()){assert.ok(Date.now()<end,'Drawer must settle after release');await new Promise(r=>setTimeout(r,20))}};
 const touch=async(type,x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});steps.push({type,x,y});};
 const tap=async selector=>{const r=await tab.playwright.locator(selector).evaluate(e=>e.getBoundingClientRect().toJSON());assert.ok(r.height&&r.top>=0&&r.bottom<=926);await touch('touchStart',r.x+r.width/2,r.y+r.height/2);await touch('touchEnd');await observe()};
 const leftOpen=()=>tab.playwright.locator('#shell').evaluate(e=>e.classList.contains('sidebar-open'));
 const rightOpen=()=>tab.playwright.locator('#dialog').evaluate(e=>e.open&&e.matches(':modal')&&e.classList.contains('app-drawer'));
 await touch('touchStart',2,200);await touch('touchMove',92,200);await observe();
 let preview=await tab.playwright.locator('#sidebar').evaluate(e=>e.getBoundingClientRect().toJSON());assert.ok(preview.right>50&&preview.right<200,'Left drawer follows partial finger motion');
 await touch('touchMove',12,200);await touch('touchEnd');await observe();await wait(async()=>!await leftOpen());assert.equal(await leftOpen(),false);
 await touch('touchStart',2,200);await touch('touchMove',222,200);await touch('touchEnd');await observe();await wait(leftOpen);await wait(async()=>await tab.playwright.locator('#sidebar').evaluate(e=>Math.abs(e.getBoundingClientRect().left)<1));assert.equal(await leftOpen(),true);
 await touch('touchStart',220,200);await touch('touchMove',20,200);await touch('touchEnd');await observe();await wait(async()=>!await leftOpen());assert.equal(await leftOpen(),false);
 checks.push('Left edge previews between closed/open, reversal cancels, release commits and reverse drag dismisses');
 await touch('touchStart',426,200);await touch('touchMove',336,200);await observe();
 preview=await tab.playwright.locator('#dialog').evaluate(e=>({box:e.getBoundingClientRect().toJSON(),modal:e.matches(':modal')}));assert.equal(preview.modal,false);assert.ok(preview.box.left>200&&preview.box.left<400,'Right menu follows partial finger motion');
 await touch('touchMove',416,200);await touch('touchEnd');await observe();await wait(async()=>!await rightOpen());assert.equal(await rightOpen(),false);
 await touch('touchStart',426,200);await touch('touchMove',206,200);await touch('touchEnd');await observe();await wait(rightOpen);assert.equal(await rightOpen(),true);
 await tap('#menuKeyboard');assert.equal(await tab.playwright.locator('#dialog [data-panel].active').getAttribute('data-panel'),'keys');
 await touch('touchStart',426,200);await touch('touchMove',336,200);await touch('touchMove',416,200);await touch('touchEnd');await observe();assert.equal(await tab.playwright.locator('#dialog [data-panel].active').getAttribute('data-panel'),'keys');
 await tap('#dialogClose');checks.push('Right edge previews nonmodally, reverses, settles modal on release, accepts first tap and canceled pull preserves shortcut panel');
 const result={time:new Date().toISOString(),passed:true,scope:'Chrome actual input-engine edge touch at428x926; native Safari edge interception remains separate',sourceSha256:createHash('sha256').update(await readFile(new URL('../index.html',import.meta.url))).digest('hex'),checks,steps};
 await writeFile(new URL('../BROWSER_EDGE_RESULT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');return result;
}
