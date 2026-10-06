import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {assertPublicCases} from '../src/public-cases.mjs';
import {productionResponse} from '../api/index.mjs';
import {renderPublicCases} from '../public/public-cases.js';
const snapshot=JSON.parse(await fs.readFile(new URL('../deployment/public-cases.v03e.json',import.meta.url)));
const response=method=>productionResponse(method,new URL('https://fixture/api/index?route=public-cases'));
test('public case snapshot is a single approved Asset child, not a new project or private source export',()=>{
 assert.equal(assertPublicCases(snapshot),snapshot);assert.equal(response('GET').status,200);assert.equal(response('GET').body.cases[0].assetVersion,'0.4.0-admissions-candidate');assert.equal(productionResponse('GET',new URL('https://fixture/api/index?route=projects')).body.length,4);
 for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal(response(method).status,403);
 for(const route of ['proposals','asset-catalog'])assert.equal(productionResponse('GET',new URL('https://fixture/api/index?route='+route)).status,404);
 assert.doesNotMatch(JSON.stringify(response('GET').body),/\/Users\/|libfile_|sourceRefs|sourceHashes|A6|Sentinel_|[a-f0-9]{64}/);
});
test('public whitelist fails closed for private fields, another case, unapproved links and accepted claims',()=>{
 for(const mutate of [s=>s.privateIdeas=[],s=>s.cases[0].localPath='/Users/private',s=>s.cases.push(structuredClone(s.cases[0])),s=>s.cases[0].parentProjectId='FIFTH_PROJECT',s=>s.cases[0].publicURL='javascript:alert(1)',s=>s.cases[0].source.sourceHashes={a:'private'},s=>s.cases[0].joeyAcceptance='PASSED',s=>s.cases[0].laterLifecycle='COMPLETED',s=>s.cases[0].officialService=true]){const copy=structuredClone(snapshot);mutate(copy);assert.throws(()=>assertPublicCases(copy));}
});
const doc={createElement:tag=>({tag,children:[],dataset:{},events:{},append(...nodes){this.children.push(...nodes);},addEventListener(type,handler){this.events[type]=handler;}})};
const walk=n=>[n,...n.children.flatMap(walk)];
test('public card opens the same child under JoeyAsset and shows admissions-only scope, pending acceptance and public trace in three locales',()=>{
 for(const locale of ['zh-TW','en','ko']){let nav;const root=renderPublicCases(snapshot,{doc,locale,item:'CASE_002_UNIVERSITY',onNavigate:value=>nav=value});const nodes=walk(root);nodes.find(n=>n.dataset.publicCaseOpen).events.click();assert.deepEqual(nav,{project:'JOEY_ASSET_SYSTEM',module:'assets',item:'CASE_002_UNIVERSITY'});assert.equal(nodes.filter(n=>n.dataset.publicCaseDetail).length,1);assert.equal(nodes.filter(n=>n.tag==='li').length,5);assert.equal(nodes.filter(n=>n.tag==='a').length,2);assert.equal(nodes.find(n=>n.tag==='a').href,snapshot.cases[0].publicURL);assert.ok(nodes.some(n=>n.textContent?.includes('37 / 111')));assert.ok(nodes.some(n=>n.textContent?.includes('2026-10-06T08:37:37Z')));}
 const unsafe=structuredClone(snapshot);unsafe.cases[0].publicURL='javascript:alert(1)';const link=walk(renderPublicCases(unsafe,{doc,item:'CASE_002_UNIVERSITY'})).find(n=>n.tag==='a');assert.equal(link.href,undefined);
});
