import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, loadSchema, collectionValidator } from '../src/api/validation.mjs';
import { buildProjectProjection } from '../src/projection/project-projection.mjs';
import { JsonStore } from '../src/storage/json-store.mjs';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import { spawnSync } from 'node:child_process';

const source={classification:'canonical',sourcePath:'PROJECTS/X/CURRENT_STATE.md',sourceSection:'Current Stage',fingerprint:'a'.repeat(64),asOf:'2026-10-04',verificationStatus:'verified_current',readAt:'2026-10-04T00:00:00.000Z'};

test('project schema enforces version, exact phase/status and provenance', async()=>{
 const schema=await loadSchema('project-projection');
 const base=buildProjectProjection({id:'X',name:'X',entityType:'project',state:{metadata:{as_of:'2026-10-04'},sections:{'Current Stage':'Building'},source},registry:{localMaster:'/x',branch:'main',source}});
 assert.equal(validate(schema,base).valid,true);
 assert.equal(validate(schema,{...base,schemaVersion:undefined}).valid,false);
 assert.equal(validate(schema,{...base,phase:{...base.phase,value:'DEVELOP'}}).valid,false);
 assert.equal(validate(schema,{...base,status:{...base.status,value:'Running'}}).valid,false);
 assert.equal(validate(schema,{...base,extra:true}).valid,false);
 assert.equal(validate(schema,{...base,name:{...base.name,source:null}}).valid,false);
});

test('inbox and session schemas enforce transitions and safe paths', async()=>{
 const inbox=await loadSchema('inbox-item'); const session=await loadSchema('ai-workspace-session');
 assert.equal(validate(inbox,{schemaVersion:'1.0',id:'i',rawText:'Do it',type:'Request',state:'Needs review',createdAt:'2026-10-04T00:00:00.000Z',idempotencyKey:'a'.repeat(64)}).valid,true);
 assert.equal(validate(inbox,{schemaVersion:'1.0',id:'i',rawText:'Do it',type:'Task',state:'New',createdAt:'x',idempotencyKey:'a'.repeat(64)}).valid,false);
 assert.equal(validate(session,{schemaVersion:'1.0',id:'s',entityId:'X',ai:'Hermes',model:'gpt',workspaceId:'w',path:'../escape',state:'running',createdAt:'2026-10-04T00:00:00.000Z',updatedAt:'2026-10-04T00:00:00.000Z'}).valid,false);
});
test('generated project projection conforms to its versioned schema',async()=>{const schema=await loadSchema('project-projection');const p=buildProjectProjection({id:'X',name:'X',entityType:'project',state:{metadata:{as_of:'2026-10-04'},sections:{'Current Stage':'Building'},source},registry:{localMaster:'/x',branch:'main',source}});assert.deepEqual(validate(schema,p).errors,[]);});

test('schema validation recursively rejects malformed array items',async()=>{
 const projectSchema=await loadSchema('project-projection');
 const base=buildProjectProjection({id:'X',name:'X',entityType:'project',state:{metadata:{as_of:'2026-10-04'},sections:{'Current Stage':'Building'},source},registry:{localMaster:'/x',branch:'main',source}});
 for(const malformed of [{...base,approvalGates:[123]},{...base,conflicts:['bad']},{...base,sourceFingerprints:[{path:'',fingerprint:'no'}]},{...base,cases:[null]}])assert.equal(validate(projectSchema,malformed).valid,false);
 const continueSchema=await loadSchema('continue-payload');
 const payload={schemaVersion:'1.0',entityId:'X',generatedAt:'2026-10-04T00:00:00.000Z',lastAI:'Hermes',lastCompleted:'Done',currentTask:'Task',blocker:'None',nextAction:'Next',latestCommit:'a'.repeat(40),recommendedWorkspace:'/x',handoffContext:'Context',sourceFingerprints:[{path:'/x',fingerprint:'a'.repeat(64)}],sourceFingerprintDigest:'b'.repeat(64),approvalGates:[],conflicts:[],freshness:{gitObservedAt:'2026-10-04T00:00:00.000Z',fingerprintsCurrent:true},canContinue:false,hermesPrompt:null};
 assert.equal(validate(continueSchema,payload).valid,true);
 assert.equal(validate(continueSchema,{...payload,sourceFingerprints:[{path:'',fingerprint:'bad'}]}).valid,false);
 assert.equal(validate(continueSchema,{...payload,approvalGates:[1]}).valid,false);
});

test('persisted record collection validator rejects malformed Inbox and session records',async()=>{
 const d=await fs.mkdtemp(path.join(os.tmpdir(),'mc-schema-store-'));
 const inboxSchema=await loadSchema('inbox-item');
 await fs.writeFile(path.join(d,'inbox.json'),JSON.stringify([{schemaVersion:'1.0',id:'i',rawText:'x',type:'Task'}]));
 const store=new JsonStore(d,'inbox.json',collectionValidator(inboxSchema));
 await assert.rejects(()=>store.read(),/validation/);
});

test('date-time format rejects date-only and impossible calendar strings',async()=>{const schema=await loadSchema('handoff-projection');for(const timestamp of ['2026-10-04','2026-02-30T12:00:00Z','2026-13-01T00:00:00Z','2026-01-01T25:00:00Z']){const result=validate(schema,{schemaVersion:'1.0',timestamp,entityId:'NEXAEON',task:'X',status:'SUCCESS',sourcePath:'x',conflict:false,conflictReasons:[]});assert.equal(result.valid,false,timestamp);assert.match(result.errors.join(' '),/date-time/);}});

test('CLI validate checks every generated projection artifact',()=>{
 const result=spawnSync(process.execPath,['--import','./tests/test-environment.mjs','src/cli.mjs','validate'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/4 projects, 1 cases, \d+ handoffs, and 4 Continue payloads/);
});
