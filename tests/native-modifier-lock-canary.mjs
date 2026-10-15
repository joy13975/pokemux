import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Coordinates are for the observed 808x1730 iPhone13ProMax Simulator window, with the keyboard visible and modifiers off.
export async function verifyNativeModifierLocks(app,{root=new URL('../',import.meta.url)}={}){
 const info=JSON.parse(await readFile(new URL('state/browser-fixture-info.json',root),'utf8'));
 const bytes=async()=>Buffer.concat((await readFile(info.log,'utf8')).split('\n').filter(l=>l.startsWith('RECV:')).map(l=>Buffer.from(l.slice(5),'hex'))),offset=(await bytes()).length;
 const ctrl=[187,953],alt=[187,1015],shift=[274,953],c=[332,1297],d=[260,1205],k=[613,1205],x=[260,1297],y=[437,1105],a=[123,1205],b=[473,1297];
 for(const p of [ctrl,ctrl,c,d,k,c,ctrl,x,alt,alt,x,y,alt,shift,shift,a,b])await app.click(p);
 await app.getAXState({emit:false});await writeFile(new URL('proof-native-modifier-lock.png',root),await app.getScreenshot({emit:false}));
 const expected=Buffer.from([3,4,11,3,120,27,120,27,121,65,66]),deadline=Date.now()+5000;
 while((await bytes()).length<offset+expected.length){assert.ok(Date.now()<deadline,'Native Safari modifier sequence reaches owned cmux');await new Promise(r=>setTimeout(r,25))}
 assert.deepEqual((await bytes()).subarray(offset),expected);
 await app.click(shift);await app.getAXState({emit:false});
 const sourceSha256={};for(const file of ['index.html','bridge.mjs'])sourceSha256[file]=createHash('sha256').update(await readFile(new URL(file,root))).digest('hex');
 const result={passed:true,time:new Date().toISOString(),scope:'Native iPhone13ProMax Simulator Safari iOS26.3 coordinate taps, authenticated bridge and owned stock cmux; not physical phone acceptance',expectedHex:expected.toString('hex'),sourceSha256};
 await writeFile(new URL('NATIVE_MODIFIER_LOCK_RESULT.json',root),JSON.stringify(result,null,2)+'\n');return result;
}
