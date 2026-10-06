import fs from 'node:fs';
// Curated safe fields only. Never export the private handoff document or ledger.
const data=JSON.parse(fs.readFileSync(new URL('../../deployment/command-source-readouts.json',import.meta.url),'utf8'));
const fields=['projectId','sourceKind','sourceDate','repository','branch','verifiedRemoteSha','stage','recentCompletion','nextAction','limits','identityReason','productionVerification'];
export function commandReadout(projectId,{publicRead=false}={}){
 const record=data.projects.find(r=>r.projectId===projectId);if(!record)return null;
 const out=Object.fromEntries(fields.map(key=>[key,record[key]??null]));
 // Safe receipts contain no live identity, approval request or current task evidence.
 Object.assign(out,{currentTask:null,currentAgent:null,currentModel:null,lastConfirmedActor:null,lastConfirmedModel:null,approvalRequest:null,blocker:null,runtimeConnected:false,provenance:publicRead?{kind:data.provenance.kind,verifiedAt:data.provenance.verifiedAt}:data.provenance});
 return structuredClone(out);
}

export const commandWorkspaceHealth=Object.freeze({candidateAcceptance:'PENDING_JOEY_ACCEPTANCE',candidateBaseline:'8b4945b16a0b23f2e72033aa976fa34f94eabec0',sourceMode:'fixed_curated_receipts',recordedSourcesAsOf:data.provenance.verifiedAt,refreshVerifiesRemote:false,runtimeBridge:'NOT_IMPLEMENTED'});
