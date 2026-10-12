// Authored synthetic data and in-memory ports only. No network or credentials.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createProjectDraft, projectBootstrapPacket} from '../src/onboarding/project-draft.mjs';
import {REGISTRATION_VERSION, REGISTRATION_FILES, contentDigest} from '../src/onboarding/project-registration-contract.mjs';
import {createProjectRegistrationServer} from '../src/onboarding/project-registration-server.mjs';
import {createLocalProjectRegistryWriter} from '../src/onboarding/project-registry-writer.mjs';

const at = Date.parse('2026-10-12T12:00:00.000Z'), owner = 'synthetic-review-owner', sha = 'a'.repeat(40);
const draft = createProjectDraft({projectId:'SYNTHETIC_IMPORT', name:'Synthetic private import / 私人匯入 / 비공개 가져오기', idea:'Authored synthetic Owner idea.', acceptance:'Keep proof and scope activation separate.', repositoryId:'Synthetic/already-created', branch:'development', environment:'BACKEND_REQUIRED', deployment:'REQUIRED', previewUrl:''}, {draftId:'draft_'+'a'.repeat(24), now:at});
const contents = {...projectBootstrapPacket(draft,{now:at}).files, '.mission-control/source-profile.json':JSON.stringify({schemaVersion:'mc.source-profile.v1',profiles:[{projectId:draft.project.projectId,track:'BASELINE',repositoryId:draft.project.repositoryId,ref:draft.project.branch,path:'HANDOFF.md',contextPaths:['PRD.md','README.md','docs/PRODUCT_CHARTER.md','docs/PHASE_PLAN.md']}]})};
const registry = '# Synthetic canonical registry\n', index = '# Synthetic memory index\n## Production Development Registry\n| Project | Memory | Current State | Canonical Local Master |\n|---|---|---|---|\n\n## Systems Registry\n| System | Memory | Current State | Canonical Local Master |\n|---|---|---|---|\n';
const request = {schemaVersion:REGISTRATION_VERSION,mode:'IMPORT_EXISTING_PRIVATE_REPOSITORY',requestId:'synthetic-review-import',draftId:draft.draftId,draftRevision:draft.revision,projectId:draft.project.projectId,repositoryId:draft.project.repositoryId,repositoryNumericId:12345,ref:draft.project.branch,baselineSha:sha,expectedRegistryDigest:contentDigest(registry),expectedIndexDigest:contentDigest(index),files:Object.fromEntries(REGISTRATION_FILES.map(p=>[p,contentDigest(contents[p])])),resources:{backend:null,deployment:null}};
const policy = {qualification:'EXACT_PRIVATE_PROJECT_REGISTRATION_POLICY',ownerSubject:owner,approvalRef:'synthetic-review-approval',expiresAt:at+60000,target:Object.fromEntries(['draftId','draftRevision','projectId','repositoryId','repositoryNumericId','ref','baselineSha','expectedRegistryDigest','expectedIndexDigest','files','resources'].map(k=>[k,request[k]]))};
let privateReadCalls=0;
const writer = createLocalProjectRegistryWriter({registryText:registry,memoryIndexText:index,now:()=>at});
const server = createProjectRegistrationServer({policy,ownerSubject:owner,allowedOrigin:'https://synthetic.invalid',now:()=>at,writer,
  verifyOwner:async()=>({subject:owner,role:'OWNER',aal:'aal2',verified:true,sessionActive:true,expiresAt:at+60000}),
  draftPort:{async call(){return {schemaVersion:1,qualification:'OWNER_PRIVATE_DRAFTS',drafts:[draft]};}},
  repositoryReader:{configured:true,async inspectIdentity(){privateReadCalls++;return {id:12345,full_name:draft.project.repositoryId,private:true,visibility:'private',archived:false,disabled:false};},async resolveRevision(){privateReadCalls++;return {commitSha:sha};},async readFile({path:file}){privateReadCalls++;const content=contents[file],bytes=Buffer.from(content),blobId=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');return {status:'FOUND',entryType:'file',commitSha:sha,content,blobId,gitTreeEntry:{path:file,mode:'100644',blobId,commitSha:sha}};}}
});
const req = {method:'POST',headers:{origin:'https://synthetic.invalid',authorization:'Bearer '+'a'.repeat(40),'content-type':'application/json'},body:request};
const inactive = await createProjectRegistrationServer().handle(req), first = await server.handle(req), replay = await server.handle(req);
assert.equal(inactive.status,503);assert.equal(first.status,200);assert.equal(replay.body.replay,true);assert.equal(writer.inspect().receipts.length,1);
const report = {schemaVersion:1,qualification:'SYNTHETIC_LOCAL_VERIFICATION_ONLY',canonicalBase:'cab187ea5208fabe82d47cfe47bdf32cc3d4f0c1',externalNetworkCalls:0,externalWrites:0,privateReadCallsAreInjectedSynthetic:true,injectedReadCalls:privateReadCalls,liveRegistered:false,sqlAclCredentialChanges:false,inactiveStatus:inactive.status,importStatus:first.status,replayStatus:replay.status,request,localResponse:first.body,candidateArtifacts:writer.inspect()};
const destination = process.argv[2];
if(destination){if(!path.isAbsolute(destination))throw Error('ABSOLUTE_REVIEW_OUTPUT_REQUIRED');await fs.writeFile(destination,JSON.stringify(report,null,2)+'\n',{mode:0o600});}
else process.stdout.write(JSON.stringify(report,null,2)+'\n');
