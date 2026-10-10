import mcSourceProfile from '../../.mission-control/source-profile.json' with {type:'json'};
import {selectRepositoryRunProfile} from '../reporting/repository-run-source-profile.mjs';
// Server/agent-side repository reads only. No provider SDK, credential or writes.
import {parseHandoff} from './handoff-adapter.mjs';
import {sha256} from './fingerprint.mjs';
import {isStrictDateTime} from './date-time.mjs';
import {createHash} from 'node:crypto';

const commit=/^[a-f0-9]{40}$/;
const statuses=new Set(['MISSING','ACCESS_DENIED','UNAVAILABLE','TOO_LARGE','UNSUPPORTED_TYPE']);
const {track:mcTrack,...mcProfile}=selectRepositoryRunProfile(JSON.stringify(mcSourceProfile),{projectId:'MISSION_CONTROL',track:'BASELINE',repositoryId:'JoeyAJ/joey-mission-control'});
export const mcRemoteHandoffConfiguration=Object.freeze({...mcProfile,contextPaths:Object.freeze(mcProfile.contextPaths),legacyPath:'docs/MC_WORKSPACE_READING_HANDOFF.md',expectedBaseline:'bd89889155c9532462dde0c40a060dc23daa5f34'});
const validPath=p=>typeof p==='string'&&/^(?:HANDOFF\.md|docs\/[A-Za-z0-9_.-]+\.md)$/.test(p)&&!p.includes('..');
function validConfiguration(c){return c&&/^[A-Z][A-Z0-9_]{0,79}$/.test(c.projectId)&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(c.repositoryId)&&typeof c.ref==='string'&&c.ref.length<=200&&/^[A-Za-z0-9_./-]+$/.test(c.ref)&&!c.ref.includes('..')&&validPath(c.path)&&(!c.legacyPath||validPath(c.legacyPath))&&(!c.expectedBaseline||commit.test(c.expectedBaseline))&&(c.contextPaths===undefined||Array.isArray(c.contextPaths)&&c.contextPaths.length<=4&&new Set(c.contextPaths).size===c.contextPaths.length&&c.contextPaths.every(p=>mcRemoteHandoffConfiguration.contextPaths.includes(p)));}

async function bounded(operation,{signal,timeoutMs}){
 const controller=new AbortController();let timer,abort;
 const interrupted=new Promise((_,reject)=>{abort=()=>{controller.abort();reject(Object.assign(Error('READ_CANCELLED'),{code:'CANCELLED'}));};if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>{controller.abort();reject(Object.assign(Error('READ_TIMEOUT'),{code:'UNAVAILABLE'}));},timeoutMs);});
 try{return await Promise.race([interrupted,Promise.resolve().then(()=>{if(controller.signal.aborted)throw Object.assign(Error('READ_CANCELLED'),{code:'CANCELLED'});return operation(controller.signal);})]);}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}

