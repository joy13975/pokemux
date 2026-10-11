import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const phone=JSON.parse(await readFile(new URL('./touch-canaries.json',import.meta.url),'utf8')).layout.viewport;

export async function verifyCompactChrome(tab){
 const layout=await tab.playwright.evaluate(()=>Object.fromEntries(['.workspacehead','.panetabs','#appActions','.terminalwrap'].map(selector=>[selector,document.querySelector(selector).getBoundingClientRect().toJSON()])));
 const header=layout['.workspacehead'],tabs=layout['.panetabs'],menu=layout['#appActions'],terminal=layout['.terminalwrap'];
 assert.equal(tabs.top,header.top,'Tabs must occupy the first row, with no repeated workspace heading above');
 assert.ok(header.height<=46&&menu.height>=44,'One compact row must preserve the menu touch target');
 assert.ok(tabs.right<=menu.left&&menu.right<=header.right,'Tabs must leave the app menu reachable');
 assert.ok(Math.abs(terminal.top-header.bottom)<=1,'Terminal must meet top navigation without overlap or an empty strip');
 return layout;
}

export async function verifyFit(tab, viewport) {
  const measurements=[];
  for(const dimensions of [{width:390,height:844},{width:320,height:844},{width:phone.height,height:phone.width},phone]) {
    const {width}=dimensions;await viewport.set(dimensions);await tab.getAXState({emit:false});
    const size=await tab.playwright.evaluate(()=>{const wrap=document.querySelector('.terminalwrap'),output=document.querySelector('.terminal'),cursor=output.querySelector('.remote-cursor');return {width:innerWidth,client:wrap.clientWidth,scroll:wrap.scrollWidth,font:getComputedStyle(output).fontSize,intrinsicWidth:getComputedStyle(output).width,terminal:output.getBoundingClientRect().toJSON(),view:wrap.getBoundingClientRect().toJSON(),cursor:cursor?.getBoundingClientRect().toJSON(),scale:visualViewport.scale};});
    assert.ok(size.client>=width-28,`Closed sidebar must not consume phone viewport at ${width}px`);
    assert.ok(size.terminal.left>=size.view.left-1);
    assert.ok(size.cursor,'Authoritative cursor must be present');
    assert.ok(parseFloat(size.font)>=16,'Editable text must retain its focus-safe font size');
    size.zoom=size.terminal.width/parseFloat(size.intrinsicWidth);assert.equal(size.scale,1);size.displayFontPx=parseFloat(size.font)*parseFloat(size.zoom);assert.ok(size.displayFontPx>=10,'Reading must use readable text rather than shrinking a wide Mac grid');measurements.push(size);
  }
  return measurements;
}

export async function verifyGlyphs(tab){
  const geometry=await tab.playwright.evaluate(()=>{const output=document.querySelector('.terminal');return {markers:[...output.querySelectorAll('span')].filter(e=>e.textContent==='|'&&!e.querySelector('span')).map(e=>e.getBoundingClientRect().toJSON()),cursor:output.querySelector('.remote-cursor').getBoundingClientRect().toJSON()}});
  assert.equal(geometry.markers.length,5);
  const x=geometry.markers[0].left;
  assert.ok(geometry.markers.every(m=>Math.abs(m.left-x)<1),'Characters placed at the same cmux column must align despite Unicode fallback fonts: '+JSON.stringify(geometry.markers.map(m=>m.left)));
  assert.ok(Math.abs(geometry.cursor.left-geometry.markers[4].left)<1,'Cursor must align to the authoritative column');
  assert.ok(geometry.cursor.top<=geometry.markers[4].top+1&&geometry.cursor.bottom>=geometry.markers[4].bottom-1,'Cursor must cover the glyph row');return geometry;
}

export async function verifyHistoryLayout(tab){
 await verifyGlyphs(tab);
 const metrics=await tab.playwright.evaluate(()=>{const output=document.querySelector('.terminal'),style=getComputedStyle(output);return {rows:output.querySelectorAll('.terminal-row').length,terminalTop:output.getBoundingClientRect().top,lineHeight:style.lineHeight,pixels:output.getBoundingClientRect().width,width:style.width,cursor:output.querySelector('.remote-cursor').getBoundingClientRect().toJSON(),view:output.closest('.terminalwrap').getBoundingClientRect().toJSON(),actualTop:output.querySelector('.remote-cursor').getBoundingClientRect().top}});
 metrics.zoom=metrics.pixels/parseFloat(metrics.width);assert.equal(metrics.rows,4015);assert.ok(metrics.cursor.top>=metrics.view.top&&metrics.cursor.bottom<=metrics.view.bottom,'Fresh history must keep the input cursor inside the terminal viewport');
 return metrics;
}
