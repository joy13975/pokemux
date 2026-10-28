import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function verifyScaleAndSymbols(tab,cdp,{fixed=false}={}){
 assert.equal(new URL(await tab.url()).origin,'http://localhost:4392');
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:420,height:844,deviceScaleFactor:3,mobile:true});await cdp.send('Page.reload',{});
 await tab.playwright.getByRole('textbox',{name:'Glyph probe terminal',exact:true}).waitFor({state:'visible',timeoutMs:10000});
 const state=()=>tab.playwright.evaluate(()=>({width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale,output:document.querySelector('.terminal').getBoundingClientRect().width,scroll:document.querySelector('.terminalwrap').scrollLeft}));
 const initial=await state();await cdp.send('DOM.enable',{});await cdp.send('CSS.enable',{});const {root}=await cdp.send('DOM.getDocument',{}),{nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'.terminal-row:nth-child(9) > span > span:first-child > span'}),{fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
 const marker=await tab.playwright.locator('.terminal-row:nth-child(9) > span > span:first-child > span').textContent();assert.equal(marker,'⏺','The exact copyable source character must remain unchanged');
 assert.equal(initial.scale,fixed?1:.5);assert.equal(initial.width,fixed?420:840);assert.equal(initial.height,fixed?844:1688);assert.ok(fonts.some(font=>fixed?font.isCustomFont:!font.isCustomFont&&/Emoji/.test(font.familyName)),fixed?'Marker must use bundled monochrome font without a font download':'Reproduce the color emoji fallback for bare U+23FA');
 const variantMetadata=await tab.playwright.locator('.terminal-row:nth-child(10) > span > span > span').evaluateAll(nodes=>nodes.map(node=>({codepoints:[...node.textContent].map(c=>c.codePointAt(0)),width:node.parentElement.getBoundingClientRect().width}))),variantFonts=[];
 const variantIds=(await cdp.send('DOM.querySelectorAll',{nodeId:root.nodeId,selector:'.terminal-row:nth-child(10) > span > span > span'})).nodeIds;
 if(fixed){assert.equal(variantIds.length,5);for(const nodeId of variantIds)variantFonts.push((await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts);assert.equal(variantMetadata[0].codepoints.join(','),[0x23fa,0xfe0e].join(','));assert.equal(variantMetadata[1].codepoints.join(','),[0x23fa,0xfe0f].join(','));for(const i of [0,2,3,4])assert.ok(variantFonts[i].some(font=>font.isCustomFont));assert.ok(variantFonts[1].some(font=>!font.isCustomFont&&/Emoji/.test(font.familyName)));assert.ok(Math.abs(variantMetadata[1].width-variantMetadata[0].width*2)<.1)}
 let panned,pinched;
 if(fixed){await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id}))});
  await touch('touchStart',[[300,350]]);try{await touch('touchMove',[[230,350]]);panned=await state();assert.ok(panned.scroll>=60)}finally{await touch('touchEnd')}
  await touch('touchStart',[[100,200],[300,400]]);try{await touch('touchMove',[[170,270],[230,330]]);pinched=await state();assert.ok(pinched.output<initial.output-100);assert.ok(pinched.output<=420);assert.equal(pinched.scale,1)}finally{await touch('touchEnd')}
 }
 const sourceSha256={};for(const file of ['index.html','grid.mjs','server.mjs'])sourceSha256[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
 const result={passed:true,fixed,scope:'Isolated fault replay: initial browser scale0.5 from physical trace, unavailable remote symbol font and iOS-style color-emoji fallback; no user terminal content',initial,fonts,codepoints:['U+23FA'],variantMetadata,variantFonts,panned,pinched,sourceSha256};const name=fixed?'SCALE_SYMBOL_AFTER':'SCALE_SYMBOL_BEFORE';await writeFile(new URL('../'+name+'.json',import.meta.url),JSON.stringify(result,null,2)+'\n');await writeFile(new URL('../'+name+'.png',import.meta.url),await tab.screenshot({fullPage:false}));return result;
}
