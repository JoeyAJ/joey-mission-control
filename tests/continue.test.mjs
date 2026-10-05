import test from 'node:test';import assert from 'node:assert/strict';import {redact} from '../src/continue/redaction.mjs';import {composeContinue} from '../src/continue/continue-composer.mjs';
test('redacts secrets, auth headers, keys, data URLs and email',()=>{const x=redact('Authorization: Bearer abc\napi_key=secret\n-----BEGIN PRIVATE KEY-----xyz-----END PRIVATE KEY-----\ndata:image/png;base64,ABC\nme@example.com');assert.doesNotMatch(x,/abc|secret|PRIVATE KEY|base64,ABC|me@example/);});
test('blocks blind continuation on stale source or workspace divergence',()=>{const x=composeContinue({project:{id:'X',lastAI:{value:'Hermes'},lastCompleted:{value:'Done'},currentTask:{value:'Task'},blocker:{value:'None'},nextAction:{value:'Next'},workspace:{value:'/x'},approvalGates:[]},handoff:{summary:'ok'},git:{head:'b',dirtyState:'modified',path:'/x'},storedContext:{head:'a',path:'/x',fingerprints:[{path:'x',fingerprint:'old'}]},currentFingerprints:[{path:'x',fingerprint:'new'}]});assert.equal(x.canContinue,false);assert.ok(x.conflicts.length>=2);assert.equal(x.hermesPrompt,null);});

const project={id:'X',lastAI:{value:'Hermes'},lastCompleted:{value:'Done'},currentTask:{value:'Task'},blocker:{value:'None'},nextAction:{value:'Next'},workspace:{value:'/x'},approvalGates:[],conflicts:[]};
const fingerprint={path:'/canonical/CURRENT_STATE.md',fingerprint:'a'.repeat(64)};
const safeGit={head:'b'.repeat(40),branch:'main',path:'/x',origin:'git@example/x.git',upstream:'origin/main',ahead:0,behind:0,dirtyState:'clean',observedAt:'2026-10-04T12:00:00.000Z'};
const safe={project,git:safeGit,storedContext:{head:'b'.repeat(40),branch:'main',path:'/x',sessionPath:'/x',viewedGit:{...safeGit},fingerprints:[fingerprint]},currentFingerprints:[fingerprint]};

test('Continue succeeds only with complete matching Git context and fingerprints',()=>{
  const result=composeContinue(safe);
  assert.equal(result.canContinue,true);
  assert.match(result.hermesPrompt,/Resume X/);
  assert.deepEqual(result.freshness,{gitObservedAt:'2026-10-04T12:00:00.000Z',fingerprintsCurrent:true});
});

test('Continue fails closed for Git errors, missing observations, and every stored divergence',()=>{
  const variants=[
    {...safe,git:{error:'not a repository',observedAt:'2026-10-04T12:00:00.000Z'}},
    {...safe,git:{...safe.git,head:''}},
    {...safe,git:{...safe.git,path:''}},
    {...safe,git:{...safe.git,branch:''}},
    {...safe,storedContext:{...safe.storedContext,head:'c'.repeat(40)}},
    {...safe,storedContext:{...safe.storedContext,path:'/other'}},
    {...safe,storedContext:{...safe.storedContext,branch:'release'}},
    {...safe,git:{...safe.git,dirtyState:'modified'}}
  ];
  for(const input of variants){
    const result=composeContinue(input);
    assert.equal(result.canContinue,false,JSON.stringify(input));
    assert.equal(result.hermesPrompt,null);
    assert.ok(result.conflicts.length);
  }
});

test('Continue fails closed for upstream divergence, ahead/behind work, stale viewed Git, and session path mismatch',()=>{
  const variants=[
    {...safe,git:{...safe.git,upstream:''}},
    {...safe,git:{...safe.git,ahead:1}},
    {...safe,git:{...safe.git,behind:1}},
    {...safe,storedContext:{...safe.storedContext,sessionPath:'/other'}},
    {...safe,storedContext:{...safe.storedContext,viewedGit:null}},
    {...safe,storedContext:{...safe.storedContext,viewedGit:{...safe.git,head:'c'.repeat(40)}}}
  ];
  for(const input of variants){
    const result=composeContinue(input);
    assert.equal(result.canContinue,false,JSON.stringify(input));
    assert.equal(result.hermesPrompt,null);
    assert.ok(result.conflicts.length);
  }
});

test('Continue fails closed for missing, stale, duplicate, or incomplete fingerprints',()=>{
  const variants=[
    {...safe,storedContext:{...safe.storedContext,fingerprints:[]}},
    {...safe,currentFingerprints:[]},
    {...safe,currentFingerprints:[{...fingerprint,fingerprint:'c'.repeat(64)}]},
    {...safe,currentFingerprints:[fingerprint,fingerprint]},
    {...safe,currentFingerprints:[{path:'',fingerprint:'a'.repeat(64)}]}
  ];
  for(const input of variants){
    const result=composeContinue(input);
    assert.equal(result.canContinue,false);
    assert.equal(result.freshness.fingerprintsCurrent,false);
  }
});

test('projection conflicts and approval gates block Continue',()=>{
  for(const input of [
    {...safe,project:{...project,conflicts:[{kind:'commit_conflict',message:'diverged'}]}},
    {...safe,project:{...project,approvalGates:['Joey approval required']}}
  ]){
    const result=composeContinue(input);
    assert.equal(result.canContinue,false);
    assert.equal(result.hermesPrompt,null);
  }
});

test('Continue blocks stale, missing, or disappeared viewed AI sessions',()=>{const current={id:'s',entityId:'X',ai:'Hermes',model:'new-model',workspaceId:'w',path:'/x',declaredTask:'NEW UNVIEWED TASK',state:'running',createdAt:'2026-10-04T00:00:00.000Z',updatedAt:'2026-10-04T02:00:00.000Z'},viewed={...current,model:'old-model',declaredTask:'OLD VIEWED TASK',updatedAt:'2026-10-04T01:00:00.000Z'};for(const storedContext of [{...safe.storedContext,currentSession:current,viewedSession:viewed},{...safe.storedContext,currentSession:current,viewedSession:null},{...safe.storedContext,currentSession:null,viewedSession:viewed}]){const result=composeContinue({...safe,storedContext});assert.equal(result.canContinue,false);assert.match(result.conflicts.join(' '),/AI session/);}});
