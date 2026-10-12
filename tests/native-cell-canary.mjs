import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function verifyNativeCells(inspector,{receipt='NATIVE_CELL_RESULT.json',inputTail='flowing'}={}){
 const expression=`JSON.stringify([(()=>{let overflow=0,maxOverflow=0,cursorGap;for(const row of document.querySelectorAll('.terminal-row')){for(const span of row.children){if(span.classList.contains('remote-cursor')||!span.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(span);const box=span.getBoundingClientRect(),text=range.getBoundingClientRect();if(/^[\\x00-\\x7f]+$/.test(span.textContent)){const excess=text.width-box.width;if(excess>.5)overflow++;maxOverflow=Math.max(maxOverflow,excess)}}const cursor=row.querySelector('.remote-cursor');if(cursor){const walker=document.createTreeWalker(row,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){const index=node.data.indexOf(${JSON.stringify(inputTail)});if(index<0)continue;const range=document.createRange();range.setStart(node,index+${inputTail.length});range.collapse(true);cursorGap=cursor.getBoundingClientRect().left-range.getBoundingClientRect().left;break}}}return{overflow,maxOverflow,cursorGap}})()])`;
 const initial=await inspector.getAXState({emit:false,disableDiffing:true}),prompt=Number(initial.match(/(\d+) text entry area.*Console prompt/)[1]);
 await inspector.click(prompt);await inspector.paste(expression);await inspector.pressKey('Return');
 const state=await inspector.getAXState({emit:false,disableDiffing:true}),matches=[...state.matchAll(/text (\[\{[^\n]+cursorGap[^\n]+)/g)];
 assert.ok(matches.length,'Native inspector returned cell geometry');const geometry=JSON.parse(matches.at(-1)[1].replaceAll('\\"','"'));
 const result={time:new Date().toISOString(),sourceSha256:createHash('sha256').update(await readFile(new URL('../index.html',import.meta.url))).digest('hex'),scope:'Native iPhone13ProMax Simulator Safari all styled rows and end-of-input cursor geometry',geometry};
 await writeFile(new URL('../'+receipt,import.meta.url),JSON.stringify(result,null,2)+'\n');
 assert.equal(geometry.length,1);assert.equal(geometry[0].overflow,0,'Styled text must fit its declared terminal cells');assert.equal(typeof geometry[0].cursorGap,'number','Expected input tail is visible');assert.ok(Math.abs(geometry[0].cursorGap)<.5,'At input end the remote cursor must follow the last visible glyph');
 return result;
}

export async function verifyNativeEditing(simulator,inspector,points){
 const {execFileSync}=await import('node:child_process'),info=JSON.parse(await readFile(new URL('../state/browser-fixture-info.json',import.meta.url),'utf8')),steps=[],checks=[];
 const replay=()=>JSON.parse(execFileSync('/Applications/cmux.app/Contents/Resources/bin/cmux',['--socket','/Users/USER/.local/state/cmux/cmux.sock','--json','rpc','terminal.replay',JSON.stringify({workspace_id:info.workspaceId,surface_id:info.shellSurfaceId,anchor:'screen'})],{encoding:'utf8'})).render_grid;
 const tap=async key=>{assert.ok(points[key],'Observed key coordinate '+key);await simulator.click(points[key]);await simulator.getAXState({emit:false});steps.push({tap:key,point:points[key]})};
 const hardware=async key=>{await simulator.pressKey(key);await simulator.getAXState({emit:false});steps.push({hardware:key})};
 await tap('Ctrl');await tap('u');const base=replay().cursor.column;
 for(const key of ['c','a','t','Space','f','l','o'])await tap(key);await hardware('w');for(const key of ['i','n','g'])await tap(key);
 const check=async name=>{const frame=replay(),line=frame.row_spans.filter(s=>s.row===frame.cursor.row).map(s=>s.text).join('').trimEnd();assert.ok(line.endsWith('cat flowing'),line);assert.equal(frame.cursor.column,base+'cat flowing'.length);const geometry=await verifyNativeCells(inspector);checks.push({name,cursor:frame.cursor,geometry:geometry.geometry})};
 await check('Styled command and argument typing');
 for(let n=0;n<3;n++)await hardware('Left');assert.equal(replay().cursor.column,base+'cat flowing'.length-3,'Left must actually move before Right restores the end');for(let n=0;n<3;n++)await hardware('Right');await check('Left then Right reaches the actual visual end');
 await tap('Backspace');await tap('Backspace');await tap('n');await tap('g');await check('Delete then retype retains cursor alignment');
 await writeFile(new URL('../proof-native-cells-after.png',import.meta.url),await simulator.getScreenshot({emit:false}));
 const result={passed:true,time:new Date().toISOString(),scope:'Native iPhone Simulator custom key clicks and hardware w/Left/Right; no terminal execution',checks,steps,sourceSha256:{}};
 for(const name of ['index.html','grid.mjs'])result.sourceSha256[name]=createHash('sha256').update(await readFile(new URL('../'+name,import.meta.url))).digest('hex');
 await writeFile(new URL('../NATIVE_EDITING_RESULT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');return result;
}
