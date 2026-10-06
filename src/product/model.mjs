import {validCanonicalState} from '../project-state/model.mjs';
export const lifecycles=['IDEA','PLANNING','IN_PROGRESS','PAUSED','COMPLETED','ARCHIVED'];
export const itemStatuses=['NOT_STARTED','IN_PROGRESS','AWAITING_ACCEPTANCE','COMPLETED','OPTIONAL','DEFERRED','AWAITING_JOEY_CONFIRMATION'];
export const evidenceTypes=['GIT_COMMIT','HANDOFF','TEST_RESULT','DEPLOYMENT','JOEY_ACCEPTANCE','DOCUMENT'];
const err=(message,status=400)=>Object.assign(new Error(message),{status});
export function validateBlueprint(blueprint,evidence=[]){
 if(!blueprint||!Array.isArray(blueprint.milestones))throw err('Blueprint milestones required');
 const ids=new Set(),refs=new Map(evidence.map(e=>[e.id,e]));
 for(const m of blueprint.milestones){if(!m||typeof m.id!=='string'||ids.has(m.id)||typeof m.title!=='string'||!m.title.trim()||typeof m.humanDescription!=='string'||!m.humanDescription.trim()||!itemStatuses.includes(m.status)||!Number.isFinite(m.weight)||m.weight<=0||!Array.isArray(m.features))throw err('Invalid milestone');ids.add(m.id);
 for(const f of m.features){if(!f||typeof f.id!=='string'||ids.has(f.id)||typeof f.title!=='string'||!f.title.trim()||typeof f.humanDescription!=='string'||!f.humanDescription.trim()||!itemStatuses.includes(f.status)||!Number.isFinite(f.weight)||f.weight<=0||!Array.isArray(f.evidenceRefs)||f.evidenceRefs.some(v=>typeof v!=='string'))throw err('Invalid feature');ids.add(f.id);
 if(f.status==='COMPLETED'&&!f.evidenceRefs.some(id=>{const e=refs.get(id);return e?.blueprintItemId===f.id&&e.verificationStatus==='VERIFIED'&&e.verifiedAt&&e.reference&&(e.type==='JOEY_ACCEPTANCE'||e.verificationScope==='RECORDED_APPROVED_PHASE_PUBLICATION');}))throw err('Completed feature requires verified evidence');}
 if(m.status==='COMPLETED'&&(!m.features.length||m.features.some(f=>!['COMPLETED','OPTIONAL','DEFERRED'].includes(f.status))))throw err('Completed milestone requires verified completed features');
 }
 return true;
}
// Optional/deferred work is outside the agreed denominator. No guessed partial credit.
export function blueprintProgress(blueprint){
 if(blueprint?.scopeConfirmed===false||blueprint?.weightsConfirmed===false||['PARTIALLY_CONFIRMED','AWAITING_JOEY_CONFIRMATION','AWAITING_RECONSTRUCTION'].includes(blueprint?.status)||(blueprint?.milestones||[]).some(m=>m.status==='AWAITING_JOEY_CONFIRMATION'||m.features?.some(f=>f.status==='AWAITING_JOEY_CONFIRMATION')))return null;
 const milestones=(blueprint?.milestones||[]).filter(m=>!['OPTIONAL','DEFERRED'].includes(m.status));
 let total=0,done=0;for(const m of milestones){const fs=m.features.filter(f=>!['OPTIONAL','DEFERRED'].includes(f.status));if(!fs.length)continue;const weight=fs.reduce((n,f)=>n+f.weight,0);if(weight<=0)continue;total+=m.weight;done+=m.weight*fs.filter(f=>f.status==='COMPLETED').reduce((n,f)=>n+f.weight,0)/weight;}
 return total?Math.round(done/total*100):null;
}
export function bootstrapReadiness(project){
 if(project.lifecycle==='IDEA')return{required:false,ready:true,missing:[]};
 const required={projectId:project.projectId,originalPurpose:project.purpose?.originalPurpose,desiredOutcome:project.purpose?.desiredOutcome,successDefinition:project.purpose?.successDefinition,initialBlueprint:project.blueprint?.milestones?.length,repositoryRule:project.bootstrap?.repositoryRule,canonicalEntry:project.bootstrap?.canonicalEntry,handoffEntry:project.bootstrap?.handoffEntry,deploymentDecision:project.bootstrap?.deploymentDecision};
 const missing=Object.entries(required).filter(([,v])=>!v).map(([k])=>k);return{required:true,ready:missing.length===0,missing};
}
export function emptyOwner(projectId){return{projectId,revision:0,lifecycle:null,purpose:{projectId,originalPurpose:null,desiredOutcome:null,successDefinition:null,createdAt:null,lastApprovedRevision:null},blueprint:{projectId,status:'AWAITING_RECONSTRUCTION',milestones:[]},humanNextStep:null,evidence:[],proposals:[],decisions:[],bootstrap:{}};}
export const validOwners=items=>Array.isArray(items)&&items.every(v=>typeof v.projectId==='string'&&Number.isInteger(v.revision)&&v.purpose&&Array.isArray(v.blueprint?.milestones)&&Array.isArray(v.evidence)&&Array.isArray(v.proposals)&&Array.isArray(v.decisions)&&(v.lifecycle===null||lifecycles.includes(v.lifecycle))&&(!v.canonicalState||validCanonicalState(v.canonicalState)&&v.canonicalState.id===v.projectId&&v.canonicalState.metadata.revision===v.revision));
export function validateEvidence(evidence,projectId){if(!Array.isArray(evidence))throw err('Evidence array required');const ids=new Set();for(const e of evidence){if(!e||typeof e.id!=='string'||ids.has(e.id)||e.projectId!==projectId||typeof e.blueprintItemId!=='string'||!evidenceTypes.includes(e.type)||typeof e.reference!=='string'||!e.reference||!['VERIFIED','UNVERIFIED','REJECTED'].includes(e.verificationStatus)||(e.verificationStatus==='VERIFIED'&&(!e.verifiedAt||!Number.isFinite(Date.parse(e.verifiedAt)))))throw err('Invalid evidence');ids.add(e.id);}}
export {err};
