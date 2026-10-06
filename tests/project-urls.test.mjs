import {canonicalRoot} from './helpers/fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadProjectUrls} from '../src/canonical/project-url-metadata.mjs';
import {buildProjection} from '../src/projection/projection-service.mjs';
import {primaryProjectLink,createProjectLink} from '../public/project-links.js';
import {release} from '../src/release.mjs';
const expected={NEXAEON:'https://nexaeon-web.vercel.app/',WOOSONG_BUDDY:'https://woosong-buddy-app.vercel.app/',NAMYOUNG_WEB3D:'https://namyoung-web3d.vercel.app/',JOEY_ASSET_SYSTEM:'https://namyoung-asset-lab.joeyaj.chatgpt.site/'};
test('verified URL metadata survives real project reload with distinct classifications',async()=>{
 const metadata=await loadProjectUrls();assert.equal(metadata.projects.length,4);
 const first=await buildProjection(canonicalRoot);const second=await buildProjection(canonicalRoot);
 for(const [id,url] of Object.entries(expected)){
  const p=first.projects.find(x=>x.id===id),again=second.projects.find(x=>x.id===id),link=primaryProjectLink(p);
  assert.equal(link.url,url);const rendered=createProjectLink(link,{createElement:()=>({})},'zh-TW');assert.match(rendered.textContent,id==='JOEY_ASSET_SYSTEM'?/開啟目前網站/:/開啟正式網站/);assert.equal(rendered.href,url);assert.equal(primaryProjectLink(again).url,url);
  assert.equal(link.type,id==='JOEY_ASSET_SYSTEM'?'current_application':'canonical_production');
  assert.equal(link.deploymentVerification,'not_verified');assert.equal(link.deployedGitSha,null);
 }
 const asset=first.projects.find(x=>x.id==='JOEY_ASSET_SYSTEM');
 assert.equal(asset.projectUrls.entries.some(x=>x.type==='canonical_production'),false);
 assert.equal(asset.where.production.value,'Unknown');assert.equal(primaryProjectLink(asset).status,'active_legacy_named');
});
test('safe links use exact verified URL and new-tab isolation; missing or unsafe URLs have no link',()=>{
 const doc={createElement:()=>({})};
 for(const [id,url] of Object.entries(expected)){
  const entry={url,type:id==='JOEY_ASSET_SYSTEM'?'current_application':'canonical_production',urlVerification:'joey_confirmed'};
  const link=createProjectLink(entry,doc,'zh-TW');
  assert.equal(link.href,url);assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');
  assert.match(link.textContent,id==='JOEY_ASSET_SYSTEM'?/開啟目前網站/:/開啟正式網站/);
 }
 assert.equal(primaryProjectLink({}),null);
 for(const url of ['javascript:alert(1)','https://user:pass@example.com/','https://example.com/\n','http://example.com/','https://example.com/\u0000','https://example.com/\\path'])assert.equal(createProjectLink({url,type:'canonical_production',urlVerification:'joey_confirmed'},doc),null);
 assert.equal(createProjectLink({url:expected.NEXAEON,type:'canonical_production',urlVerification:'unverified'},doc),null);
});
test('URL fields do not change project canonical truth or acceptance',async()=>{
 const root=canonicalRoot;const a=await buildProjection(root),b=await buildProjection(root,{projectUrlMetadata:{schemaVersion:'1.0',projects:[]}});
 const stable=v=>JSON.parse(JSON.stringify(v,(k,x)=>k==='readAt'?undefined:x));
 for(const p of a.projects){const q=b.projects.find(x=>x.id===p.id);for(const key of ['status','phase','currentTask','lastAI','model','lastCompleted','sourceFingerprints'])assert.deepEqual(stable(p[key]),stable(q[key]));assert.equal(primaryProjectLink(q),null);}
 assert.equal(release.releaseStatus,'public-test');
});
test('URL metadata schema rejects malformed records and supports preview and legacy without promoting them',async()=>{
 const {validate,loadSchema}=await import('../src/api/validation.mjs');const schema=await loadSchema('project-urls');const metadata=await loadProjectUrls();assert.equal(validate(schema,metadata).valid,true);
 const invalid=structuredClone(metadata);invalid.projects[0].entries[0].url='javascript:alert(1)';assert.equal(validate(schema,invalid).valid,false);
 for(const type of ['preview_test','legacy']){const p={projectUrls:{entries:[{...metadata.projects[0].entries[0],type}]}};assert.equal(primaryProjectLink(p),null);}
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');assert.match(source,/createProjectLink/);assert.match(source,/deploymentOverview/);
});

test('conflicting Registry suppresses production navigation and cases never inherit parent links',async()=>{
 const {resolveProjectUrls}=await import('../src/canonical/project-url-metadata.mjs');const metadata=await loadProjectUrls();
 const p={projectUrls:resolveProjectUrls('NEXAEON',{production:'https://different.example/'},metadata)};
 assert.equal(primaryProjectLink(p),null);assert.equal(p.projectUrls.issues.length,1);
 const projection=await buildProjection(canonicalRoot);for(const c of projection.cases)assert.equal(primaryProjectLink(c),null);
});
