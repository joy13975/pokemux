import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {JSDOM} from 'jsdom';

for(const mode of ['login','register','existing','retry','cancel'])test(`setup automatically opens terminals: ${mode}`,async()=>{
 const dom=new JSDOM(readFileSync(new URL('../setup.html',import.meta.url),'utf8'),{pretendToBeVisual:true}),d=dom.window.document,calls=[],navigations=[];
 Object.defineProperty(d,'hasFocus',{value:()=>true});
 let authenticated=mode==='existing',fail=mode==='retry',credentialCalls=0;
 const credential=async()=>{credentialCalls++;if(mode==='cancel')throw new Error('Passkey canceled');return {id:'verified-credential'}};
 runInNewContext(readFileSync(new URL('../setup.mjs',import.meta.url),'utf8'),{
  window:Object.assign(dom.window,{SimpleWebAuthnBrowser:{startRegistration:credential,startAuthentication:credential}}),document:d,
  location:{replace:path=>navigations.push(path)},fetch:async(path,options)=>{
   calls.push(path);let result={};
   if(path==='/api/auth')result={authenticated,registered:mode!=='register'};
   else if(path.endsWith('-verify')){assert.equal(JSON.parse(options.body).id,'verified-credential');authenticated=true;result={authenticated:true}};
   if(path==='/api/connect'&&fail)return {ok:false,json:async()=>({error:'Host unavailable'})};
   return {ok:true,json:async()=>result};
  }
 });
 const settle=()=>new Promise(r=>setImmediate(r));await settle();
 try{
  if(mode==='register')await d.querySelector('#unlock').onclick();
  await settle();
  if(mode==='cancel'){assert.equal(credentialCalls,1,'Enrolled passkey must start without a tap');assert.equal(authenticated,false);assert.deepEqual(navigations,[]);assert.equal(calls.includes('/api/connect'),false);assert.equal(d.querySelector('#passkey').hidden,false);return}
  if(mode==='retry'){
   assert.deepEqual(navigations,[]);assert.equal(d.querySelector('#message').textContent,'Host unavailable');assert.equal(d.querySelector('#connect').hidden,false);
   fail=false;await d.querySelector('#connectButton').onclick();await settle();
  }
  assert.deepEqual(navigations,['/'],'Verified passkey must open terminals without another click');
  assert.equal(calls.includes('/api/connect'),true);assert.equal(d.querySelector('#passkey').hidden,true);assert.equal(credentialCalls,mode==='existing'?0:1);
 }finally{dom.window.close()}
});

test('automatic passkey cancellation allows one manual retry without looping or duplicate ceremonies',async()=>{
 const dom=new JSDOM(readFileSync(new URL('../setup.html',import.meta.url),'utf8'),{pretendToBeVisual:true}),d=dom.window.document;
 Object.defineProperty(d,'hasFocus',{value:()=>true});
 let calls=0,authenticated=false,release;const navigations=[];
 runInNewContext(readFileSync(new URL('../setup.mjs',import.meta.url),'utf8'),{
  window:Object.assign(dom.window,{SimpleWebAuthnBrowser:{startAuthentication:async()=>{calls++;if(calls===1)throw new Error('Canceled');await new Promise(resolve=>release=resolve);return {id:'retry'}}}}),document:d,
  location:{replace:p=>navigations.push(p)},fetch:async(path)=>{if(path.endsWith('-verify'))authenticated=true;return {ok:true,json:async()=>path==='/api/auth'?{registered:true,authenticated}:{}}}
 });
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 try{
  await settle();assert.equal(calls,1);assert.equal(d.querySelector('#unlock').disabled,false);
  const retry=d.querySelector('#unlock').onclick();await settle();
  assert.equal(calls,2);assert.equal(d.querySelector('#unlock').disabled,true);
  await d.querySelector('#unlock').onclick();await settle();assert.equal(calls,2,'In-flight ceremony must not start a duplicate');
  release();await retry;await settle();assert.equal(navigations.length,1);assert.equal(calls,2);
 }finally{dom.window.close()}
});

test('automatic passkey waits for document focus after Safari address-bar navigation',async()=>{
 const dom=new JSDOM(readFileSync(new URL('../setup.html',import.meta.url),'utf8'),{pretendToBeVisual:true}),d=dom.window.document;
 let focused=false,calls=0;
 Object.defineProperty(d,'hasFocus',{value:()=>focused});
 runInNewContext(readFileSync(new URL('../setup.mjs',import.meta.url),'utf8'),{
  window:Object.assign(dom.window,{SimpleWebAuthnBrowser:{startAuthentication:async()=>{calls++;throw new Error('Canceled')}}}),document:d,
  location:{replace:()=>assert.fail('Canceled ceremony cannot navigate')},fetch:async()=>({ok:true,json:async()=>({registered:true,authenticated:false})})
 });
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 try{
  await settle();assert.equal(calls,0,'WebAuthn must not start before Safari gives the document focus');
  focused=true;dom.window.dispatchEvent(new dom.window.Event('focus'));await settle();assert.equal(calls,1);
  dom.window.dispatchEvent(new dom.window.Event('focus'));d.dispatchEvent(new dom.window.Event('visibilitychange'));await settle();assert.equal(calls,1,'Returning from canceled sheet must not launch another');
 }finally{dom.window.close()}
});

test('the complete terminal module parses, including asynchronous startup',()=>{const page=readFileSync(new URL('../index.html',import.meta.url),'utf8'),module=page.split('<script type="module">\n')[1].split('</script>')[0];execFileSync(process.execPath,['--check','--input-type=module'],{input:module});});
