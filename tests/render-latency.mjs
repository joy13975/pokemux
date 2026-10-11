import {performance} from 'node:perf_hooks';
import {writeFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {RenderGrid} from '../grid.mjs';
const samples=[];
for(let run=0;run<5;run++){
 const {document}=new JSDOM('<pre></pre>').window,output=document.querySelector('pre'),grid=new RenderGrid();
 const frame={format:'cmux.render-grid.v1',render_epoch:'latency-probe',render_revision:1,full:true,rows:30,columns:120,scrollback_rows:4000,scrollback_spans:Array.from({length:4000},(_,row)=>({row,column:0,text:`History line ${row}`,cell_width:20})),row_spans:[{row:0,column:0,text:'> ',cell_width:2}],cursor:{row:0,column:2,visible:true,style:'block'}};
 grid.apply(frame);grid.paint(output);frame.render_revision++;frame.row_spans[0]={row:0,column:0,text:'> a',cell_width:3};frame.cursor.column=3;
 const at=performance.now();grid.apply(frame);const applied=performance.now();grid.paint(output);samples.push({applyMs:applied-at,paintMs:performance.now()-applied});document.defaultView.close();
}
const median=k=>samples.map(s=>s[k]).sort((a,b)=>a-b)[2];const result={time:new Date().toISOString(),scope:'Node/JSDOM4000-row authoritative full replay update; excludes cmux/Tailscale/device/display',samples,medianApplyMs:median('applyMs'),medianPaintMs:median('paintMs')};console.log(JSON.stringify(result,null,2));if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n');
