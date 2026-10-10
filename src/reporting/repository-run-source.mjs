// Server-side verified Git bytes, independent of document/runtime observations.
import {createHash} from 'node:crypto';
import {mcRemoteHandoffConfiguration} from '../canonical/remote-handoff-adapter.mjs';
import {projectEntryReadConfiguration} from '../continuity/project-entry-read-allowlist.mjs';
import {REPORT_REF,REPORT_DIRECTORY,MAX_REPORT_BYTES,MAX_RUNS,parseRepositoryRun,repositoryRunPresentation,runReportPath} from './repository-run-contract.mjs';
export function repositoryRunConfiguration(projectId,{track='BASELINE'}={}){
 const entry=projectId==='MISSION_CONTROL'&&track==='BASELINE'?{...mcRemoteHandoffConfiguration,track}:projectEntryReadConfiguration(projectId,{track});
 return {projectId,track,repositoryId:entry.repositoryId,reportRef:REPORT_REF,directory:REPORT_DIRECTORY,maxRunFiles:MAX_RUNS,maxFileBytes:MAX_REPORT_BYTES,entry};
}
const hash=(kind,bytes)=>createHash(kind).update(bytes).digest('hex');
export async function readRepositoryRuns({configuration,reader,signal,now=Date.now}={}){
 const c=configuration,observation={schemaVersion:1,qualification:'PRIVATE_REPOSITORY_AGENT_REPORTS',projectId:c.projectId,track:c.track,status:'UNAVAILABLE',runs:[],source:{repositoryId:c.repositoryId,requestedRef:c.reportRef,path:c.directory,resolvedCommitSha:null,readAt:new Date(now()).toISOString()},errorCategory:null,executionAuthorized:false};
 const cancelled=()=>{if(signal?.aborted)throw Error('REPOSITORY_RUN_CANCELLED');};const fail=code=>{observation.status=code==='ACCESS_DENIED'?'ACCESS_DENIED':code.startsWith('RUN_REPORT_')||code==='RUN_LIST_LIMIT'?'CONFLICT':'UNAVAILABLE';observation.errorCategory=code;observation.runs=[];return observation;};
 try{cancelled();const revision=await reader.resolveRevision({repositoryId:c.repositoryId,ref:c.reportRef,signal});cancelled();if(revision?.status==='MISSING'){observation.status='NO_REPORTS';return observation;}if(!/^[a-f0-9]{40}$/.test(revision?.commitSha))return fail('REPOSITORY_RUN_REVISION_INVALID');observation.source.resolvedCommitSha=revision.commitSha;
  const list=await reader.listRunFiles({repositoryId:c.repositoryId,commitSha:revision.commitSha,signal});cancelled();if(list?.status==='MISSING'){observation.status='NO_REPORTS';return observation;}if(!Array.isArray(list?.files)||list.files.length>MAX_RUNS)return fail('RUN_LIST_LIMIT');
  const seen=new Set();for(const file of list.files){cancelled();const runId=file.path?.slice((REPORT_DIRECTORY+'/').length,-5);if(file.path!==runReportPath(runId)||seen.has(file.path))return fail('RUN_REPORT_FILE_CONFLICT');seen.add(file.path);
   const result=await reader.readRunFile({repositoryId:c.repositoryId,commitSha:revision.commitSha,path:file.path,maxBytes:MAX_REPORT_BYTES,signal});cancelled();if(result?.status!=='FOUND')return fail(result?.status||'UNAVAILABLE');
   if(result.commitSha!==revision.commitSha||result.blobId!==file.blobId||typeof result.content!=='string')return fail('RUN_REPORT_SOURCE_CONFLICT');const bytes=Buffer.from(result.content,'utf8');if(bytes.length>MAX_REPORT_BYTES||result.content.includes('\0')||new TextDecoder('utf-8',{fatal:true}).decode(bytes)!==result.content||hash('sha1',Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes]))!==file.blobId)return fail('RUN_REPORT_SOURCE_CONFLICT');
   const report=parseRepositoryRun(result.content,{now:now()});if(report.runId!==runId||report.projectId!==c.projectId||report.repositoryId!==c.repositoryId)return fail('RUN_REPORT_SCOPE_INVALID');
   const own=repositoryRunConfiguration(c.projectId,{track:report.track});parseRepositoryRun(result.content,{scope:own.entry,now:now()});if(report.track!==c.track)continue;
   const source={qualification:'SHA_PINNED_REPOSITORY_REPORT_READ',repositoryId:c.repositoryId,requestedRef:c.reportRef,resolvedCommitSha:revision.commitSha,path:file.path,providerBlobId:file.blobId,contentSha256:hash('sha256',bytes),readAt:new Date(now()).toISOString()};observation.runs.push({report,presentation:repositoryRunPresentation(report,{now:now()}),source});
  }
  const ids=new Map(observation.runs.map(r=>[r.report.runId,r.report]));for(const run of ids.values()){const visited=new Set([run.runId]);let p=run.predecessorRunId;if(p&&!ids.has(p))return fail('RUN_REPORT_PREDECESSOR_NOT_FOUND');while(p&&ids.has(p)){if(visited.has(p))return fail('RUN_REPORT_PREDECESSOR_CONFLICT');visited.add(p);p=ids.get(p).predecessorRunId;}}
  observation.status=observation.runs.length?'FOUND':'NO_REPORTS';observation.source.readAt=new Date(now()).toISOString();return observation;
 }catch(error){cancelled();return fail(error?.code||'REPOSITORY_RUN_UNAVAILABLE');}
}
