import {validateProjectDraft,projectBootstrapPacket} from './project-draft.mjs';
import {deliveryPolicy} from '../reporting/delivery-evidence.mjs';
import {REPORT_REF} from '../reporting/repository-run-contract.mjs';

// A projection of the existing private draft/bundle and read-only capabilities.
// Targets are proposals. This module confers no access and performs no provisioning.
export function projectCreationPlan(draft,{capabilities=null,source=null,cloud=null,drafts=[],now=Date.now()}={}){
 const d=validateProjectDraft(draft),p=d.project;
 const live=capabilities?.qualification==='CURRENT_OWNER_ONBOARDING_CAPABILITIES'&&capabilities.privateReadOnly===true&&capabilities.expiresAt>now;
 const scopes=live?capabilities.scopes:[],owners=[...new Set(scopes.map(s=>s.repositoryId.split('/')[0]))];
 const namespace=owners.length===1?owners[0]:null,slug=p.projectId.toLowerCase().replaceAll('_','-');
 function target(project){if(project.repositoryId){const [owner,name]=project.repositoryId.split('/');return (namespace&&owner.toLowerCase()===namespace.toLowerCase()?namespace:owner)+'/'+name.toLowerCase();}return namespace?namespace+'/'+project.projectId.toLowerCase().replaceAll('_','-'):null;}
 const repositoryId=target(p),sameRepo=(a,b)=>Boolean(a&&b&&a.toLowerCase()===b.toLowerCase());
 const conflicts=scopes.filter(s=>s.projectId===p.projectId||sameRepo(s.repositoryId,repositoryId)).map(s=>({kind:'REGISTERED_TARGET',projectId:s.projectId,repositoryId:s.repositoryId,ref:s.ref}));
 for(const other of drafts){const v=validateProjectDraft(other);if(v.draftId!==d.draftId&&(v.project.projectId===p.projectId||sameRepo(target(v.project),repositoryId)))conflicts.push({kind:'OTHER_DRAFT',projectId:v.project.projectId,repositoryId:target(v.project),ref:v.project.branch});}
 const reportRef=REPORT_REF,branchConflict=p.branch===reportRef||p.branch.startsWith(reportRef+'/')||reportRef.startsWith(p.branch+'/');
 if(branchConflict)conflicts.push({kind:'REPORT_REF_OVERLAP',projectId:p.projectId,repositoryId,ref:p.branch,reportRef});
 const branchAction='Choose an initial source branch that is neither equal to, an ancestor of, nor a descendant of the reserved report-only '+reportRef+' branch.';
 const repositoryConflict=conflicts.length>0;
 if(p.deployment==='REQUIRED'&&p.previewUrl)for(const s of scopes)for(const track of s.projectId==='JOEY_ASSET_SYSTEM'?['BASELINE','UNIVERSITY_CANDIDATE']:['BASELINE']){
  const policy=deliveryPolicy({projectId:s.projectId,track});if(policy&&new URL(policy.url).origin===new URL(p.previewUrl).origin)conflicts.push({kind:'REGISTERED_DEPLOYMENT',projectId:s.projectId,repositoryId:s.repositoryId,ref:s.ref,track,url:policy.url});
 }
 const deploymentConflict=conflicts.some(c=>c.kind==='REGISTERED_DEPLOYMENT');
 const existing=scopes.find(s=>sameRepo(s.repositoryId,repositoryId)&&s.ref===p.branch);
 const found=Boolean(existing&&source?.qualification==='FRESH_EXISTING_SCOPE_READ'&&source.status==='FOUND'&&source.projectId===existing.projectId&&source.repositoryId===existing.repositoryId&&source.ref===existing.ref&&source.expiresAt>now&&/^[a-f0-9]{40}$/.test(source.commitSha||'')&&Number.isFinite(Date.parse(source.readAt))&&Date.parse(source.readAt)<=now&&Date.parse(source.readAt)>=now-10000);
 const files=Object.keys(projectBootstrapPacket(d,{now}).files),contextPaths=['PRD.md','README.md','docs/PRODUCT_CHARTER.md','docs/PHASE_PLAN.md'];
 const checks=[];const add=(key,status,target,action)=>checks.push({key,status,target,action});
 add('draft',cloud?.selectedConfirmed&&live?'READY':'MISSING_CONFIGURATION',d.draftId+' · v'+d.revision,cloud?.selectedConfirmed&&live?'Current cloud draft freshly confirmed.':'Save this draft in the existing Owner cloud interface; resolve any cloud conflict before preparing again.');
 add('acceptance',p.acceptance?'READY':'MISSING_CONFIGURATION',p.projectId,p.acceptance?'Acceptance criteria recorded.':'Add acceptance criteria in this same draft.');
 add('identity',repositoryConflict?'CONFLICT':repositoryId&&live?'READY':'MISSING_CONFIGURATION',repositoryId||p.projectId,branchConflict?branchAction:repositoryConflict?'Use the existing project or resolve the conflicting draft; do not create or overwrite this target.':repositoryId&&live?'Exact proposed private target derived; existence and authorization remain unconfirmed.':'Repository namespace is unconfigured; record an exact owner/repository in this draft.');
 add('files','READY',files.join(', '),'Reuse the six-file bundle; after exact authorization, bind its pending bootstrap repositoryId to this proposed target before the initial private commit.');
 add('repository',repositoryConflict?'CONFLICT':'MISSING_AUTHORIZATION',repositoryId||'UNCONFIGURED',branchConflict?branchAction:'Obtain explicit private repository creation / initial branch write authority and an authorized existence check; never overwrite an existing repository.');
 add('source',branchConflict?'CONFLICT':'MISSING_AUTHORIZATION',(repositoryId||'UNCONFIGURED')+'@'+p.branch+':HANDOFF.md',branchConflict?branchAction:'Approve this exact project/repository/ref and entry/context document read scope, install its source profile, then verify the actual HEAD/files.');
 add('report',branchConflict?'CONFLICT':'MISSING_AUTHORIZATION',(repositoryId||'UNCONFIGURED')+'@'+reportRef,branchConflict?branchAction:'Approve report-branch writes; initialize the fixed report-only branch with deployments disabled, then register the scope and publish an actual Agent start.');
 add('environment',p.environment==='CODE_ONLY'?'NOT_REQUIRED':'MISSING_CONFIGURATION',p.environment,p.environment==='CODE_ONLY'?'No backend requested in this draft.':'Specify the backend target and its exact authorization; no SQL, credentials or service are created by this plan.');
 add('deployment',p.deployment==='NOT_REQUIRED'?'NOT_REQUIRED':deploymentConflict?'CONFLICT':'MISSING_CONFIGURATION',p.deployment==='NOT_REQUIRED'?'NOT_REQUIRED':'vercel/'+slug+'/preview'+(p.previewUrl?' · '+p.previewUrl:''),deploymentConflict?'This URL belongs to an existing fixed project target; use that project or resolve the target conflict before new-project registration.':'Website not requested or deployment account/project/fixed URL must be confirmed; a typed URL is intent only.');
 if(p.deployment==='REQUIRED')add('deploymentAuthority','MISSING_AUTHORIZATION','vercel/'+slug+'/preview','Approve the exact account/team/project and Preview publish scope before creating or deploying anything.');
 return {schemaVersion:'mc.project-creation-plan.v1',qualification:'PREFLIGHT_ONLY_NOT_PROVISIONED',draftId:d.draftId,draftRevision:d.revision,projectId:p.projectId,
  repository:{repositoryId,initialBranch:p.branch,visibility:'private',qualification:p.repositoryId?'RECORDED_INTENT_ONLY':'DERIVED_PROPOSAL_ONLY',existence:'UNCONFIRMED'},
  initialFiles:files,sourceRegistration:{projectId:p.projectId,repositoryId,ref:p.branch,path:'HANDOFF.md',contextPaths,profilePath:'.mission-control/source-profile.json',status:branchConflict?'CONFLICT':'REQUIRES_EXPLICIT_SCOPE'},
  reportRegistration:{ref:reportRef,directories:['.mission-control/runs/','.mission-control/runs-page-2/'],deploymentEnabled:false,status:branchConflict?'CONFLICT':'NOT_PROVISIONED'},
  deployment:{required:p.deployment==='REQUIRED',provider:p.deployment==='REQUIRED'?'vercel':null,projectName:p.deployment==='REQUIRED'?slug:null,environment:p.deployment==='REQUIRED'?'preview':null,accountOrTeam:null,fixedUrl:p.previewUrl||null,qualification:'RECORDED_OR_DERIVED_INTENT_ONLY'},
  conflicts,existingSourceObservation:found?{commitSha:source.commitSha,readAt:source.readAt}:null,checks,
  planReady:Boolean(live&&cloud?.selectedConfirmed&&p.acceptance&&repositoryId&&!conflicts.length),expiresAt:live?capabilities.expiresAt:null,provisioned:false,developmentReady:false,executionAuthorized:false};
}

export function formatProjectCreationPlan(plan){
 return '建立計畫 / Creation plan — PREFLIGHT_ONLY_NOT_PROVISIONED\n'+JSON.stringify(plan,null,2)+'\n此計畫及離線文件不是已建立、已授權或已開工的專案；先完成所列缺項。\n';
}
