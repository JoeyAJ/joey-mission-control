import {bridgeLegacyApproval} from '../project-state/legacy-bridge.mjs';
import {randomUUID} from 'node:crypto';
import {emptyOwner,validOwners,lifecycles,validateBlueprint,validateEvidence,bootstrapReadiness,err} from './model.mjs';
export class ProductService{
 constructor(store){this.store=store;}
 async list(){return this.store.readOnly();}
 async proposal(projectId,input){
 if(!input||Object.keys(input).some(k=>!['type','value','reason'].includes(k))||!['PURPOSE','BLUEPRINT','HUMAN_NEXT_STEP','BOOTSTRAP'].includes(input.type)||typeof input.reason!=='string'||!input.reason.trim())throw err('Proposal type and reason required');
 let proposal;await this.store.update(items=>{const owner=items.find(v=>v.projectId===projectId)||emptyOwner(projectId);proposal={id:randomUUID(),...input,status:'PENDING',basedOnRevision:owner.revision,createdAt:new Date().toISOString()};const updated={...owner,proposals:[...owner.proposals,proposal]};return[...items.filter(v=>v.projectId!==projectId),updated];});return proposal;
 }
 async decide(projectId,input,{canonicalSeed}={}){
 if(!input||input.actor!=='joey'||input.confirmation!==projectId||input.explicitDecision!=='JOEY_APPROVES'||!Number.isInteger(input.expectedRevision)||Object.keys(input).some(k=>!['actor','confirmation','explicitDecision','expectedRevision','lifecycle','proposalId'].includes(k))||Boolean(input.lifecycle)===Boolean(input.proposalId))throw err('Explicit Joey decision and project confirmation required',403);
 let result,approved;await this.store.update(items=>{const owner=items.find(v=>v.projectId===projectId)||emptyOwner(projectId);if(owner.revision!==input.expectedRevision)throw err('Stale owner revision',409);result=structuredClone(owner);if(!result.canonicalState&&canonicalSeed){if(canonicalSeed.id!==projectId||canonicalSeed.metadata.revision!==owner.revision)throw err("Stale canonical seed",409);result.canonicalState=structuredClone(canonicalSeed);}
 if(input.lifecycle){if(!lifecycles.includes(input.lifecycle))throw err('Invalid lifecycle');if((owner.lifecycle==='IDEA'||owner.decisions.some(d=>d.lifecycle==='IDEA'))&&input.lifecycle==='IN_PROGRESS'&&!bootstrapReadiness({...owner,lifecycle:'IN_PROGRESS'}).ready)throw err('Formal development bootstrap incomplete',409);result.lifecycle=input.lifecycle;}
 else {const proposal=result.proposals.find(v=>v.id===input.proposalId&&v.status==='PENDING');if(!proposal)throw err('Pending proposal not found',404);if(proposal.basedOnRevision!==owner.revision)throw err('Proposal is stale',409);const v=proposal.value;
 if(proposal.type==='PURPOSE'){if(!v||Object.keys(v).some(k=>!['originalPurpose','desiredOutcome','successDefinition'].includes(k))||['originalPurpose','desiredOutcome','successDefinition'].some(k=>typeof v[k]!=='string'||!v[k].trim()))throw err('Complete purpose required');result.purpose={...result.purpose,...v,createdAt:result.purpose.createdAt||new Date().toISOString(),lastApprovedRevision:owner.revision+1};}
 if(proposal.type==='BLUEPRINT'){validateEvidence(v?.evidence||[],projectId);validateBlueprint(v?.blueprint,v?.evidence||[]);result.blueprint={projectId,status:'RECORDED',scopeConfirmed:true,weightsConfirmed:true,milestones:v.blueprint.milestones};result.evidence=v.evidence||[];}
 if(proposal.type==='HUMAN_NEXT_STEP'){if(typeof v!=='string'||!v.trim())throw err('Human next step required');result.humanNextStep=v;}
 if(proposal.type==='BOOTSTRAP'){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['repositoryRule','canonicalEntry','handoffEntry','deploymentDecision'].includes(k))||Object.values(v).some(x=>typeof x!=='string'||!x.trim()))throw err('Invalid bootstrap');result.bootstrap=v;}
 proposal.status='APPROVED';approved=proposal;}
 result.revision++;bridgeLegacyApproval(result,input,approved);result.decisions.push({id:randomUUID(),at:new Date().toISOString(),actor:'joey',action:input.lifecycle?'LIFECYCLE':'APPROVE_PROPOSAL',lifecycle:input.lifecycle||null,proposalId:input.proposalId||null});return[...items.filter(v=>v.projectId!==projectId),result];});return result;
 }
}
export {validOwners};
