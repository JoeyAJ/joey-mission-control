import {missingOrUnverified} from './control-semantics.js';
const known=v=>typeof v==='string'&&!missingOrUnverified(v),safe=v=>known(v)&&!/\/Users\/|\/home\/|\/private\/|Bearer\s|gh[pousr]_|sk-[A-Za-z0-9]|PRIVATE KEY/.test(v)?v:null;
export function phaseSummary(p,m,{records={},handoffs=[],readOnly=false}={}){
 const c=records[p.id],complete=handoffs.filter(h=>h?.entityId===p.id&&!h.conflict&&/^(SUCCESS|COMPLETED|DONE)$/i.test(h.status||'')).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)).at(-1);
 const match=!!c&&c.stageFingerprint===p.currentStage?.source?.fingerprint;
 const newer=complete&&Date.parse(complete.timestamp)>Date.parse((c?.stageDate||'1970-01-01')+'T23:59:59Z');
 const stage=match&&!newer?c.stage:complete?.task||safe(p.currentStage?.value);
 // An explicit latest result outranks a user-confirmed older stage. A missing latest identity stays missing.
 const actor=complete?safe(complete.executedBy):match?safe(c.lastAgent?.value):null;
 const model=complete?safe(complete.model):null;
 const actorSource=complete?{kind:'validated_stage_handoff',eventDate:complete.timestamp,fingerprint:complete.fingerprint||null}:actor?c.lastAgent.source:null;
 const purpose=m.product?.purpose?.originalPurpose||m.product?.documentedPurpose||m.canonicalState?.missionStatement||null;
 const source=complete?.source||p.currentStage?.source;
 const production=safe(m.canonical_source?.production_url),repo=safe(m.canonical_source?.repository);
 const url=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
 const nextMatch=match&&c.nextFingerprint===p.nextAction?.source?.fingerprint;
 return {projectId:p.id,purpose,stage:safe(stage),stageDate:complete?.timestamp||p.currentStage?.source?.asOf||null,lastDevelopmentAgent:actor,lastDevelopmentModel:model,lastAgentSource:actorSource,agentMissingReason:complete?'最新階段 handoff 缺 Executed by／Agent 欄位；下次由執行 Agent 在交接中補上。':'最新階段沒有可追溯的開發 Agent 記錄；由下一次交接補上，不能從 Git 作者推測。',modelMissingReason:'最新階段 handoff 未記錄實際 Model；未提供時明記原因，不能猜模型。',nextStage:newer?safe(complete.nextAction):nextMatch?safe(c.next):safe(p.nextAction?.value),nextStageDate:p.nextAction?.source?.asOf||null,latestResult:{url:url(production)||url(repo),kind:url(production)?'PRODUCTION':'REPOSITORY',verification:'成果檢查入口；不等於本次重新驗證部署版本。'},handoff:{kind:complete?'FORMAL_STAGE_HANDOFF':'VERIFIED_STAGE_MEMORY',reference:readOnly?null:complete?.sourcePath?'HANDOFF/HISTORY/'+complete.sourcePath.split('/').at(-1):'CURRENT_STATE / NEXT_ACTIONS',fingerprint:source?.fingerprint||complete?.fingerprint||null,eventTime:complete?.timestamp||source?.asOf||null},repository:safe(repo),branch:safe(m.canonical_source?.branch),baseline:safe(m.canonical_source?.baseline_sha),conflicts:(m.operations?.conflicts||[]).map(c=>safe(c.summary)).filter(Boolean),readOnly,continuity:'Project memory and stage handoff; independent of Agent/model',readAt:m.runtime?.lastSyncedAt||null};
}
export function lastAgentGroups(projects){const groups=new Map();for(const m of projects){const actor=m.phase?.lastDevelopmentAgent||null,key=actor||'UNRECORDED';if(!groups.has(key))groups.set(key,{agent:actor,projects:[]});groups.get(key).projects.push({id:m.project_id,name:m.product?.name||m.name,date:m.phase?.stageDate||null});}return [...groups.values()];}
