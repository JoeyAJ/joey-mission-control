import {randomUUID} from 'node:crypto';
import {missionFromLegacy,lifecycleFromLegacy} from './adapter.mjs';
import {joeySource,logChanges,applyStateCommand} from './repository.mjs';
import {assertProjectState} from './model.mjs';
// Legacy approvals and new interactions share the same locked owner transaction.
export function bridgeLegacyApproval(owner,input,proposal){
 if(!owner.canonicalState)return;
 const before=structuredClone(owner.canonicalState),state=structuredClone(before),time=new Date().toISOString(),sourceId=joeySource(state,time,'Joey legacy approval '+(proposal?.type||'LIFECYCLE'));
 if(input.lifecycle){applyStateCommand(state,{type:'SET_LIFECYCLE',lifecycle:lifecycleFromLegacy(input.lifecycle),completionConfirmed:true},time,sourceId);}
 if(proposal?.type==='PURPOSE'){state.missionStatement=owner.purpose.originalPurpose;state.provenance.missionStatement={kind:'USER_INPUT',sourceRefs:[sourceId]};}
 if(proposal?.type==='HUMAN_NEXT_STEP')applyStateCommand(state,{type:'SET_NEXT_ACTION',title:owner.humanNextStep,description:owner.humanNextStep},time,sourceId);
 if(proposal?.type==='BLUEPRINT'){
  const retained=state.missions.filter(m=>m.linkedIdeaId);
  state.missions=owner.blueprint.milestones.map((m,index)=>({id:m.id,projectId:state.id,title:m.title,description:m.humanDescription,order:index,status:missionFromLegacy(m.status),dependencies:state.missions.find(v=>v.id===m.id)?.dependencies||[],sourceRefs:[sourceId],createdAt:state.missions.find(v=>v.id===m.id)?.createdAt||null,updatedAt:time,kind:'USER_INPUT',linkedIdeaId:null,legacyStatus:m.status}));
  for(const m of retained)if(!state.missions.some(v=>v.id===m.id))state.missions.push({...m,order:state.missions.length});state.metadata.missionSetReliability='CONFIRMED';for(const c of state.confirmationQueue.filter(c=>c.status==='OPEN'&&(c.field==='missionSetReliability'||c.field==='missionStatus'))){c.status='CORRECTED';c.resolution=c.field==='missionSetReliability'?'CONFIRMED':state.missions.find(m=>m.id===c.entityId)?.status||'UNKNOWN';c.resolvedAt=time;c.sourceRefs=[...c.sourceRefs,sourceId];}
 }
 state.metadata.revision=owner.revision;state.metadata.sourceOwnerRevision=owner.revision;logChanges(before,state,time,sourceId);if(state.auditLog.length===before.auditLog.length)state.auditLog.push({id:randomUUID(),timestamp:time,projectId:state.id,entityType:'PROJECT',entityId:state.id,field:'legacyOwnerApproval',oldValue:null,newValue:{type:proposal?.type||'LIFECYCLE',value:proposal?.value||input.lifecycle},actor:'JOEY',revision:owner.revision,sourceRefs:[sourceId]});owner.canonicalState=assertProjectState(state);
}
