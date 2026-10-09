// Thin file observation adapter only. Reuses the existing injected repository
// transport and the existing private consumer/scheduler; no fetch/env/route here.
import {createHash} from 'node:crypto';
import {isStrictDateTime} from '../canonical/date-time.mjs';
import {projectEntryReadConfiguration} from './project-entry-read-allowlist.mjs';
const sha=/^[a-f0-9]{40}$/;
const fileStates=new Set(['MISSING','ACCESS_DENIED','UNAVAILABLE','TOO_LARGE','UNSUPPORTED_TYPE']);
const digest=(kind,bytes)=>createHash(kind).update(bytes).digest('hex');
function verify(file,revision,maxBytes){
 if(file?.status!=='FOUND')return {status:fileStates.has(file?.status)?file.status:'UNAVAILABLE'};
 if(file.entryType!=='file')return {status:'UNSUPPORTED_TYPE'};
 if(file.commitSha!==revision||typeof file.content!=='string'||!sha.test(file.blobId||''))return {status:'UNAVAILABLE'};
 const bytes=Buffer.from(file.content,'utf8');if(bytes.length>maxBytes)return {status:'TOO_LARGE'};
 if(file.content.includes('\0')||new TextDecoder('utf-8',{fatal:true}).decode(bytes)!==file.content||digest('sha1',Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes]))!==file.blobId)return {status:'UNAVAILABLE'};
 return {status:'FOUND',content:file.content,blobId:file.blobId,contentSha256:digest('sha256',bytes)};
}
function metadata(document,projectId,now){
 let fence=null;const header=document.split(/^## /m)[0].split('\n').filter(line=>{const marker=line.match(/^\s*(`{3,}|~{3,})/);if(marker){if(!fence)fence=marker[1][0];else if(fence===marker[1][0])fence=null;return false;}return !fence;}).join('\n'),field=name=>header.match(new RegExp('^'+name+':[ \\t]*(.+)$','mi'))?.[1]?.trim()||null;
 const declared=field('Project'),timestamp=field('Timestamp'),conflicts=[];
 if(declared&&declared!==projectId)conflicts.push('ENTRY_PROJECT_CONFLICT');
 if(timestamp&&(!isStrictDateTime(timestamp)||Date.parse(timestamp)>now()+300000))conflicts.push('ENTRY_TIMESTAMP_CONFLICT');
 return {timestamp:timestamp&&isStrictDateTime(timestamp)?timestamp:null,conflicts,progress:{qualification:'DOCUMENT_REPORTED',metadataStatus:field('Last Developer')||field('Executed by')||field('Agent')?'EXPLICIT_PRIMARY_ENTRY_HEADER':'SIGNATURE_NOT_RECORDED',task:field('Task'),recordedStatus:field('Status'),summary:null,changes:null,verification:null,nextAction:null,decisionRequired:null,lastAgent:field('Last Developer')||field('Executed by')||field('Agent'),lastModel:field('Actual Model')||field('Model')}};
}
export async function readProjectEntrySource({projectId,track='BASELINE',reader,signal,now=Date.now,maxBytes=65536}={}){
 const c=projectEntryReadConfiguration(projectId,{track});
 if(typeof reader?.resolveRevision!=='function'||typeof reader?.readFile!=='function'||!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>65536)throw Error('PROJECT_ENTRY_READER_UNCONFIGURED');
 const cancelled=()=>{if(signal?.aborted)throw Error('PROJECT_ENTRY_READ_CANCELLED');};
 const observation={schemaVersion:1,projectId,track,status:'UNAVAILABLE',primaryEntryStatus:null,primaryEntryPath:c.path,entryMode:'ROOT',entryQualification:c.entryQualification,sourceReadIsProductAcceptance:false,document:null,progress:null,contextDocuments:[],conflicts:[],freshness:'DOCUMENT_TIME_UNKNOWN',baselineChanged:false,currentAgent:null,currentModel:null,runtimeConnected:false,executionAuthorized:false,errorCategory:null,source:{qualification:'REMOTE_FILE_READ',repositoryId:c.repositoryId,requestedRef:c.ref,expectedBaseline:c.expectedBaseline,resolvedCommitSha:null,path:c.path,providerBlobId:null,contentSha256:null,readAt:new Date(now()).toISOString(),documentTimestamp:null}};
 const fail=status=>{observation.status=status;observation.errorCategory=status==='ACCESS_DENIED'?'REPOSITORY_READ_NOT_AUTHORIZED':status==='MISSING'?'ENTRY_FILE_MISSING':status==='UNAVAILABLE'?'REPOSITORY_READ_UNAVAILABLE':status;observation.document=null;observation.progress=null;observation.contextDocuments=[];observation.source.contentSha256=null;observation.source.providerBlobId=null;observation.source.readAt=new Date(now()).toISOString();return observation;};
 try{cancelled();const revision=await reader.resolveRevision({repositoryId:c.repositoryId,ref:c.ref,signal});cancelled();if(!sha.test(revision?.commitSha))return fail('UNAVAILABLE');
  const commit=revision.commitSha;observation.source.resolvedCommitSha=commit;observation.baselineChanged=commit!==c.expectedBaseline;
  const get=async path=>{cancelled();const file=await reader.readFile({repositoryId:c.repositoryId,commitSha:commit,path,maxBytes,signal});cancelled();return verify(file,commit,maxBytes);};
  const entry=await get(c.path);observation.primaryEntryStatus=entry.status;if(entry.status!=='FOUND')return fail(entry.status);
  observation.document=entry.content;observation.source.providerBlobId=entry.blobId;observation.source.contentSha256=entry.contentSha256;
  const parsed=metadata(entry.content,c.projectId,now);observation.conflicts=parsed.conflicts;observation.source.documentTimestamp=parsed.timestamp;
  observation.status=parsed.conflicts.length?'CONFLICT':'FOUND';observation.errorCategory=parsed.conflicts.length?'ENTRY_METADATA_CONFLICT':null;observation.progress=parsed.conflicts.length?null:parsed.progress;observation.freshness=parsed.timestamp?'DOCUMENT_TIMESTAMP_RECORDED':'DOCUMENT_TIME_UNKNOWN';
  const contexts=await Promise.allSettled(c.contextPaths.map(path=>get(path)));cancelled();
  for(const [index,result] of contexts.entries()){const file=result.status==='fulfilled'?result.value:{status:result.reason?.code==='ACCESS_DENIED'?'ACCESS_DENIED':'UNAVAILABLE'};
   if(file.status==='ACCESS_DENIED')return fail('ACCESS_DENIED');
   observation.contextDocuments.push({path:c.contextPaths[index],status:file.status,qualification:'REMOTE_FILE_READ',resolvedCommitSha:commit,providerBlobId:file.blobId||null,contentSha256:file.contentSha256||null});
  }
  observation.source.readAt=new Date(now()).toISOString();return observation;
 }catch(error){cancelled();return fail(error?.code==='ACCESS_DENIED'?'ACCESS_DENIED':'UNAVAILABLE');}
}
