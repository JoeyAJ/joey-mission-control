import test from 'node:test';
import assert from 'node:assert/strict';
import {formatTakeoverInstruction} from '../public/joey-takeover.js';
const sha='a'.repeat(40),digest='b'.repeat(64);
const packet=()=>({projectId:'SYNTHETIC_PROJECT',sourceStatus:'FOUND',executionAuthorized:false,track:'BASELINE',source:{repositoryId:'synthetic/private-project',requestedRef:'main',resolvedCommitSha:sha,path:'README.md',contentSha256:digest,readAt:'2026-10-10T03:30:00Z',documentTimestamp:null},contextDocuments:[{path:'docs/PLAN.md',status:'FOUND'},{path:'docs/MISSING.md',status:'MISSING'}],progress:{task:null,nextAction:null,lastAgent:null},document:'PRIVATE_BODY_NOT_FOR_INSTRUCTION',history:[{lastAgent:'Historical Agent'}]});
test('simple copy supplies the verified canonical entry and facts without inventing progress or identity',()=>{
 const text=formatTakeoverInstruction(packet());
 assert(text.includes('synthetic/private-project'));assert(text.includes('/blob/'+sha+'/README.md'));assert(text.includes(digest));assert(text.includes('2026-10-10T03:30:00Z'));assert(text.includes('docs/PLAN.md'));assert.equal(text.split('\n').find(line=>line.startsWith('已核對背景文件: ')),'已核對背景文件: docs/PLAN.md');const source=JSON.parse(text.split('\n').find(line=>line.startsWith('Source packet: ')).slice('Source packet: '.length));assert.deepEqual(source.canonicalContextPaths,['docs/PLAN.md','docs/MISSING.md']);assert(!text.includes('PRIVATE_BODY_NOT_FOR_INSTRUCTION'));assert(!text.includes('Historical Agent'));assert(text.includes('最近開發者: 未記錄'));assert(text.includes('文件更新時間: 未記錄'));assert(text.includes('不授予新存取'));assert(text.includes('不啟動 Agent'));
});
test('the simple candidate instruction remains explicitly pending and preserves an actual signed developer',()=>{
 const p=packet();p.track='UNIVERSITY_CANDIDATE';p.source.requestedRef='migration/university-v04-portable';p.source.path='DEVELOPMENT.md';p.progress={task:'Synthetic documented task',nextAction:'Synthetic documented next step',lastAgent:'Explicit Fixture Developer'};
 const text=formatTakeoverInstruction(p);assert(text.includes('JoeyAcceptancePending'));assert(text.includes('不得當成 main 或已驗收成果'));assert(text.includes('migration/university-v04-portable'));assert(text.includes('/blob/'+sha+'/DEVELOPMENT.md'));assert(text.includes('最近開發者: Explicit Fixture Developer'));assert(text.includes('Synthetic documented next step'));
});
test('cross-agent continuation assigns existing authorized public deployment ownership and truthful capability limits',()=>{
 for(const p of [packet(),{...packet(),track:'UNIVERSITY_CANDIDATE'}]){const text=formatTakeoverInstruction(p);for(const phrase of ['接下 feature 任務的 Agent 負責 tests','部署不是例行留給 Joey','只 push code 不算','資料未變更不能標 APPLIED','mc.repository-run.v3','EXPLICIT_FILE_METADATA','file-event --packet','不裝 hook/daemon','manual dist']){assert(text.includes(phrase),phrase);}}
});
