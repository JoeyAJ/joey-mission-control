// Neither environment variables, browser catalog nor registration can enable this.
// Source review, exact SQL approval and per-project grants are still required.
// Joey approved live source/report scopes for AI_INTERACTIVE_EXPERIENCE_ENGINE on 2026-10-15.
// Each project still needs its own row in mc_private.explicit_project_scope_grants.
export const projectRuntimeActivation=Object.freeze({enabled:true,qualification:'OWNER_EXPLICIT_PROJECT_RUNTIME_APPROVED',approvalRef:'joey-20261015-ai-engine-live'});
export const existingProjectIds=Object.freeze(['MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
export function projectRuntimeEnabled(v=projectRuntimeActivation){return v?.enabled===true&&v.qualification==='OWNER_EXPLICIT_PROJECT_RUNTIME_APPROVED'&&/^[A-Za-z0-9_-]{1,80}$/.test(v.approvalRef||'');}
