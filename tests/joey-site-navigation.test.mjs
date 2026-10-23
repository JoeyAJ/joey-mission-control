import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {selectedProjectSite} from '../public/project-links.js';
import {loadProjectUrls,applyProjectUrls} from '../src/canonical/project-url-metadata.mjs';
// Same overlay the public API applies before serving the snapshot.
const snapshot=applyProjectUrls(JSON.parse(await fs.readFile(new URL('../deployment/production-snapshot.json',import.meta.url),'utf8')),await loadProjectUrls());
const publicCases=JSON.parse(await fs.readFile(new URL('../deployment/public-cases.v03e.json',import.meta.url),'utf8'));
const metadata=JSON.parse(await fs.readFile(new URL('../metadata/project-urls.v1.json',import.meta.url),'utf8'));
const input=(projectId,track='BASELINE')=>({projectId,track,projects:structuredClone(snapshot.projects),publicCases:structuredClone(publicCases)});
test('each baseline uses its exact Joey-confirmed canonical metadata mapping',()=>{
 for(const p of metadata.projects){const site=selectedProjectSite(input(p.entityId));assert.equal(site.url,p.entries[0].url);assert.equal(site.type,p.entries[0].type);assert(!new URL(site.url).search&&!new URL(site.url).hash);}
});
test('University candidate demo remains separate from Namyoung and every baseline',()=>{
 const site=selectedProjectSite(input('JOEY_ASSET_SYSTEM','UNIVERSITY_CANDIDATE'));assert.equal(site.url,publicCases.cases[0].publicURL);assert.equal(site.type,'candidate_demo');
 for(const id of ['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','MISSION_CONTROL'])assert.equal(selectedProjectSite(input(id,'UNIVERSITY_CANDIDATE')),null);
 assert.notEqual(selectedProjectSite(input('JOEY_ASSET_SYSTEM')).url,site.url);assert.notEqual(selectedProjectSite(input('NAMYOUNG_WEB3D')).url,site.url);
});
test('unknown, unconfirmed, conflicting, duplicate and malformed sources have no website action',()=>{
 for(const id of ['UNKNOWN','MISSION_CONTROL'])assert.equal(selectedProjectSite(input(id)),null);
 assert.equal(selectedProjectSite(input('NEXAEON','UNKNOWN')),null);
 for(const mutate of [i=>i.projects=[],i=>i.projects.push(i.projects[0]),i=>i.projects[0].projectUrls.entries=null,i=>i.projects[0].projectUrls.entries=[null],i=>i.projects[0].projectUrls.source.verificationStatus='unverified',i=>i.projects[0].projectUrls.entries[0].urlVerification='unverified',i=>i.projects[0].where.production.value='https://wrong.invalid/',i=>i.projects[0].projectUrls.entries[0].status='failed']){const i=input('NEXAEON');mutate(i);assert.equal(selectedProjectSite(i),null);}
});
test('credential-bearing, injected, swapped and query/hash URLs never become anchors',()=>{
 for(const url of ['https://user:password@nexaeon-web.vercel.app/','https://nexaeon-web.vercel.app/?token=private','https://nexaeon-web.vercel.app/#credential','https://woosong-buddy-app.vercel.app/','javascript:alert(1)','http://nexaeon-web.vercel.app/','https://nexaeon-web.vercel.app/\n']){const i=input('NEXAEON');i.projects[0].projectUrls.entries[0].url=url;i.projects[0].where.production.value=url;assert.equal(selectedProjectSite(i),null);}
 const i=input('JOEY_ASSET_SYSTEM');i.projects.find(p=>p.id==='JOEY_ASSET_SYSTEM').projectUrls.entries[0].url=publicCases.cases[0].publicURL;assert.equal(selectedProjectSite(i),null);
});
test('candidate needs its existing verified public case and exact parent/asset/source identity',()=>{
 for(const mutate of [i=>i.publicCases=null,i=>i.publicCases.cases={},i=>i.publicCases.cases=[null],i=>i.publicCases.cases.push(i.publicCases.cases[0]),i=>i.publicCases.cases[0].parentProjectId='NAMYOUNG_WEB3D',i=>i.publicCases.cases[0].publicURL='https://namyoung-web3d.vercel.app/',i=>i.publicCases.cases[0].source.kind='unverified',i=>i.publicCases.cases[0].source.verifiedAt='unknown',i=>i.publicCases.cases[0].officialService=true]){const i=input('JOEY_ASSET_SYSTEM','UNIVERSITY_CANDIDATE');mutate(i);assert.equal(selectedProjectSite(i),null);}
});
test('Asset BASELINE opens Joey Asset Studio; the old ChatGPT site is never the open target',()=>{
 const site=selectedProjectSite(input('JOEY_ASSET_SYSTEM'));assert.equal(site.url,'https://joey-asset-studio.vercel.app/');
 const asset=snapshot.projects.find(p=>p.id==='JOEY_ASSET_SYSTEM');assert.equal(asset.projectUrls.entries.filter(e=>/^active/.test(e.status)).map(e=>e.url).join(),'https://joey-asset-studio.vercel.app/');
});