export async function readRemoteHandoff({configuration,reader,signal,now=Date.now,maxBytes=65536,maxAgeMs=86400000,timeoutMs=5000}={}){
 if(!validConfiguration(configuration)||typeof reader?.resolveRevision!=='function'||typeof reader?.readFile!=='function'||!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>65536||!Number.isSafeInteger(maxAgeMs)||maxAgeMs<1||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw Error('REMOTE_HANDOFF_UNCONFIGURED');
 const c=structuredClone(configuration),started=now();
 const observation={schemaVersion:1,projectId:c.projectId,status:'UNAVAILABLE',primaryEntryStatus:null,entryMode:'ROOT',document:null,progress:null,contextDocuments:[],conflicts:[],freshness:'UNKNOWN',baselineChanged:false,currentAgent:null,currentModel:null,runtimeConnected:false,executionAuthorized:false,source:{qualification:'REMOTE_FILE_READ',repositoryId:c.repositoryId,requestedRef:c.ref,expectedBaseline:c.expectedBaseline||null,resolvedCommitSha:null,path:c.path,providerBlobId:null,contentSha256:null,readAt:new Date(started).toISOString(),documentTimestamp:null}};
 try{
  const revision=await bounded(s=>reader.resolveRevision({repositoryId:c.repositoryId,ref:c.ref,signal:s}),{signal,timeoutMs});
  if(!commit.test(revision?.commitSha))throw Error('REMOTE_HANDOFF_REVISION_INVALID');
  observation.source.resolvedCommitSha=revision.commitSha;observation.baselineChanged=!!c.expectedBaseline&&c.expectedBaseline!==revision.commitSha;
  const get=path=>bounded(s=>reader.readFile({repositoryId:c.repositoryId,commitSha:revision.commitSha,path,maxBytes,signal:s}),{signal,timeoutMs});
  let file=await get(c.path);observation.primaryEntryStatus=file?.status;
  if(file?.status==='MISSING'&&c.legacyPath){file=await get(c.legacyPath);observation.entryMode='EXPLICIT_LEGACY_MAPPING';observation.source.path=c.legacyPath;}
  if(file?.status!=='FOUND'){if(!statuses.has(file?.status))throw Error('REMOTE_HANDOFF_REPLY_INVALID');observation.status=file.status;return observation;}
  if(file.commitSha!==revision.commitSha)throw Error('REMOTE_HANDOFF_MIXED_REVISION');
  if(file.entryType!=='file'){observation.status='UNSUPPORTED_TYPE';return observation;}
  if(typeof file.content!=='string')throw Error('REMOTE_HANDOFF_CONTENT_INVALID');
  const bytes=new TextEncoder().encode(file.content);if(bytes.length>maxBytes){observation.status='TOO_LARGE';return observation;}
  if(new TextDecoder('utf-8',{fatal:true}).decode(bytes)!==file.content||file.content.includes('\0'))throw Error('REMOTE_HANDOFF_CONTENT_INVALID');
  if(/^[a-f0-9]{40}$/.test(file.blobId||'')&&createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')!==file.blobId)throw Error('REMOTE_HANDOFF_BLOB_INTEGRITY');
  observation.document=file.content;observation.source.contentSha256=sha256(bytes);observation.source.providerBlobId=/^[a-f0-9]{40,64}$/.test(file.blobId||'')?file.blobId:null;
  observation.source.readAt=new Date(now()).toISOString();
  const parsed=parseHandoff(file.content,c.repositoryId+'@'+revision.commitSha+':'+observation.source.path,new Set([c.projectId]));
  const declaredProject=file.content.match(/^Project:\s*(.+)$/m)?.[1]?.trim();
  observation.conflicts=[...parsed.conflictReasons];
  if(declaredProject&&declaredProject!==c.projectId)observation.conflicts.push('Document project differs from mapped project');
  if(parsed.commit&&parsed.commit!==revision.commitSha)observation.conflicts.push('Document commit differs from resolved commit');
  if(isStrictDateTime(parsed.timestamp)&&Date.parse(parsed.timestamp)>now()+300000)observation.conflicts.push('Document timestamp is in the future');
  if(observation.conflicts.length){observation.status=declaredProject?'CONFLICT':'UNPARSED';observation.freshness='UNKNOWN';return observation;}
  observation.source.documentTimestamp=parsed.timestamp;
  observation.freshness=now()-Date.parse(parsed.timestamp)>maxAgeMs?'STALE_DOCUMENT':'RECENT_DOCUMENT';
  observation.status=observation.freshness==='STALE_DOCUMENT'?'STALE':'FOUND';
  const header=file.content.split(/^## /m)[0],metadata=name=>header.match(new RegExp('^'+name+':\\s*(.+)$','mi'))?.[1]?.trim()||null;
  observation.progress={qualification:'DOCUMENT_REPORTED',task:parsed.task,recordedStatus:parsed.status,summary:parsed.summary,changes:parsed.changes,verification:parsed.verification,nextAction:parsed.nextAction,decisionRequired:parsed.decisionRequired,lastAgent:metadata('Last Developer')||metadata('Executed by')||metadata('Agent'),lastModel:metadata('Model')};
  for(const path of c.contextPaths||[]){
   if(!['README.md','docs/PRODUCT_CHARTER.md','docs/MC_PHASE_PLAN.md','docs/STAGE_HANDOFF_TEMPLATE.md'].includes(path))throw Error('CONTEXT_PATH_INVALID');
   const entry={path,status:'UNAVAILABLE',qualification:'REMOTE_FILE_READ',resolvedCommitSha:revision.commitSha,providerBlobId:null,contentSha256:null};
   try{const context=await get(path);entry.status=statuses.has(context?.status)?context.status:'UNAVAILABLE';
    if(context?.status==='FOUND'&&context.commitSha===revision.commitSha&&context.entryType==='file'&&typeof context.content==='string'){
     const bytes=new TextEncoder().encode(context.content),blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
     if(bytes.length<=maxBytes&&new TextDecoder('utf-8',{fatal:true}).decode(bytes)===context.content&&!context.content.includes('\0')&&blob===context.blobId){entry.status='FOUND';entry.providerBlobId=blob;entry.contentSha256=sha256(bytes);}
    }
   }catch{if(signal?.aborted)throw Error('REMOTE_HANDOFF_CANCELLED');}
   observation.contextDocuments.push(entry);
  }
  return observation;
 }catch(error){if(signal?.aborted||error?.code==='CANCELLED')throw Error('REMOTE_HANDOFF_CANCELLED');observation.document=null;observation.progress=null;observation.source.contentSha256=null;observation.status=error?.code==='ACCESS_DENIED'?'ACCESS_DENIED':'UNAVAILABLE';observation.conflicts=[];return observation;}
}
