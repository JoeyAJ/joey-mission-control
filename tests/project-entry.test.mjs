import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {projectEntrySnapshots} from '../src/continuity/project-entry-snapshots.mjs';
import {createProjectEntryServer} from '../src/continuity/project-entry-server.mjs';
import {createProjectEntryClient,projectEntryInstructions,validateProjectEntryReply} from '../src/continuity/project-entry-client.mjs';
import handler,{productionResponse} from '../api/index.mjs';
import {ownerAuthConfig} from '../public/owner-auth-config.js';
const OWNER='11111111-1111-4111-8111-111111111111',TOKEN='SYNTHETIC_OWNER_SESSION_00000000',clock=Date.parse('2026-10-09T15:10:00Z');
const actor={subject:OWNER,role:'OWNER',aal:'aal2',verified:true,sessionActive:true,expiresAt:clock+60000};
const req={method:'GET',headers:{authorization:'Bearer '+TOKEN}};
const fixture=(verifyOwner=async()=>actor)=>createProjectEntryServer({verifyOwner,ownerSubject:OWNER,allowedOrigin:'https://fixture.invalid',now:()=>clock});
test('all four verified entries retain exact private source pins and no inferred developer/full website access',async()=>{
 for(const e of projectEntrySnapshots){const r=await fixture().handle(req,{project:e.projectId});assert.equal(r.status,200);assert.equal(validateProjectEntryReply(r.body,e.projectId,clock),r.body);assert.equal(r.headers['Cache-Control'],'private, no-store');assert.equal(e.lastDeveloper.agent,null);assert.equal(e.websiteRepositoryReadable,false);assert.equal(e.websiteContentIncluded,false);assert.equal(e.executionAuthorized,false);assert(e.documents.some(d=>d.path===e.entryPath));}
 const text=JSON.stringify(projectEntrySnapshots);assert(!/\/Users\/|\/home\/|rawModelPayload|authCache|github_pat_|ghp_|workerId|jobId|studentId/.test(text));assert.equal(projectEntrySnapshots.length,4);
});
test('snapshot endpoint rejects unauthenticated, cross-site, write and arbitrary scope requests without exposing entries',async()=>{
 let checks=0;const server=fixture(async()=>{checks++;return actor;});assert.equal((await server.handle({method:'GET',headers:{}},{project:'NEXAEON'})).status,401);assert.equal((await server.handle({...req,method:'POST'},{project:'NEXAEON'})).status,405);assert.equal((await server.handle({...req,headers:{...req.headers,origin:'https://attacker.invalid'}},{project:'NEXAEON'})).status,403);assert.equal((await server.handle({...req,headers:{...req.headers,'sec-fetch-site':'cross-site'}},{project:'NEXAEON'})).status,403);assert.equal(checks,0);
 for(const project of ['MISSION_CONTROL','HANGEUL','../NEXAEON',undefined]){const r=await server.handle(req,{project});assert.equal(r.status,403);assert(!r.body.entry);}
});
test('wrong Owner, role, AAL, expired or revoked sessions are denied before and after metadata assembly',async()=>{
 for(const patch of [{subject:'wrong'},{role:'AGENT'},{aal:'aal1'},{verified:false},{sessionActive:false},{expiresAt:clock}]){assert.equal((await fixture(async()=>({...actor,...patch})).handle(req,{project:'NEXAEON'})).status,403);let n=0;const r=await fixture(async()=>++n===1?actor:{...actor,...patch}).handle(req,{project:'NEXAEON'});assert.equal(r.status,403);assert(!r.body.entry);}
 const r=await fixture(async()=>{throw Error('SYNTHETIC_PRIVATE_UPSTREAM_DETAIL');}).handle(req,{project:'NEXAEON'});assert.equal(r.status,503);assert(!JSON.stringify(r).includes('SYNTHETIC_PRIVATE_UPSTREAM_DETAIL'));
});
test('generic instructions keep mother/candidate history distinct and require fresh receiving-Agent reads',()=>{
 for(const e of projectEntrySnapshots){const text=projectEntryInstructions(e);assert(text.includes(e.commitSha));assert(text.includes(e.observedAt));assert(text.includes('Resolve current branch HEAD first'));assert(text.includes('not live website repository access'));assert(text.includes('Last development Agent: not explicitly recorded'));assert(text.includes('does not authorize deployment, SQL'));assert(!/Agent_PROVIDER_MODEL_REQUIRED|Choose a model/.test(text));}
 const asset=projectEntrySnapshots.find(e=>e.projectId==='JOEY_ASSET_SYSTEM'),candidate=asset.branches[0],text=projectEntryInstructions(asset);assert.equal(asset.commitSha,'eb03e2a9d86abf8b53acfe207fb6737d255ba0d4');assert.equal(candidate.qualification,'CANDIDATE_JOEY_ACCEPTANCE_PENDING');assert(text.includes(candidate.commitSha+'/modules/education/university-lifecycle/docs/HANDOFF.md'));assert(text.includes('stale phase text'));
 const buddy=projectEntrySnapshots.find(e=>e.projectId==='WOOSONG_BUDDY');assert.equal(buddy.commitSha,'e41bd1b7d8a481fdf6402881f382605278d229af');assert.equal(buddy.status,'AUTHENTICATED_AND_DEVICE_ACCEPTANCE_INCOMPLETE');assert(projectEntryInstructions(buddy).includes('do not establish Joey acceptance'));assert(projectEntryInstructions(buddy).includes('Earlier unaccepted candidates remain unaccepted'));
});
test('browser metadata transport sends only the Owner token in same-origin headers and validates binding',async()=>{
 const server=fixture(),calls=[],client=createProjectEntryClient({origin:'https://fixture.invalid',getAccessToken:async()=>TOKEN,now:()=>clock,fetchImpl:async(url,options)=>{calls.push({url:String(url),options});const r=await server.handle({method:options.method,headers:{authorization:options.headers.Authorization}},{project:new URL(url).searchParams.get('project')});return new Response(JSON.stringify(r.body),{status:r.status});}});
 const reply=await client.read('NEXAEON');assert.equal(reply.entry.projectId,'NEXAEON');assert.equal(calls.length,1);assert(!calls[0].url.includes(TOKEN));assert.equal(calls[0].options.cache,'no-store');assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.headers.Authorization,'Bearer '+TOKEN);
 for(const change of [r=>r.entry.websiteRepositoryReadable=true,r=>r.entry.projectId='WOOSONG_BUDDY',r=>r.entry.lastDeveloper.agent='Git author',r=>r.expiresAt=clock,r=>r.entry.documents[0].path='../credentials.md',r=>r.entry.repositoryId='attacker/repo']){const r=structuredClone(reply);change(r);assert.throws(()=>validateProjectEntryReply(r,'NEXAEON',clock));}
 await assert.rejects(client.read('MISSION_CONTROL'));assert.equal(calls.length,1);
});
test('private metadata and repository pins are absent from the public client bundle and public route',async()=>{
 const built=await build({entryPoints:['src/continuity/owner-browser-entry.mjs'],bundle:true,format:'esm',write:false,metafile:true});const js=built.outputFiles[0].text;
 assert(!Object.keys(built.metafile.inputs).some(p=>/project-entry-(snapshots|server)/.test(p)));for(const e of projectEntrySnapshots)assert(!js.includes(e.commitSha));assert(!js.includes('MC_GITHUB_READ_TOKEN'));
 assert.equal(productionResponse('GET',new URL('https://fixture.invalid/api?route=private/project-entry&project=NEXAEON')).status,404);
 const config=await readFile(new URL('../src/canonical/remote-handoff-adapter.mjs',import.meta.url),'utf8');assert(config.includes("repositoryId:'JoeyAJ/joey-mission-control'"));
});
test('actual stage handler requires server-side Owner authentication and private snapshot is outside static output',async()=>{
 const invoke=async(host,headers={})=>{let status,body,responseHeaders;await handler({method:'GET',url:'/api/index?route=private/project-entry&project=NEXAEON',headers:{host,...headers}},{writeHead(s,h){status=s;responseHeaders=h;},end(text){body=JSON.parse(text);}});return{status,body,responseHeaders};};
 const r=await invoke(new URL(ownerAuthConfig.stageOrigin).host);assert.equal(r.status,401);assert.equal(r.body.error,'OWNER_AUTHENTICATION_REQUIRED');assert(!r.body.entry);assert.equal(r.responseHeaders['Cache-Control'],'private, no-store');
 assert.equal((await invoke('joey-mission-control-one.vercel.app')).status,404);
 const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));assert.equal(config.outputDirectory,'public');assert(!config.rewrites.some(r=>r.destination.includes('src/')));
 const built=await build({entryPoints:['public/app.js'],bundle:true,format:'esm',write:false,metafile:true});assert(!Object.keys(built.metafile.inputs).some(p=>/project-entry-(snapshots|server)/.test(p)));for(const e of projectEntrySnapshots)assert(!built.outputFiles[0].text.includes(e.nextSteps));
});
