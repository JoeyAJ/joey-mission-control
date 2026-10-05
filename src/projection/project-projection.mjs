import {actionableDecision,missingOrUnverified,noAction,canonicalEvidence} from '../../public/control-semantics.js';
import { deriveLifecycle, approvalGates } from './lifecycle.mjs';
import { detectConflicts } from './conflict-detector.mjs';
import { sha256 } from '../canonical/fingerprint.mjs';

function claim(value,source,classification='canonical',missingReason){
  const unknown=value===undefined||value===null||value===''||String(value).trim().toLowerCase()==='unknown';
  if(!unknown)return{value,classification,source:source||null};
  return{value:'Unknown',classification:'unknown',source:source||null,missingReason:missingReason||(String(value).trim().toLowerCase()==='unknown'?'unknown':source?'not_recorded':'source_unavailable')};
}
function sectionSource(source,section){return source?{...source,sourceSection:section}:null;}
function sectionClaims(document,heading){return(document.sections?.[heading]||'').split('\n').map(line=>line.replace(/^[-*]\s*/, '').trim()).filter(Boolean).map(value=>claim(value,sectionSource(document.source,heading)));}
function explicitOperator(state,handoff,keys,handoffKey){
  for(const key of keys)if(state.source&&state.metadata?.[key]!==undefined)return claim(state.metadata[key],sectionSource(state.source,`Metadata / ${key}`));
  if(handoff?.source&&!handoff.conflict&&handoff[handoffKey])return claim(handoff[handoffKey],sectionSource(handoff.source,`Handoff / ${handoffKey}`));
  return claim(null,state.source||handoff?.source,'canonical',state.source||handoff?.source?'not_recorded':'source_unavailable');
}
function sessionSource(session){
  if(!session)return null;
  return{classification:'local_overlay',sourcePath:`local://sessions/${session.id}`,sourceSection:'AI workspace session',fingerprint:sha256(JSON.stringify(session)),verificationStatus:'local_overlay',readAt:session.updatedAt};
}
function canonicalFingerprints(sources){
  const byPath=new Map();
  for(const source of sources.filter(Boolean))if(source.classification==='canonical'&&source.sourcePath&&source.fingerprint)byPath.set(source.sourcePath,{path:source.sourcePath,fingerprint:source.fingerprint});
  return [...byPath.values()].sort((a,b)=>a.path.localeCompare(b.path));
}
function completedHandoff(handoff){return handoff&&/^(SUCCESS|COMPLETED|DONE)$/i.test(handoff.status||'');}
function markdownSubsection(text='',heading){const marker=new RegExp(`^###\\s+${heading}\\s*$`,'mi').exec(text);if(!marker)return null;const body=text.slice(marker.index+marker[0].length).replace(/^\s*/,'');const next=body.search(/^#{2,3}\s+/m);return(next<0?body:body.slice(0,next)).trim()||null;}
function unsectionedActions(next={}){if(Object.keys(next.sections||{}).length)return null;const items=(next.text||'').split('\n').map(line=>line.match(/^[-*]\s+(.+)$/)?.[1]?.trim()).filter(Boolean);return items.length?items.join(' '):null;}

export function buildProjectProjection({id,name,entityType,parentId,indexSource,memoryPath,relevantDocs=[],state={},next={},registry={},handoff,handoffConflicts=[],session,git={},cases=[],projectUrls}){
  const stateSource=state.source||null,nextSource=next.source||null;
  if(handoff?.conflict||(handoff?.entityId&&handoff.entityId!==id))handoff=null;
  const handoffSource=handoff?.source||null,localSource=sessionSource(session);
  const stage=state.sections?.['Current Stage']||state.metadata?.status||state.metadata?.verification_status||'';
  const gates=approvalGates(next);
  const completed=completedHandoff(handoff);
  const canonicalNext=next.sections?.['Recommended Next Step']||next.sections?.['Current Priority']||unsectionedActions(next);
  const nextWork=canonicalNext||handoff?.nextAction;
  const sessionIsActive=session&&!['stopped','failed'].includes(session.state);
  const canonicalMission=state.sections?.['Current Mission']||state.sections?.['Current Task']||state.metadata?.current_mission||state.metadata?.current_task;
  let currentTask=canonicalMission||(!completed?handoff?.task:null);
  const taskSource=canonicalMission?sectionSource(stateSource,'Current Mission / Current Task'):handoffSource;
  const comparable=value=>String(value||'').replace(/^[-*]\s*/gm,'').replace(/\s+/g,' ').trim().toLowerCase();
  if(currentTask&&comparable(currentTask)===comparable(nextWork))currentTask=null;
  const lastCompleted=completed?[handoff.task,handoff.summary].filter(Boolean).join(' — '):null;
  const conflicts=detectConflicts({storedHead:registry.storedHead,observedHead:git.head,productionHead:registry.productionHead,branch:registry.branch,observedBranch:git.branch,localMaster:registry.localMaster,observedPath:git.path});
  for(const item of handoffConflicts)conflicts.push({kind:'handoff_conflict',message:`Malformed Handoff blocks continuation: ${(item.conflictReasons||[]).join('; ')||item.sourcePath}`,values:[item.sourcePath],source:item.source||null,classification:'canonical'});
  if(git.error||!git.observedAt)conflicts.push({kind:'git_observation_error',message:git.error||'Workspace observation unavailable'});
  const lifecycle=deriveLifecycle(stage,next);
  const management={approvals:sectionClaims(next,'Not Authorized Yet'),decisions:sectionClaims(next,'Decisions Needed From Joey')};
  const needsJoey=management.approvals.some(c=>actionableDecision(c,'approval'))||management.decisions.some(c=>actionableDecision(c,'decision'))||sectionClaims(next,'Blockers').some(c=>actionableDecision(c,'approval'));
  const hasRestriction=management.approvals.some(c=>canonicalEvidence(c)&&!missingOrUnverified(c.value)&&!noAction(c.value));
  const attention=conflicts.length?'conflict':needsJoey?'awaiting_approval':(!nextSource||management.decisions.some(c=>missingOrUnverified(c.value)))?'data_missing':(hasRestriction||(canonicalEvidence(claim(next.sections?.Blockers,nextSource))&&!missingOrUnverified(next.sections?.Blockers)&&!noAction(next.sections?.Blockers)))?'blocker':'ready_to_continue';
  const fingerprints=canonicalFingerprints([indexSource,stateSource,nextSource,handoffSource,registry.source]);
  const database=markdownSubsection(state.text,'Database');
  const docs=[memoryPath,...relevantDocs].filter(Boolean).filter((item,index,all)=>all.indexOf(item)===index);
  return{
    schemaVersion:'1.0',...(projectUrls?{projectUrls}:{}),id,entityType,...(parentId?{parentId}:{}),
    name:claim(name,indexSource||stateSource||registry.source),status:claim(lifecycle.status,stateSource,'derived',stateSource?'not_derived':'source_unavailable'),phase:claim(lifecycle.phase,stateSource,'derived',stateSource?'not_derived':'source_unavailable'),attention:claim(attention,conflicts.length?git.source||stateSource:nextSource||stateSource,'derived'),
    currentStage:claim(state.sections?.['Current Stage'],sectionSource(stateSource,'Current Stage')),
    management,
    version:claim(state.metadata?.version,stateSource),lastCompleted:claim(lastCompleted,handoffSource),currentTask:claim(currentTask,currentTask?taskSource:stateSource,taskSource===localSource?'local_overlay':'canonical'),
    nextAction:claim(nextWork,canonicalNext?nextSource:handoffSource),blocker:claim(next.sections?.Blockers,nextSource),
    lastAI:explicitOperator(state,handoff,['current_agent','last_agent','last_ai','executed_by'],'executedBy'),model:explicitOperator(state,handoff,['agent_model','last_model','model'],'model'),workspace:claim(session?.path||registry.localMaster,session?localSource:registry.source,session?'local_overlay':'canonical'),
    lastUpdated:claim(session?.updatedAt||state.metadata?.as_of||git.observedAt,session?localSource:(state.metadata?.as_of?stateSource:git.source),session?'local_overlay':(state.metadata?.as_of?'canonical':'observed')),
    where:{localPath:claim(registry.localMaster,registry.source),repository:claim(registry.github,registry.source),branch:claim(registry.branch,registry.source),storedCommit:claim(registry.storedHead,registry.source),observedCommit:claim(git.head,git.source,'observed'),production:claim(registry.production,registry.source),database:claim(database,stateSource),relevantDocs:claim(docs.length?docs:null,indexSource||stateSource,'derived')},
    workspaceObservation:(git.error||!git.observedAt)?{error:git.error||'Workspace observation unavailable',observedAt:git.observedAt||null}:{...git},session:session||null,approvalGates:gates,conflicts,sourceFingerprints:fingerprints,cases,derivationReason:lifecycle.reason
  };
}
