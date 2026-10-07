import test from 'node:test';import assert from 'node:assert/strict';
import {browserContextDigest} from '../src/continuity/browser-context-digest.mjs';
import {continuityDigest} from '../docs/contracts/private-continuity.mjs';
test('browser digest matches the reviewed context oracle for unordered Unicode claims',async()=>{
 for(const value of [{z:null,a:{next:'合成內容 한국어',n:12},list:[true,false,null,'line\nquoted"']},{claims:{stage:{value:'SYNTHETIC',verificationStatus:'SOURCE_RECORDED'}},authority:{writerEnabled:false}}])assert.equal(await browserContextDigest(value),continuityDigest(value));
});
test('browser digest refuses unsupported numeric values and excessive private response sizes',async()=>{
 for(const v of [NaN,Infinity,1.5,{x:undefined},{x:'a'.repeat(262145)}])await assert.rejects(()=>browserContextDigest(v));
});
