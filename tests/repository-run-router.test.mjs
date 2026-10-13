import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import handler from '../api/index.mjs';
import {ownerAuthConfig as policy} from '../public/owner-auth-config.js';
import {repositoryRunConfiguration} from '../src/reporting/repository-run-source.mjs';
import {createRepositoryRun,appendRepositoryRunEvent,runReportPath} from '../src/reporting/repository-run-contract.mjs';
import {retentionMarker,RETENTION_PATH,recoveryReference,recoveryPath,evidencePath,appendEvidenceReference} from '../src/reporting/rolling-retention.mjs';
import {validateRetainedEvidenceReply,validateRepositoryRunReply} from '../src/reporting/repository-run-client.mjs';

test('actual deployment router serves pinned task/run recovery and preserves read/Owner/head gates',async t=>{
 const config=repositoryRunConfiguration('MISSION_CONTROL'),head='a'.repeat(40),oldHead='b'.repeat(40),taskId='task_'+'f'.repeat(24),time=Date.now()-10000;
 const binding={schemaVersion:'mc.task-requirements.v1',revision:3,requestDigest:'c'.repeat(64)},files=new Map(),calls=[];
 const put=(path,value,commit=head)=>{const content=JSON.stringify(value),bytes=Buffer.from(content),sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');files.set(commit+':'+path,{content,sha,size:bytes.length});return sha;};
 const completed=runId=>{const r=createRepositoryRun({scope:{...config.entry,baselineSha:head,entryDigest:'d'.repeat(64)},runId,taskId,taskRequirements:binding,agentName:'Synthetic router Agent',featureTitle:'Synthetic router recovery',workRef:config.entry.ref,eventId:'start',summary:'Started',now:time});return appendRepositoryRunEvent(r,{id:'done',sequence:2,eventAt:new Date(time+1000).toISOString(),kind:'completed',summary:'Done',result:{codeSha:head,tests:[{name:'Synthetic',outcome:'PASS'}],nextSteps:'Owner review',handoff:{path:config.entry.path,commitSha:head}}},{expectedSequence:1}).report;};
 const active=completed('router-current'),archived=completed('router-archived'),path=runReportPath(archived.runId),blobId=put(path,archived,oldHead);
 const reference=recoveryReference({report:archived,path,commitSha:oldHead,blobId},config);
 put(runReportPath(active.runId),active);put(RETENTION_PATH,retentionMarker(config));put(recoveryPath(archived.runId),reference);put(evidencePath(taskId),appendEvidenceReference(null,reference,config));
 let activeOwner=true;
 const originalFetch=globalThis.fetch,originalCredential=process.env.MC_GITHUB_READ_TOKEN;
 t.after(()=>{globalThis.fetch=originalFetch;if(originalCredential===undefined)delete process.env.MC_GITHUB_READ_TOKEN;else process.env.MC_GITHUB_READ_TOKEN=originalCredential;});
 process.env.MC_GITHUB_READ_TOKEN='SYNTHETIC_ROUTER_CONTENTS_READ_000';
 globalThis.fetch=async(url,options)=>{
  const u=new URL(url);calls.push(u.href);const reply=(value,status=200)=>new Response(JSON.stringify(value),{status});
  if(u.origin===policy.origin){if(u.pathname==='/auth/v1/user')return reply({id:policy.ownerSubject});assert.equal(u.pathname,'/rest/v1/rpc/mc_owner_session');assert.deepEqual(JSON.parse(options.body),{project:'NEXAEON'});return reply({subject:policy.ownerSubject,role:'OWNER',projectId:'NEXAEON',sessionActive:activeOwner,memberActive:true,aal:'aal2',expiresAt:Date.now()+60000});}
  assert.equal(u.origin,'https://api.github.com');assert.equal(options.headers.Authorization,'Bearer SYNTHETIC_ROUTER_CONTENTS_READ_000');assert.equal(options.redirect,'error');
  if(u.pathname.endsWith('/git/ref/heads/mc/progress'))return reply({object:{type:'commit',sha:head}});
  const filePath=decodeURIComponent(u.pathname.split('/contents/')[1]),commit=u.searchParams.get('ref');assert([head,oldHead].includes(commit));
  if(['.mission-control/runs','.mission-control/runs-page-2'].includes(filePath)){const rows=[...files].filter(([key])=>key.startsWith(commit+':'+filePath+'/')).map(([key,v])=>({type:'file',path:key.slice(41),name:key.split('/').at(-1),sha:v.sha,size:v.size}));return rows.length?reply(rows):reply({},404);}
  const file=files.get(commit+':'+filePath);return file?reply({type:'file',encoding:'base64',sha:file.sha,size:file.size,content:Buffer.from(file.content).toString('base64')}):reply({},404);
 };
 const request=async(query='',{method='GET',headers={}}={})=>{let result;await handler({method,url:'/api/index?route=private/repository-runs&project=MISSION_CONTROL&'+query,headers:{host:new URL(policy.stageOrigin).host,authorization:'Bearer SYNTHETIC_ROUTER_OWNER_TOKEN_000',...headers}},{writeHead(status,headers){result={status,headers};},end(body){result.body=JSON.parse(body);}});return result;};
 const overview=await request();assert.equal(overview.status,200);assert.equal(validateRepositoryRunReply(overview.body,{projectId:'MISSION_CONTROL',ownerSubject:policy.ownerSubject}).observation.runs[0].report.runId,active.runId);
 for(const [query,lookup]of [['retainedTask='+taskId,{taskId}],['retainedRun='+archived.runId,{runId:archived.runId}]]){const r=await request(query+'&reportHead='+head);assert.equal(r.status,200);assert.equal(r.headers['Cache-Control'],'private, no-store');const reply=validateRetainedEvidenceReply(r.body,{projectId:'MISSION_CONTROL',ownerSubject:policy.ownerSubject,reportHead:head,...lookup});assert.equal(reply.rows[0].report.runId,archived.runId);assert.deepEqual(reply.rows[0].report.taskRequirements,binding);}
 const empty=await request('retainedTask=task_'+'e'.repeat(24)+'&reportHead='+head);assert.deepEqual(empty.body.rows,[]);assert.equal(empty.body.qualification,'OWNER_RETAINED_REPORT_EVIDENCE');
 assert.equal((await request('retainedTask='+taskId+'&reportHead='+oldHead)).status,503);
 assert.equal((await request('retainedTask='+taskId+'&retainedRun='+archived.runId+'&reportHead='+head)).status,503);
 let count=calls.length;assert.equal((await request('',{method:'POST'})).status,405);assert.equal(calls.length,count);
 assert.equal((await request('',{headers:{host:'production.invalid'}})).status,404);assert.equal(calls.length,count);
 activeOwner=false;const denied=await request('retainedTask='+taskId+'&reportHead='+head);assert.equal(denied.status,403);assert(!JSON.stringify(denied.body).includes(archived.runId));assert(calls.slice(count).every(url=>new URL(url).origin===policy.origin));
});
