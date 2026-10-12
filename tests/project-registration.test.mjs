import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createProjectDraft, reviseProjectDraft, projectBootstrapPacket} from '../src/onboarding/project-draft.mjs';
import {REGISTRATION_VERSION, REGISTRATION_FILES, registrationRequest, registrationJson, registrationDigest, contentDigest} from '../src/onboarding/project-registration-contract.mjs';
import {createProjectRegistrationServer} from '../src/onboarding/project-registration-server.mjs';
import {createProjectRegistrationRepositoryReader} from '../src/onboarding/project-registration-repository.mjs';
import {createLocalProjectRegistryWriter} from '../src/onboarding/project-registry-writer.mjs';
import {loadRegistry} from '../src/canonical/registry-adapter.mjs';
import {loadMemoryIndex} from '../src/canonical/index-adapter.mjs';
import {buildProjection} from '../src/projection/projection-service.mjs';

const NOW = Date.parse('2026-10-12T12:00:00.000Z'), OWNER = 'synthetic-owner', ORIGIN = 'https://synthetic.invalid', SHA = 'a'.repeat(40), TOKEN = 'a'.repeat(40);
const REGISTRY = '# Synthetic registry\n### 1. Existing\n\n```yaml\nproject_id: EXISTING_PROJECT\ngithub: Synthetic/existing\nbranch: main\nlocal_head: ' + 'b'.repeat(40) + '\n```\n';
const INDEX = '# Synthetic memory index\n## Production Development Registry\n| Project | Memory | Current State | Canonical Local Master |\n|---|---|---|---|\n\n## Systems Registry\n| System | Memory | Current State | Canonical Local Master |\n|---|---|---|---|\n';
const blob = content => { const b = Buffer.from(content); return createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + b.length + '\0'), b])).digest('hex'); };
function fixture({project = {}, resources = {backend:null, deployment:null}} = {}) {
  const fields = {projectId:'SYNTHETIC_NEW', name:'Private new project', idea:'Original idea / 構想 / 아이디어', acceptance:'Preserve the idea and require verification.', repositoryId:'Synthetic/new-project', branch:'main', environment:'CODE_ONLY', deployment:'NOT_REQUIRED', previewUrl:'', ...project};
  const draft = createProjectDraft(fields, {draftId:'draft_' + 'a'.repeat(24), now:NOW});
  const contents = {...projectBootstrapPacket(draft, {now:NOW}).files, '.mission-control/source-profile.json':JSON.stringify({schemaVersion:'mc.source-profile.v1', profiles:[{projectId:fields.projectId, track:'BASELINE', repositoryId:fields.repositoryId, ref:fields.branch, path:'HANDOFF.md', contextPaths:['PRD.md', 'README.md', 'docs/PRODUCT_CHARTER.md', 'docs/PHASE_PLAN.md']}]})};
  const request = {schemaVersion:REGISTRATION_VERSION, mode:'IMPORT_EXISTING_PRIVATE_REPOSITORY', requestId:'synthetic-import-1', draftId:draft.draftId, draftRevision:draft.revision, projectId:fields.projectId, repositoryId:fields.repositoryId, repositoryNumericId:12345, ref:fields.branch, baselineSha:SHA, expectedRegistryDigest:contentDigest(REGISTRY), expectedIndexDigest:contentDigest(INDEX), files:Object.fromEntries(REGISTRATION_FILES.map(p => [p, contentDigest(contents[p])])), resources};
  const state = {clock:NOW, drafts:[draft], actor:{subject:OWNER, role:'OWNER', aal:'aal2', verified:true, sessionActive:true, expiresAt:NOW + 60000}, repository:{id:12345, full_name:fields.repositoryId, private:true, visibility:'private', archived:false, disabled:false}, heads:[SHA,SHA], contents, readCount:0, identityCount:0, draftCount:0, authCount:0, gate:null, filePatch:null, identityAfter:null, resourcePatch:null};
  const writer = createLocalProjectRegistryWriter({registryText:REGISTRY, memoryIndexText:INDEX, now:() => state.clock});
  const repositoryReader = {configured:true, async inspectIdentity(q) { assert.equal(q.repositoryId, request.repositoryId); state.identityCount++; return state.identityCount > 1 && state.identityAfter ? state.identityAfter : state.repository; }, async resolveRevision(q) { assert.equal(q.ref, request.ref); return {commitSha:state.heads.shift() ?? SHA}; }, async readFile(q) { state.readCount++; assert(REGISTRATION_FILES.includes(q.path)); assert.equal(q.commitSha,SHA); if(state.gate) await state.gate; const content=state.contents[q.path]; return {...{status:'FOUND', entryType:'file', content, blobId:blob(content), commitSha:SHA}, ...state.filePatch}; }};
  const draftPort = {async call(action, input, token) { assert.equal(action,'list'); assert.equal(input,null); assert.equal(token,TOKEN); state.draftCount++; return {schemaVersion:1, qualification:'OWNER_PRIVATE_DRAFTS', drafts:state.drafts}; }};
  const resourceReader = {async read(q) { return {qualification:'INDEPENDENT_CONFIGURATION_READ', projectId:q.projectId, repositoryId:q.repositoryId, repositoryNumericId:q.repositoryNumericId, ref:q.ref, baselineSha:q.baselineSha, target:q.target, readAt:state.clock, ...state.resourcePatch}; }};
  const policy = () => ({qualification:'EXACT_PRIVATE_PROJECT_REGISTRATION_POLICY', ownerSubject:OWNER, approvalRef:'synthetic-approval', expiresAt:NOW + 60000, target:Object.fromEntries(['draftId','draftRevision','projectId','repositoryId','repositoryNumericId','ref','baselineSha','expectedRegistryDigest','expectedIndexDigest','files','resources'].map(k=>[k,request[k]]))});
  const options = () => ({policy:policy(), ownerSubject:OWNER, allowedOrigin:ORIGIN, now:() => state.clock, verifyOwner:async() => { state.authCount++; return state.actor; }, draftPort, repositoryReader, resourceReader, writer});
  const req = input => ({method:'POST', headers:{origin:ORIGIN, authorization:'Bearer '+TOKEN, 'content-type':'application/json'}, body:input ?? request});
  const server = opts => createProjectRegistrationServer({...options(), ...opts});
  const syncHashes = () => { request.files = Object.fromEntries(REGISTRATION_FILES.map(p=>[p,contentDigest(state.contents[p])])); };
  return {state, request, policy, options, req, server, writer, repositoryReader, draft, syncHashes};
}

