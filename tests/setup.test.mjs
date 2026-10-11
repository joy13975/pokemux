import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {JSDOM} from 'jsdom';

for(const mode of ['login','register','existing','retry','cancel'])test(`setup automatically opens terminals: ${mode}`,async()=>{
 const dom=new JSDOM(readFileSync(new URL('../setup.html',import.meta.url),'utf8')),d=dom.window.document,calls=[],navigations=[];
 let authenticated=mode==='existing',fail=mode==='retry',credentialCalls=0;
 const credential=async()=>{credentialCalls++;if(mode==='cancel')throw new Error('Passkey canceled');return {id:'verified-credential'}};
 runInNewContext(readFileSync(new URL('../setup.mjs',import.meta.url),'utf8'),{
  window:{SimpleWebAuthnBrowser:{startRegistration:credential,startAuthentication:credential}},document:d,
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
  if(mode!=='existing')await d.querySelector('#unlock').onclick();
  await settle();
  if(mode==='cancel'){assert.equal(authenticated,false);assert.deepEqual(navigations,[]);assert.equal(calls.includes('/api/connect'),false);assert.equal(d.querySelector('#passkey').hidden,false);return}
  if(mode==='retry'){
   assert.deepEqual(navigations,[]);assert.equal(d.querySelector('#message').textContent,'Host unavailable');assert.equal(d.querySelector('#connect').hidden,false);
   fail=false;await d.querySelector('#connectButton').onclick();await settle();
  }
  assert.deepEqual(navigations,['/'],'Verified passkey must open terminals without another click');
  assert.equal(calls.includes('/api/connect'),true);assert.equal(d.querySelector('#passkey').hidden,true);assert.equal(credentialCalls,mode==='existing'?0:1);
 }finally{dom.window.close()}
});
