// Neither environment variables, browser catalog nor registration can enable this.
// Source review, exact SQL approval and per-project grants are still required.
export const projectRuntimeActivation=Object.freeze({enabled:false,qualification:'LOCAL_REVIEW_RUNTIME_AUTHORIZATION_PENDING',approvalRef:null});
export const existingProjectIds=Object.freeze(['MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
export function projectRuntimeEnabled(v=projectRuntimeActivation){return v?.enabled===true&&v.qualification==='OWNER_EXPLICIT_PROJECT_RUNTIME_APPROVED'&&/^[A-Za-z0-9_-]{1,80}$/.test(v.approvalRef||'');}
