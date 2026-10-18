import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const samples={pointerdown:[],pointerup:[]};
for(const line of (await readFile(process.argv[2],'utf8')).split('\n')){
 if(!line.startsWith('Input trace: '))continue;
 const event=JSON.parse(line.slice(13));
 if(!Object.hasOwn(samples,event.type)||event.hidden!==false||!(/^[a-z]$/.test(event.target)||event.target==='Space'))continue;
 assert.ok(Number.isFinite(event.dispatchMs));samples[event.type].push(event.dispatchMs);
}
const summarize=values=>{assert.ok(values.length,'Native keyboard event samples are required');values.sort((a,b)=>a-b);return {events:values.length,p50Milliseconds:values[Math.floor(values.length*.5)],p95Milliseconds:values[Math.floor(values.length*.95)],maxMilliseconds:values.at(-1)}};
assert.equal(samples.pointerdown.length,samples.pointerup.length,'All measured contacts completed');
console.log(JSON.stringify({device:'iPhone 13 Pro Max Simulator, iOS26.3',scope:'Native document capture to document bubble, including key handler and intervening microtasks; excludes paint and transport completion',clock:'WebKit performance.now, approximately 1ms quantization',pointerdown:summarize(samples.pointerdown),pointerup:summarize(samples.pointerup)},null,2));