test('explicit private repository import produces a registry candidate compatible with the existing reader', async () => {
  const f = fixture(), reply = await f.server().handle(f.req());
  assert.equal(reply.status,200,JSON.stringify(reply.body));
  assert.equal(reply.body.qualification,'LOCAL_REGISTRY_CANDIDATE_ONLY');
  assert.equal(reply.body.liveRegistered,false); assert.equal(reply.body.developmentReady,false); assert.equal(reply.body.verifiedDelivery,false);
  assert.equal(reply.body.receipt.mode,'IMPORT_EXISTING_PRIVATE_REPOSITORY');
  assert.equal(reply.body.receipt.sourceReadScope,'PENDING_EXPLICIT_ACTIVATION'); assert.equal(reply.body.receipt.reportWriteScope,'PENDING_EXPLICIT_ACTIVATION');
  assert.equal(f.state.readCount,7); assert.equal(f.state.identityCount,3); assert.equal(f.writer.inspect().receipts.length,1);
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'mc-import-registry-'));
  try {
    await fs.writeFile(path.join(root,'PROJECT_REGISTRY_V1.0.md'),f.writer.inspect().registryText);
    await fs.writeFile(path.join(root,'MEMORY_INDEX.md'),f.writer.inspect().memoryIndexText);
    for (const [file, content] of Object.entries(f.writer.inspect().memoryFiles)) { await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true}); await fs.writeFile(path.join(root,file),content); }
    await fs.mkdir(path.join(root,'HANDOFF/HISTORY'),{recursive:true});
    await fs.writeFile(path.join(root,'HANDOFF/LATEST.md'),'# Existing synthetic handoff\nProject: EXISTING_PROJECT\nStatus: UNKNOWN\n');
    const reg = await loadRegistry(root), item = reg.production.find(p=>p.id==='SYNTHETIC_NEW');
    assert.equal(reg.production.length,2); assert.equal(item.github,'Synthetic/new-project'); assert.equal(item.storedHead,SHA); assert.equal(item.production,null); assert.equal(item.productionHead,null); assert.equal(item.localMaster,null);
    const index=await loadMemoryIndex(root); assert.equal(index.entities[0].id,'SYNTHETIC_NEW');
    const projection=await buildProjection(root,{projectUrlMetadata:{projects:[]},reconciliationMetadata:{projects:{}}});
    assert.equal(projection.projects[0].id,'SYNTHETIC_NEW'); assert.match(projection.projects[0].currentStage.value,/activation are pending/);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});
