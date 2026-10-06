// Shared pure selectors. These outputs are transient views, never persisted facts.
export const PROJECT_LIFECYCLES=['IDEA','PLANNING','DEVELOPING','PAUSED','COMPLETED','ARCHIVED','UNKNOWN'];
export const MISSION_STATUSES=['NOT_STARTED','IN_PROGRESS','WAITING','WAITING_JOEY','BLOCKED','COMPLETED','PAUSED','UNKNOWN'];
const ordered=state=>[...state.missions].sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
export const derivePendingDecisions=state=>state.decisions.filter(d=>d.status==='OPEN');
function effectiveStatus(state,mission){
 if(['COMPLETED','PAUSED','BLOCKED','UNKNOWN'].includes(mission.status))return mission.status;
 return derivePendingDecisions(state).some(d=>d.missionId===mission.id&&d.blocksMission)?'WAITING_JOEY':mission.status;
}
export function deriveCurrentMission(state){
 const missions=ordered(state).map(m=>({...m,effectiveStatus:effectiveStatus(state,m)}));
 for(const status of ['IN_PROGRESS','BLOCKED','WAITING','WAITING_JOEY','NOT_STARTED']){const mission=missions.find(m=>m.effectiveStatus===status);if(mission)return{status:'CURRENT',mission,source:'SYSTEM_DERIVED'};}
 return{status:missions.length&&missions.every(m=>m.status==='COMPLETED')?'COMPLETE':'UNKNOWN',mission:null,source:'SYSTEM_DERIVED'};
}
export function deriveBlueprint(state){
 const out={total:state.missions.length,completed:0,inProgress:0,waiting:0,blocked:0,notStarted:0,paused:0,unknown:0,percentage:null,reliability:'PARTIAL',source:'SYSTEM_DERIVED'};
 const keys={COMPLETED:'completed',IN_PROGRESS:'inProgress',WAITING:'waiting',WAITING_JOEY:'waiting',BLOCKED:'blocked',NOT_STARTED:'notStarted',PAUSED:'paused',UNKNOWN:'unknown'};
 for(const m of state.missions)out[keys[effectiveStatus(state,m)]||'unknown']++;
 if(state.metadata.missionSetReliability==='CONFIRMED'&&out.total>0&&out.unknown===0){out.percentage=Math.round(out.completed/out.total*100);out.reliability='CONFIRMED';}else if(!out.total)out.reliability='UNKNOWN';return out;
}
export function deriveNextWaypoint(state){
 const explicit=state.nextActions.filter(a=>a.status==='OPEN'&&a.confirmed).sort((a,b)=>(b.source==='JOEY')-(a.source==='JOEY')||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0];
 if(explicit)return{kind:'EXPLICIT',id:explicit.id,title:explicit.title,description:explicit.description,missionId:explicit.missionId,source:explicit.source,sourceRefs:explicit.sourceRefs};
 const current=deriveCurrentMission(state).mission;
 const dependency=current?.dependencies.map(id=>state.missions.find(m=>m.id===id)).find(m=>m&&m.status!=='COMPLETED');
 if(dependency)return{kind:'DEPENDENCY',id:dependency.id,title:dependency.title,description:dependency.description,missionId:dependency.id,source:'SYSTEM_DERIVED',sourceRefs:dependency.sourceRefs};
 const next=ordered(state).find(m=>effectiveStatus(state,m)==='NOT_STARTED');
 if(next)return{kind:'MISSION',id:next.id,title:next.title,description:next.description,missionId:next.id,source:'SYSTEM_DERIVED',sourceRefs:next.sourceRefs};
 const decision=derivePendingDecisions(state)[0];if(decision)return{kind:'DECISION',id:decision.id,title:decision.title,description:decision.description,missionId:decision.missionId,source:'SYSTEM_DERIVED',sourceRefs:decision.sourceRefs};
 return{kind:'UNKNOWN',id:null,title:null,description:null,missionId:null,source:'SYSTEM_DERIVED',sourceRefs:[]};
}
export function deriveMissionPath(state){const current=deriveCurrentMission(state).mission?.id;return ordered(state).map(m=>({...m,effectiveStatus:effectiveStatus(state,m),current:m.id===current}));}
export function deriveProjectSummary(state){return{projectId:state.id,lifecycle:state.lifecycle,current:deriveCurrentMission(state),blueprint:deriveBlueprint(state),next:deriveNextWaypoint(state),path:deriveMissionPath(state),decisions:derivePendingDecisions(state),pendingDecisionCount:derivePendingDecisions(state).length,confirmationCount:state.confirmationQueue.filter(c=>c.status==='OPEN').length,source:'SYSTEM_DERIVED'};}
const labels={
 'zh-TW':{unknown:'尚未確認',complete:'專案任務航線已完成',partial:'資料不完整',status:{IDEA:'想法',PLANNING:'規劃中',ARCHIVED:'封存',NOT_STARTED:'尚未開始',IN_PROGRESS:'開發中',COMPLETED:'完成',WAITING:'等待中',WAITING_JOEY:'待 Joey 決定',BLOCKED:'阻塞',PAUSED:'暫停',UNKNOWN:'尚未確認',DEVELOPING:'開發中'}},
 en:{unknown:'Unconfirmed',complete:'Project mission path complete',partial:'Partial data',status:{IDEA:'Idea',PLANNING:'Planning',ARCHIVED:'Archived',NOT_STARTED:'Not started',IN_PROGRESS:'In progress',COMPLETED:'Completed',WAITING:'Waiting',WAITING_JOEY:'Waiting for Joey',BLOCKED:'Blocked',PAUSED:'Paused',UNKNOWN:'Unconfirmed',DEVELOPING:'Developing'}},
 ko:{unknown:'미확인',complete:'프로젝트 임무 경로 완료',partial:'자료 불완전',status:{IDEA:'아이디어',PLANNING:'계획 중',ARCHIVED:'보관',NOT_STARTED:'미시작',IN_PROGRESS:'개발 중',COMPLETED:'완료',WAITING:'대기 중',WAITING_JOEY:'Joey 결정 대기',BLOCKED:'차단',PAUSED:'일시 중지',UNKNOWN:'미확인',DEVELOPING:'개발 중'}}
};
export const projectStateLabels=locale=>labels[locale]||labels['zh-TW'];
export function presentCanonicalProject(manifest,locale='zh-TW'){
 const state=manifest.canonicalState;if(!state)return manifest;const d=deriveProjectSummary(state),w=projectStateLabels(locale),original=manifest.product;
 return{...manifest,canonicalState:state,derivedState:d,legacyProduct:original,product:{...original,isCanonicalState:true,name:state.name,revision:state.metadata.revision,lifecycle:state.lifecycle==='UNKNOWN'?null:state.lifecycle==='DEVELOPING'?'IN_PROGRESS':state.lifecycle,lifecycleRecorded:state.lifecycle!=='UNKNOWN',
  purpose:{...original.purpose,originalPurpose:state.provenance.missionStatement.kind==='USER_INPUT'?state.missionStatement:original.purpose.originalPurpose},
  blueprint:{projectId:state.id,status:d.blueprint.reliability==='CONFIRMED'?'RECORDED':'PARTIALLY_CONFIRMED',scopeConfirmed:d.blueprint.reliability==='CONFIRMED',milestones:d.path.map(m=>({id:m.id,title:m.title,humanDescription:m.description,status:m.effectiveStatus,weight:1,features:[],current:m.current,sourceRefs:m.sourceRefs}))},blueprintProgress:d.blueprint.percentage,
  humanCurrentStage:d.current.mission?d.current.mission.title+' · '+(w.status[d.current.mission.effectiveStatus]||w.unknown):d.current.status==='COMPLETE'?w.complete:w.unknown,
  humanNextStep:d.next.title?(d.next.description||d.next.title):w.unknown,workState:d.current.status==='COMPLETE'?'COMPLETED':d.current.mission?.effectiveStatus||'UNKNOWN',reconciliation:{...original.reconciliation,questions:[],nextRequiresJoeyStart:d.next.kind==='DECISION'},canonicalNextKind:d.next.kind,canonicalNextSource:d.next.source,canonicalPendingDecisions:d.pendingDecisionCount,canonicalConfirmations:d.confirmationCount,canonicalBlueprint:d.blueprint}};
}
