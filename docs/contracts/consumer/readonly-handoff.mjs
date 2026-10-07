// Filtered read-only continuation context; never an execution/write authorization.
const projects=new Set(['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
const claims=['purpose','stage','lastConfirmedCompletion','nextAction','blockerApproval','approvalSource','latestTrustedBaseline'];
export function readonlyHandoff(view){
 if(!projects.has(view?.projectId))throw Error('Unknown capsule project');
 const evidence=Object.fromEntries(claims.map(key=>{const c=view.claimEvidence?.[key];return [key,c?{value:structuredClone(c.value),verificationStatus:c.verificationStatus||'UNKNOWN',sourceRefs:[...(c.sourceRefs||[])],missingReason:c.missingReason||null,eventTime:view.claimSources?.[key]?.asOf??null}:{value:null,verificationStatus:'UNKNOWN',sourceRefs:[],missingReason:'NOT_SUPPLIED_BY_PRODUCER',eventTime:null}];}));
 const result={schemaVersion:'mc.readonly-handoff.v1',projectId:view.projectId,sourceMode:'PRIVATE_FILTERED_SNAPSHOT',qualification:'PRODUCER_SOURCE_QUALIFIED_RECORD_NOT_CURRENT_REMOTE_INSPECTION',versions:{sourceRevision:view.sourceRevision??null,sourceTimestamp:view.sourceTimestamp??null,extractedAt:view.extractedAt??null,consumerReadAt:view.readAt??null,ownerRevision:view.ownerCanonicalState?.metadata?.revision??null},evidence,
  missions:(view.ownerCanonicalState?.missions||[]).map(m=>({id:m.id,title:m.title,status:m.status,sourceRefs:[...(m.sourceRefs||[])],dependencies:[...(m.dependencies||[])],createdAt:m.createdAt,updatedAt:m.updatedAt})),
  missionTimes:'OWNER_RECORD_CREATION_UPDATE_NOT_EXECUTION',actor:null,model:null,runtimeConnected:false,authorityCutover:false,remoteReverified:false,automaticExecution:false,permissionGrant:false,
  continuationChecks:['Reconcile snapshot baseline with approved project remote/source before dependent work','Preserve per-claim qualification and existing Joey final approval','Establish named per-store writer authority before canonical result writeback'],
  resultRequirements:['sourceRefs','verified completion evidence','selected baseline SHA','expected canonical owner revision','Joey final approval where required']};
 if(new TextEncoder().encode(JSON.stringify(result)).length>65536)throw Error('Capsule size exceeded');return result;
}