test('default server remains inactive and the existing onboarding route is untouched', async () => {
  assert.equal((await createProjectRegistrationServer().handle({method:'POST'})).body.error,'REGISTRATION_NOT_ACTIVATED');
  const f=fixture(); assert.equal((await f.server().handle({...f.req(),method:'GET'})).status,405); assert.equal(f.state.readCount,0);
});
test('current cloud draft is required; imported browser drafts cannot replace it', async () => {
  for (const drafts of [[], [reviseProjectDraft(fixture().draft,fixture().draft.project,{now:NOW+1})]]) {
    const f=fixture(); f.state.drafts=drafts; const r=await f.server().handle(f.req()); assert.equal(r.body.error,'REGISTRATION_DRAFT_CONFLICT'); assert.equal(f.state.readCount,0); assert.equal(f.writer.inspect().receipts.length,0);
  }
});
test('another saved draft cannot collide with project or repository identity', async () => {
  const f=fixture(); f.state.drafts.push(createProjectDraft({...f.draft.project,projectId:'ANOTHER_PROJECT'},{draftId:'draft_'+'b'.repeat(24),now:NOW})); assert.equal((await f.server().handle(f.req())).status,409); assert.equal(f.state.readCount,0);
});
test('cross-origin POST, missing Origin and bearer omissions fail before all ports', async () => {
  for(const patch of [{origin:'https://foreign.invalid'}, {origin:undefined}, {'sec-fetch-site':'cross-site'}, {authorization:undefined}]) {
    const f=fixture(), req=f.req(); Object.assign(req.headers,patch); const r=await f.server().handle(req); assert([401,403].includes(r.status)); assert.equal(f.state.authCount,0); assert.equal(f.state.draftCount,0);
  }
});
test('Owner role, AAL2, verification, subject and session expiry are mandatory', async () => {
  for(const patch of [{role:'MEMBER'}, {aal:'aal1'}, {verified:false}, {subject:'foreign-owner'}, {sessionActive:false}, {expiresAt:NOW}]) {
    const f=fixture(); Object.assign(f.state.actor,patch); const r=await f.server().handle(f.req()); assert.equal(r.status,403); assert.equal(f.state.readCount,0);
  }
});
test('an existing five-scope capability or arbitrary client authority cannot activate import', async () => {
  const f=fixture(); const r=await f.server({policy:{qualification:'CURRENT_OWNER_ONBOARDING_CAPABILITIES',privateReadOnly:true,expiresAt:NOW+60000}}).handle(f.req()); assert.equal(r.body.error,'REGISTRATION_SCOPE_DENIED'); assert.equal(f.state.readCount,0);
  assert.throws(()=>registrationRequest({...f.request,executionAuthorized:true}));
});
test('exact policy binds numeric repo identity, pinned HEAD, files, draft revision and resource targets', async () => {
  for(const [key,value] of [['repositoryNumericId',54321],['baselineSha','b'.repeat(40)],['draftRevision',2],['repositoryId','Synthetic/other'],['ref','development']]) {
    const f=fixture(); const altered={...f.request,[key]:value}; const r=await f.server().handle(f.req(altered)); assert.equal(r.body.error,'REGISTRATION_SCOPE_DENIED'); assert.equal(f.state.readCount,0);
  }
});
test('public, archived, disabled and renamed/replaced repositories fail before documents are read', async () => {
  for(const patch of [{private:false}, {visibility:'public'}, {archived:true}, {disabled:true}, {id:54321}, {full_name:'Synthetic/renamed'}]) {
    const f=fixture(); Object.assign(f.state.repository,patch); assert.equal((await f.server().handle(f.req())).body.error,'REGISTRATION_PRIVATE_IDENTITY_MISMATCH'); assert.equal(f.state.readCount,0);
  }
});
test('privacy or repository identity drift during verification never writes a candidate', async () => {
  const f=fixture(); f.state.identityAfter={...f.state.repository,private:false}; assert.equal((await f.server().handle(f.req())).status,409); assert.equal(f.writer.inspect().receipts.length,0);
});
test('branch HEAD drift before or after pinned reads refuses registration', async () => {
  for(const heads of [['b'.repeat(40),SHA],[SHA,'b'.repeat(40)]]) {const f=fixture(); f.state.heads=heads; assert.equal((await f.server().handle(f.req())).body.error,'REGISTRATION_HEAD_CHANGED'); assert.equal(f.writer.inspect().receipts.length,0);}
});
test('wrong canonical file bytes, blob identity, commit and unsupported entry types are refused', async () => {
  for(const patch of [{content:'replaced'}, {blobId:'b'.repeat(40)}, {commitSha:'b'.repeat(40)}, {entryType:'symlink'}, {status:'MISSING'}]) {const f=fixture(); f.state.filePatch=patch; const r=await f.server().handle(f.req()); assert.equal(r.status,409); assert.equal(f.writer.inspect().receipts.length,0);}
});
test('a self-consistent source profile for a foreign repo or multiple projects is rejected', async () => {
  for(const mutate of [d=>d.profiles[0].repositoryId='Synthetic/other',d=>d.profiles[0].ref='development',d=>d.profiles[0].path='README.md',d=>d.profiles.push({...d.profiles[0],projectId:'FOREIGN_PROJECT'})]) {
    const f=fixture(), doc=JSON.parse(f.state.contents['.mission-control/source-profile.json']); mutate(doc); f.state.contents['.mission-control/source-profile.json']=JSON.stringify(doc); f.syncHashes(); assert.equal((await f.server().handle(f.req())).body.error,'REGISTRATION_SOURCE_PROFILE_MISMATCH'); assert.equal(f.writer.inspect().receipts.length,0);
  }
});
test('bootstrap manifest and HANDOFF must bind the actual saved draft and project', async () => {
  for(const key of ['projectId','repositoryId','branch','draftRevision','entryPath','qualification','environment','executionAuthorized','preparedAt','unexpectedAuthority']) {const f=fixture(), doc=JSON.parse(f.state.contents['.mission-control/bootstrap.json']); doc[key]=key==='draftRevision'?2:'foreign'; f.state.contents['.mission-control/bootstrap.json']=JSON.stringify(doc); f.syncHashes(); assert.equal((await f.server().handle(f.req())).body.error,'REGISTRATION_BOOTSTRAP_MISMATCH');}
  const f=fixture(); f.state.contents['HANDOFF.md']=f.state.contents['HANDOFF.md'].replace('Project: SYNTHETIC_NEW','Project: FOREIGN'); f.syncHashes(); assert.equal((await f.server().handle(f.req())).body.error,'REGISTRATION_HANDOFF_MISMATCH');
});
test('required backend and deployment can remain explicitly pending during repository import', async () => {
  const f=fixture({project:{environment:'BACKEND_REQUIRED',deployment:'REQUIRED',previewUrl:'https://typed.invalid/'}}); const r=await f.server().handle(f.req()); assert.equal(r.status,200); assert.equal(r.body.receipt.environmentStatus,'PENDING_CONFIGURATION'); assert.equal(r.body.receipt.deploymentStatus,'PENDING_CONFIGURATION'); assert.equal(r.body.developmentReady,false); assert.equal(r.body.receipt.resources.deployment,null);
});
test('independently bound resource references are configuration proof, never delivery proof', async () => {
  const resources={backend:{provider:'supabase',projectRef:'a'.repeat(20)},deployment:{provider:'vercel',accountId:'team_synthetic',projectId:'prj_synthetic',environment:'preview',url:'https://synthetic-preview.invalid/'}};
  const f=fixture({resources,project:{environment:'BACKEND_REQUIRED',deployment:'REQUIRED',previewUrl:resources.deployment.url}}), r=await f.server().handle(f.req()); assert.equal(r.status,200); assert.equal(r.body.receipt.resources.backend.target.projectRef,'a'.repeat(20)); assert.equal(r.body.receipt.deploymentStatus,'CONFIGURATION_VERIFIED_DELIVERY_UNVERIFIED'); assert.equal(r.body.verifiedDelivery,false); assert.match(f.writer.inspect().registryText,/production: null/);
});
test('typed resource references need independent adapters and exact repository/HEAD observations', async () => {
  const options={resources:{backend:{provider:'supabase',projectRef:'a'.repeat(20)},deployment:null},project:{environment:'BACKEND_REQUIRED'}};
  const f=fixture(options); assert.equal((await f.server({resourceReader:null}).handle(f.req())).body.error,'REGISTRATION_RESOURCE_READER_NOT_CONFIGURED');
  for(const patch of [{baselineSha:'b'.repeat(40)},{repositoryNumericId:54321},{readAt:NOW-1},{qualification:'OWNER_TYPED'}]) {const f=fixture(options); f.state.resourcePatch=patch; assert.equal((await f.server().handle(f.req())).body.error,'REGISTRATION_RESOURCE_MISMATCH'); assert.equal(f.writer.inspect().receipts.length,0);}
});
test('revocation during an awaited repository read withdraws write authority and private response', async () => {
  const f=fixture(); let release; f.state.gate=new Promise(r=>release=r); const pending=f.server().handle(f.req());
  while(!f.state.readCount) await new Promise(r=>setImmediate(r)); f.state.actor.sessionActive=false; release(); const r=await pending; assert.equal(r.status,403); assert.deepEqual(r.body,{error:'OWNER_AUTHORIZATION_DENIED'}); assert.equal(f.writer.inspect().receipts.length,0);
});
test('policy and observation expiry during awaits cannot write', async () => {
  const f=fixture(); const reader={...f.repositoryReader,async readFile(q){const r=await f.repositoryReader.readFile(q);f.state.clock=NOW+30001;return r;}}; assert.equal((await f.server({repositoryReader:reader}).handle(f.req())).body.error,'REGISTRATION_OBSERVATION_EXPIRED'); assert.equal(f.writer.inspect().receipts.length,0);
  const g=fixture(); const policy=g.policy(); policy.expiresAt=NOW+1; const port={...g.repositoryReader,async readFile(q){const r=await g.repositoryReader.readFile(q);g.state.clock=NOW+1;return r;}}; assert.equal((await g.server({policy,repositoryReader:port}).handle(g.req())).status,403);
});
test('draft edits during verification are caught inside the final writer authorization boundary', async () => {
  const f=fixture(); const reader={...f.repositoryReader,async readFile(q){const r=await f.repositoryReader.readFile(q);f.state.drafts=[reviseProjectDraft(f.draft,f.draft.project,{now:NOW+1})];return r;}}; assert.equal((await f.server({repositoryReader:reader}).handle(f.req())).body.error,'REGISTRATION_DRAFT_CONFLICT'); assert.equal(f.writer.inspect().receipts.length,0);
});
test('source drift during the final saved-draft await is rechecked at the write boundary', async () => {
  const f=fixture(); f.state.heads=[SHA,SHA,'b'.repeat(40)]; assert.equal((await f.server().handle(f.req())).body.error,'REGISTRATION_HEAD_CHANGED'); assert.equal(f.writer.inspect().receipts.length,0);
});
test('concurrent registry revision changes lose CAS; same request replay does not duplicate', async () => {
  const f=fixture(), server=f.server(); assert.equal((await server.handle(f.req())).status,200); const text=f.writer.inspect().registryText; const replay=await server.handle(f.req()); assert.equal(replay.status,200); assert.equal(replay.body.replay,true); assert.equal(f.writer.inspect().registryText,text); assert.equal(f.writer.inspect().receipts.length,1);
  f.request.requestId='new-request'; const r=await f.server().handle(f.req()); assert.equal(r.body.error,'REGISTRATION_REGISTRY_REVISION_CONFLICT'); assert.equal(f.writer.inspect().receipts.length,1);
});
test('an expired original commit receipt stays historical while replay separately verifies current source', async () => {
  const f=fixture(), server=f.server(), first=await server.handle(f.req()); f.state.clock=NOW+30001;
  const replay=await server.handle(f.req()); assert.equal(replay.status,200); assert.deepEqual(replay.body.receipt,first.body.receipt); assert(replay.body.receipt.expiresAt<f.state.clock); assert.equal(replay.body.currentVerification.observedAt,f.state.clock); assert(replay.body.currentVerification.expiresAt>f.state.clock); assert.equal(f.writer.inspect().receipts.length,1);
});
test('concurrent imports share atomic registry CAS and commit only one candidate', async () => {
  const f=fixture(), g=fixture({project:{projectId:'SYNTHETIC_OTHER',repositoryId:'Synthetic/other'}}); g.request.requestId='synthetic-import-2';
  const replies=await Promise.all([f.server().handle(f.req()),g.server({writer:f.writer}).handle(g.req())]);
  assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]); assert.equal(replies.find(r=>r.status===409).body.error,'REGISTRATION_REGISTRY_REVISION_CONFLICT'); assert.equal(f.writer.inspect().receipts.length,1);
});
test('index revision drift, duplicate memory and unsupported table formats leave every artifact unchanged', async () => {
  for (const config of [{memoryIndexText:INDEX+'\nchanged'}, {memoryIndexText:INDEX, memoryFiles:{'PROJECTS/SYNTHETIC_NEW/PROJECT_MEMORY.md':'existing'}}, {memoryIndexText:'# Index\n## Production Development Registry\nNo supported table.\n'}]) {
    const f=fixture(), writer=createLocalProjectRegistryWriter({registryText:REGISTRY,now:()=>NOW,...config});
    if(config.memoryIndexText.includes('No supported')) f.request.expectedIndexDigest=contentDigest(config.memoryIndexText);
    const before=writer.inspect(), r=await f.server({writer}).handle(f.req()); assert([409,503].includes(r.status)); assert.deepEqual(writer.inspect(),before);
  }
});
test('English, Traditional Chinese and Korean project names remain readable in canonical index and registry', async () => {
  for (const name of ['My private project','我的私人專案','나의 비공개 프로젝트']) {
    const f=fixture({project:{name}}), r=await f.server().handle(f.req()); assert.equal(r.status,200); assert(f.writer.inspect().registryText.includes(name)); assert(f.writer.inspect().memoryIndexText.includes(name)); assert.equal(r.body.receipt.name,name);
  }
});
test('reusing a request ID with a different revision binding refuses an idempotency collision', async () => {
  const f=fixture(); assert.equal((await f.server().handle(f.req())).status,200); f.request.expectedRegistryDigest=f.writer.inspect().digest; assert.equal((await f.server().handle(f.req())).body.error,'REGISTRATION_REPLAY_CONFLICT'); assert.equal(f.writer.inspect().receipts.length,1);
});
test('duplicate project and case-insensitive repository identities cannot be overwritten', async () => {
  for(const suffix of ['\nproject_id: SYNTHETIC_NEW\n','\ngithub: https://github.com/synthetic/NEW-PROJECT.git\n']) {const f=fixture(), text=REGISTRY+suffix; f.request.expectedRegistryDigest=contentDigest(text); const writer=createLocalProjectRegistryWriter({registryText:text,memoryIndexText:INDEX,now:()=>NOW}); assert.equal((await f.server({writer}).handle(f.req())).body.error,'REGISTRATION_TARGET_CONFLICT'); assert.equal(writer.inspect().registryText,text);}
});
test('serialized receipts and client-forged receipts cannot be used as writer authority', async () => {
  const f=fixture(), r=await f.server().handle(f.req()), receipt=r.body.receipt; const other=createLocalProjectRegistryWriter({registryText:REGISTRY,memoryIndexText:INDEX,now:()=>NOW}); await assert.rejects(other.commit({receipt,expectedDigest:contentDigest(REGISTRY),expectedIndexDigest:contentDigest(INDEX),authorize:async()=>{}}),/REGISTRATION_RECEIPT_NOT_SERVER_ISSUED/); assert.equal(other.inspect().receipts.length,0);
});
test('reserved report ref overlap, extra keys, invalid IDs and unsafe resource URLs are rejected', () => {
  const f=fixture(); for(const patch of [{ref:'mc'}, {ref:'mc/progress'}, {ref:'mc/progress/new'}, {repositoryId:''}, {repositoryId:'Synthetic/repo.git'}, {projectId:'MC'}, {projectId:'NEXAEON'}, {repositoryNumericId:0}, {files:{...f.request.files,'../escape':'a'.repeat(64)}}, {resources:{backend:null,deployment:{provider:'vercel',accountId:'a',projectId:'p',environment:'preview',url:'https://user:secret@example.invalid/'}}}, {provisioned:true}]) assert.throws(()=>registrationRequest({...f.request,...patch}));
});
test('hostile JSON objects are rejected without running serialization or accessors', () => {
  let calls=0; const getter={}; Object.defineProperty(getter,'payload',{enumerable:true,get(){calls++;return 'secret';}});
  for(const value of [getter,{toJSON(){calls++;return {};}},Object.assign(Object.create({}),{}),[,1],new Date(),{[Symbol('hidden')]:1},JSON.parse('{"__proto__":{}}')]) assert.throws(()=>registrationJson(value));
  assert.equal(calls,0); assert.throws(()=>registrationJson({x:'x'.repeat(16385)})); assert.equal(registrationDigest({b:2,a:1}),registrationDigest({a:1,b:2}));
});
test('request size, content type, malformed JSON, provider details and aborts stay bounded', async () => {
  const f=fixture(); for(const [req,status] of [[{...f.req(),body:'{'},400],[{...f.req(),body:'x'.repeat(16385)},413],[{...f.req(),headers:{...f.req().headers,'content-type':'text/plain'}},415]]) assert.equal((await f.server().handle(req)).status,status);
  for (const failure of [Error('sensitive provider token / private URL'),Object.assign(Error('hidden diagnostic'),{code:'REGISTRATION_PRIVATE_SECRET_VALUE',status:503})]) {const r=await f.server({repositoryReader:{configured:true,async inspectIdentity(){throw failure;}}}).handle(f.req()); assert.deepEqual(r.body,{error:'REGISTRATION_PRIVATE_READ_UNAVAILABLE'});}
  assert.equal((await f.server().handle(f.req({...f.request,ref:'a/../b'}))).status,400);
  const abort=new AbortController();abort.abort();assert.equal((await f.server().handle(f.req(),{signal:abort.signal})).status,503);assert.equal(f.writer.inspect().receipts.length,0);
});
test('scoped GitHub reader only issues supported reads to the exact repo/ref/files and never follows provider URLs', async () => {
  const f=fixture(), requests=[];
  const reader=createProjectRegistrationRepositoryReader({credential:'synthetic-read-credential',repositoryId:f.request.repositoryId,ref:f.request.ref,fetchImpl:async (target,options)=>{
    const u=new URL(target); requests.push({u,options}); assert.equal(u.origin,'https://api.github.com'); assert.equal(options.redirect,'error'); assert(!options.method || options.method==='GET');
    if(u.pathname==='/repos/Synthetic/new-project')return new Response(JSON.stringify(f.state.repository));
    if(u.pathname.includes('/git/ref/'))return new Response(JSON.stringify({object:{type:'commit',sha:SHA}}));
    const p=u.pathname.split('/contents/')[1], content=f.state.contents[p]; assert.equal(u.searchParams.get('ref'),SHA);
    return new Response(JSON.stringify({type:'file',size:Buffer.byteLength(content),encoding:'base64',content:Buffer.from(content).toString('base64'),sha:blob(content),download_url:'https://arbitrary.invalid/private'}));
  }});
  assert.equal((await f.server({repositoryReader:reader}).handle(f.req())).status,200); assert.equal(requests.length,13);
  await assert.rejects(reader.inspectIdentity({repositoryId:'Synthetic/foreign'})); await assert.rejects(reader.resolveRevision({repositoryId:f.request.repositoryId,ref:'other'})); await assert.rejects(reader.readFile({repositoryId:f.request.repositoryId,commitSha:SHA,path:'private.env',maxBytes:98304})); assert.equal(requests.length,13);
});
test('custom source branch stores a baseline without claiming a main or Production observation', async () => {
  const f=fixture({project:{branch:'development'}}); assert.equal((await f.server().handle(f.req())).status,200); assert.match(f.writer.inspect().registryText,/github_main_head: null/); assert.match(f.writer.inspect().registryText,/production_source_sha: null/);
});
