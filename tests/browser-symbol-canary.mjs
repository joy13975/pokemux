import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function verifySymbols(tab,cdp){
 const info=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8'));
 assert.ok((await tab.url()).endsWith('/'+info.shellSurfaceId),'Use only the owned glyph shell');
 const text=await tab.playwright.locator('.terminal').textContent();assert.ok(text.includes('⏺ Writing ⏺︎ Text ⏺️ Emoji'),'Streamed and copyable characters retain exact variation selectors');
 await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument',{}),{nodeIds}=await cdp.send('DOM.querySelectorAll',{nodeId:root.nodeId,selector:'.terminal-row > span > span > span'}),glyphs=[];
 for(const nodeId of nodeIds){const {outerHTML}=await cdp.send('DOM.getOuterHTML',{nodeId});if(!outerHTML.includes('⏺'))continue;glyphs.push({markup:outerHTML,fonts:(await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts})}
 assert.equal(glyphs.length,3);for(const glyph of glyphs.slice(0,2))assert.ok(glyph.fonts.some(font=>font.isCustomFont&&font.glyphCount===1),'Text markers must use bundled glyphs, not OS fallback');assert.ok(glyphs[2].fonts.some(font=>!font.isCustomFont&&/Emoji/.test(font.familyName)),'Explicit emoji must retain emoji presentation');
 const cells=await tab.playwright.locator('.terminal-row > span > span').evaluateAll(nodes=>nodes.filter(n=>n.textContent.startsWith('⏺')).map(n=>n.getBoundingClientRect().width));assert.equal(cells.length,3);assert.ok(Math.abs(cells[0]-cells[1])<.1&&Math.abs(cells[2]-2*cells[0])<.1,'Text markers retain one terminal cell and explicit emoji retains two');
 const sourceSha256={};for(const file of ['index.html','grid.mjs','server.mjs'])sourceSha256[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
 const receipt={passed:true,time:new Date().toISOString(),scope:'Real owned cmux glyph shell, Chrome font selection and unchanged Unicode text',sourceSha256,glyphs,cellWidths:cells};await writeFile(new URL('../SYMBOL_RENDER_RESULT.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');return receipt;
}
