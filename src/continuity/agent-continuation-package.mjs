// Portable private intake, assembled only from verified reads. No dispatch adapter.
import {ownerAgentSelection} from './agent-handoff-selection.mjs';
const sensitive=/Bearer\s+|\b(?:token|password|secret|api[_ -]?key)\s*[:=]\s*\S|gh[pousr]_[A-Za-z0-9]|github_pat_|sk-[A-Za-z0-9]{8}|(?:BEGIN\s+[^\n]*PRIVATE KEY)|\bAKIA[A-Z0-9]{16}\b|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.|["']?(?:rawModelPayload|authCache|reasoning)["']?\s*[:=]/i;
const fail=code=>{throw Error(code);};
function text(value,max=128,{nullable=false}={}){
 if(nullable&&(value===null||value===undefined||value===''))return null;
 if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)||sensitive.test(value))fail('CONTINUATION_CONTENT_UNSAFE');
 return value;
}
function pick(value,keys){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('CONTINUATION_METADATA_INVALID');
 const result={};for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(d&&!('value'in d))fail('CONTINUATION_METADATA_INVALID');result[key]=d?.value;}return result;
}
export function requireContinuationSelection(value){
 const selected=ownerAgentSelection(pick(value,['agent','provider','model']));
 if(!selected.agent||!selected.provider||!selected.model)fail('AGENT_PROVIDER_MODEL_REQUIRED');
 for(const key of ['agent','provider','model']){text(selected[key]);if(/^(?:unknown|unconfirmed|not[_ -]?selected|default|auto|null|n\/a)$/i.test(selected[key]))fail('AGENT_PROVIDER_MODEL_REQUIRED');}
 return selected;
}
function pin(value){
 const s=pick(value,['repositoryId','requestedRef','path','resolvedCommitSha','contentSha256','readAt','documentTimestamp']);
 if(s.repositoryId!=='JoeyAJ/joey-mission-control'||s.requestedRef!=='codex/mc-command-center-checkpoint-20261006'||s.path!=='HANDOFF.md'&&s.path!=='docs/MC_WORKSPACE_READING_HANDOFF.md'||!/^[a-f0-9]{40}$/.test(s.resolvedCommitSha)||!/^[a-f0-9]{64}$/.test(s.contentSha256))fail('CONTINUATION_SOURCE_INVALID');
 return {repositoryId:s.repositoryId,requestedRef:s.requestedRef,path:s.path,resolvedCommitSha:s.resolvedCommitSha,contentSha256:s.contentSha256,readAt:text(s.readAt,40),documentTimestamp:text(s.documentTimestamp,40,{nullable:true})};
}
function runHistory(value){
 const r=pick(value,['runId','executionKind','selection','handoffSource','sourceQualification','identityQualification','status','actualModel','modelQualification','eventAt','receivedAt']),s=pick(r.selection,['qualification','agent','provider','requestedModel']);
 return {runId:text(r.runId),executionKind:text(r.executionKind),selection:{qualification:text(s.qualification),agent:text(s.agent),provider:text(s.provider),requestedModel:text(s.requestedModel,128,{nullable:true})},handoffSource:pin(r.handoffSource),sourceQualification:text(r.sourceQualification),identityQualification:text(r.identityQualification),status:text(r.status),actualModel:text(r.actualModel,128,{nullable:true}),modelQualification:text(r.modelQualification),eventAt:text(r.eventAt,40,{nullable:true}),receivedAt:text(r.receivedAt,40,{nullable:true})};
}
function sections(markdown){
 const result=[],re=/^## (.+)$/gm;let match;
 while((match=re.exec(markdown)))result.push({name:match[1].trim(),start:re.lastIndex,index:match.index});
 return result.map((s,i)=>({...s,body:markdown.slice(s.start,result[i+1]?.index).trim()}));
}
function subsection(body,names){
 const re=/^#{2,3} (.+)$/gm,headings=[];let m;
 while((m=re.exec(body)))headings.push({name:m[1].trim(),start:re.lastIndex,index:m.index});
 const index=headings.findIndex(h=>names.includes(h.name.toLowerCase()));
 return index<0?null:body.slice(headings[index].start,headings[index+1]?.index).trim()||null;
}
const intakeSteps=[
 'Open the private repository at the exact latest observed SHA and verify the HANDOFF digest before dependent work.',
 'Read the current stage first; preserved earlier sections are historical. Read docs/PRODUCT_CHARTER.md and docs/MC_PHASE_PLAN.md at the same SHA.',
 'Reconcile completed work, unresolved blockers and the authorized next slice. Missing source facts remain unknown; do not repeat a completed pilot.',
 'Use your own authorized repository access. Preserve original run/model/source history; record the actual development Agent when updating the handoff.',
 'Continue the already authorized scope only. Deployment, SQL and destructive operations need their own authorization; report access gaps clearly.'
];
function contextIndex(value,source){
 if(value===undefined)return [];if(!Array.isArray(value)||value.length>4)fail('CONTINUATION_SOURCE_INVALID');
 const allowed=['README.md','docs/PRODUCT_CHARTER.md','docs/MC_PHASE_PLAN.md','docs/STAGE_HANDOFF_TEMPLATE.md'],seen=new Set();
 return value.map(item=>{const d=pick(item,['path','status','qualification','resolvedCommitSha','providerBlobId','contentSha256']);
  if(!allowed.includes(d.path)||seen.has(d.path)||d.qualification!=='REMOTE_FILE_READ'||d.resolvedCommitSha!==source.resolvedCommitSha||!['FOUND','MISSING','ACCESS_DENIED','UNAVAILABLE','TOO_LARGE','UNSUPPORTED_TYPE'].includes(d.status))fail('CONTINUATION_SOURCE_INVALID');seen.add(d.path);
  const found=d.status==='FOUND';if(found&&(!/^[a-f0-9]{40}$/.test(d.providerBlobId)||!/^[a-f0-9]{64}$/.test(d.contentSha256)))fail('CONTINUATION_SOURCE_INVALID');
  return {...d,url:found?'https://github.com/'+source.repositoryId+'/blob/'+source.resolvedCommitSha+'/'+d.path:null};
 });
}
function optionalSelection(value){const selected=ownerAgentSelection(pick(value,['agent','provider','model']));for(const key of ['agent','provider','model'])text(selected[key],128,{nullable:true});return selected;}
export function buildAgentContinuationPackage({handoff,runs,latestEvent=null,ownerSelection=null}={}){
 const h=pick(handoff,['qualification','projectId','source','sourceStatus','contextDocuments','document','progress','taskEventContext','executionAuthorized']);
 if(h.qualification!=='READ_ONLY_REPOSITORY_HANDOFF'||h.projectId!=='MISSION_CONTROL'||h.sourceStatus!=='FOUND'||h.executionAuthorized!==false)fail('CONTINUATION_SOURCE_INVALID');
 const source=pin(h.source),document=text(h.document,131072),p=pick(h.progress,['task','recordedStatus','lastAgent','lastModel']),context=pick(h.taskEventContext,['taskId','runId','runHandoffSource','latestSourceChanged','durableRevision','journalRevision','sourceQualification','storageQualification']);
 if(!Array.isArray(runs)||!runs.length||runs.length>100)fail('CONTINUATION_HISTORY_INVALID');
 const history=runs.map(runHistory),original=history.find(r=>r.runId===context.runId);if(!original)fail('CONTINUATION_HISTORY_INVALID');
 const current=sections(document).find(s=>/^Current task progress\b/i.test(s.name));
 const top=sections(document),section=names=>current?subsection(current.body,names):top.find(s=>names.includes(s.name.toLowerCase()))?.body||null;
 let checkpoint=null;if(latestEvent){const e=pick(latestEvent,['runId','kind','publicSummary','sourceQualification','eventAt','receivedAt']);if(e.runId!==context.runId)fail('CONTINUATION_HISTORY_INVALID');checkpoint={kind:text(e.kind),summary:text(e.publicSummary,1024,{nullable:true}),sourceQualification:text(e.sourceQualification),eventAt:text(e.eventAt,40,{nullable:true}),receivedAt:text(e.receivedAt,40,{nullable:true})};}
 const documents=contextIndex(h.contextDocuments,source),lastDeveloper=text(p.lastAgent,128,{nullable:true}),next=section(['next action','next proposed action']),completed=section(['completed','changes']);
 const entryInstructions=['Continue MISSION_CONTROL from the private repository '+source.repositoryId+', branch '+source.requestedRef+'.',
  'Use your own existing authorized repository access; the MC browser session is not a repository credential. Resolve current branch HEAD first and verify Project: MISSION_CONTROL in HANDOFF.md.',
  'Verified HANDOFF location: https://github.com/'+source.repositoryId+'/blob/'+source.resolvedCommitSha+'/'+source.path+'. Last MC-verified version: '+source.resolvedCommitSha+'; HANDOFF.md SHA256 '+source.contentSha256+'; observed '+source.readAt+'. Verify the latest branch again before dependent work.',
  'Read HANDOFF.md first, then the verified background/goal/PRD/plan/update documents below. Read the current stage before historical sections; reconcile tests, known issues and next steps. Missing facts stay unknown.',
  ...documents.map(d=>d.url?'Verified at '+d.resolvedCommitSha+': '+d.path+' — '+d.url:'Context unavailable: '+d.path+' — '+d.status),
  documents.length?'':'Background/PRD index is not verified in this source; report the missing context before dependent work.',
  'Last developer signed in HANDOFF: '+(lastDeveloper||'unknown')+'. Completed: '+(completed||'not separately recorded')+'. Next steps: '+(next||'not separately recorded')+'.',
  'Continue only the already authorized project scope. This instruction does not authorize deployment, SQL, new permissions or destructive operations. If access or required context is missing, report the exact gap clearly.',
  'After work, run appropriate tests and update HANDOFF.md with the actual development Agent, timestamp, source/version, completed changes, tests, known issues and next steps. Preserve original history; model metadata is optional and unknown stays unknown.'
 ].filter(Boolean).join('\n\n');
 return {
  schemaVersion:'mc.agent-continuation.v1',projectId:'MISSION_CONTROL',taskId:text(context.taskId,80),source,qualification:'PRIVATE_SOURCE_BOUND_MANUAL_CONTINUATION',sourceReadIsRuntimeEvidence:false,
  targetSelection:ownerSelection===null?null:optionalSelection(ownerSelection),entryInstructions,
  projectSnapshot:{projectId:'MISSION_CONTROL',latestVersion:source.resolvedCommitSha,lastDeveloper:{agent:lastDeveloper,qualification:lastDeveloper?'HANDOFF_SIGNED_DEVELOPER':'NOT_RECORDED',sourcePath:source.path,sourceSha:source.resolvedCommitSha,sourceDigest:source.contentSha256},updatedAt:source.documentTimestamp,completion:completed,nextSteps:next,contextDocuments:documents},
  runner:{status:'NOT_CONNECTED',dispatchAvailable:false,currentAgent:null,currentModel:null,executionAuthorized:false},
  progress:{qualification:'DOCUMENT_REPORTED_AND_SEPARATE_REPORTED_EVENT',task:text(p.task,1024),recordedStatus:text(p.recordedStatus,128),currentStage:current?{heading:current.name,content:current.body}:null,
   completed:{documentSection:section(['completed','changes']),reportedCheckpoint:checkpoint?.kind==='completed'?checkpoint:null},
   blockers:{documentSection:section(['blockers','decision required']),sourceFactsMissing:!!current&&!section(['blockers','decision required']),capability:[]},
   next:{documentSection:section(['next action','next proposed action']),sourceFactsMissing:!!current&&!section(['next action','next proposed action']),intakeSteps}},
  taskEventContext:{runId:original.runId,runHandoffSource:pin(context.runHandoffSource),latestSourceChanged:context.latestSourceChanged===true,durableRevision:context.durableRevision??context.journalRevision,sourceQualification:text(context.sourceQualification),storageQualification:text(context.storageQualification,128,{nullable:true}),reportedCheckpoint:checkpoint},
  runHistory:history,document:{content:document,qualification:'VERIFIED_PRIVATE_HANDOFF_SOURCE',historicalSectionsPreserved:true},executionAuthorized:false
 };
}
