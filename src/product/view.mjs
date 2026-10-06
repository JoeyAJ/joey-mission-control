import fs from 'node:fs/promises';
import {emptyOwner,blueprintProgress,bootstrapReadiness} from './model.mjs';
const language=JSON.parse(await fs.readFile(new URL('../../metadata/product-language.v03.json',import.meta.url),'utf8'));
export function productView(p,{owner=null,document=null,runtime=null,publicRead=false}={}){
 const o=owner||emptyOwner(p.id),copy=language.projects[p.id];
 const supported=copy&&document?.source?.fingerprint===copy.purposeFingerprint;
 const nextSupported=copy&&p.nextAction?.source?.fingerprint===copy.nextFingerprint;
 const stageSupported=copy&&p.currentStage?.source?.fingerprint===copy.stageFingerprint;
 const r=!publicRead&&document?.reconciliation?.sourceState==='MATCHED'?document.reconciliation:null;
 const chosenBlueprint=o.blueprint.status==='RECORDED'?o.blueprint:r?.blueprint||o.blueprint;
 const chosenEvidence=o.blueprint.status==='RECORDED'?o.evidence:r?.evidence||o.evidence;
 const purpose=o.purpose.lastApprovedRevision?o.purpose:{...o.purpose,desiredOutcome:r?.desiredOutcome||o.purpose.desiredOutcome};
 const out={schemaVersion:'0.3',projectId:p.id,name:p.name.value,revision:o.revision,lifecycle:o.lifecycle,lifecycleRecorded:!!o.lifecycle,purpose,documentedPurpose:supported?copy.purpose:null,blueprint:chosenBlueprint,blueprintProgress:blueprintProgress(chosenBlueprint),humanCurrentStage:r?{...(stageSupported?copy.stage:{}),'zh-TW':r.humanCurrentStage}:stageSupported?copy.stage:null,humanNextStep:o.humanNextStep||(r?{...(nextSupported?copy.next:{}),'zh-TW':r.humanNextStep}:nextSupported?copy.next:null),technicalNextAction:runtime?.nextAction||null,evidence:chosenEvidence,ownerDecisions:o.decisions,ownerRevisions:o.proposals.filter(v=>v.status==='APPROVED'),proposals:o.proposals.filter(v=>v.status==='PENDING'),bootstrapReadiness:bootstrapReadiness({...o,lifecycle:o.lifecycle}),canonicalProjectId:p.id,sourceMode:publicRead?'verified_release_snapshot':'canonical_projection_with_joey_choices',sourceEvidence:{purpose:supported?document.source:null,stage:stageSupported?p.currentStage.source:null,next:nextSupported?p.nextAction.source:null},governance:'JOEY_OWNED_LOCAL_ATTESTATION'};
 out.reconciliation={result:r?.result||'AWAITING_JOEY_CONFIRMATION',sourceState:r?.sourceState||document?.reconciliation?.sourceState||'SOURCE_UNAVAILABLE',purposeEvidenceStatus:o.purpose.lastApprovedRevision?'CONFIRMED':r?.purposeEvidenceStatus||(supported?'DOCUMENTED_BUT_INCOMPLETE':'NOT_PROVABLE'),purposeRefs:r?.purposeRefs||[],questions:r?.questions||[],coverage:r?.coverage||{},historicalState:r?'HISTORY_INCOMPLETE':'HISTORY_MISSING',nextRequiresJoeyStart:r?.nextRequiresJoeyStart||false};
 out.humanNextStepApproved=o.proposals.some(v=>v.type==='HUMAN_NEXT_STEP'&&v.status==='APPROVED');
 out.workState=runtime?.missionStatus==='Blocked'?'TECHNICAL_BLOCKER':runtime?.missionStatus==='Awaiting Joey approval'?'AWAITING_JOEY_DECISION':runtime?.missionStatus==='Awaiting sync'?'AWAITING_SYNC':runtime?.missionStatus==='Active'?'ACTIVE':'NO_ACTIVE_WORK';
 // The product's next capability is an unstarted owner choice. Planning constraints
 // are retained in Agent runtime; an actual workspace conflict or active blocked mission wins.
 const activeTechnicalBlock=runtime?.missionStatus==='Blocked'&&(runtime?.stateSource==='local_mission_overlay'||p.conflicts?.some(c=>!['git_observation_error','handoff_conflict'].includes(c.kind)));
 if(r?.nextRequiresJoeyStart&&!activeTechnicalBlock&&runtime?.stateSource!=='local_mission_overlay')out.workState='AWAITING_JOEY_DECISION';
 if(publicRead){out.proposals=[];out.sourceEvidence={purpose:null,stage:null,next:null};out.technicalNextAction=null;}return out;
}
