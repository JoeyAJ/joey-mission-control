// Authored synthetic Owner/source data and actual local Git objects only.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createProjectDraft,projectBootstrapPacket} from '../../src/onboarding/project-draft.mjs';
import {REGISTRATION_FILES,contentDigest,registrationError} from '../../src/onboarding/project-registration-contract.mjs';
import {registrationCatalogTarget} from '../../src/onboarding/project-registration-config.mjs';
import {emptyRegistrationLedger,REGISTRY_PATH,INDEX_PATH,LEDGER_PATH} from '../../src/onboarding/project-registration-catalog.mjs';
import {createRegistrationGitPort,createAtomicGitRegistryWriter} from '../../src/onboarding/project-registration-git.mjs';
import {createProjectRegistrationServer} from '../../src/onboarding/project-registration-server.mjs';

export const REGISTRATION_TEST_OWNER='11111111-1111-4111-8111-111111111111';
export const registrationTestActivation={enabled:true,qualification:'OWNER_PRIVATE_GIT_CATALOG_APPROVED',approvalRef:'synthetic-local-approval',ownerNamespace:'JoeyAJ',destination:registrationCatalogTarget};
export const gitBlob=content=>{const b=Buffer.from(content);return createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');};
export async function registrationGitFixture({now=Date.parse('2026-10-12T13:00:00.000Z'),project={}}={}) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mc-registration-native-'));await fs.chmod(root,0o700);
 const env={...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_AUTHOR_NAME:'Synthetic Registry',GIT_AUTHOR_EMAIL:'synthetic@example.invalid',GIT_COMMITTER_NAME:'Synthetic Registry',GIT_COMMITTER_EMAIL:'synthetic@example.invalid'};
 const git=(args,input,extra={})=>execFileSync('git',args,{cwd:root,env:{...env,...extra},input,encoding:'utf8'}).trim();
 git(['init','-b','mc/registry']);
 const initial={[REGISTRY_PATH]:'# Synthetic private registry\n',[INDEX_PATH]:'# Synthetic private index\n## Production Development Registry\n| Project | Memory | Current State | Canonical Local Master |\n|---|---|---|---|\n\n## Systems Registry\n| System | Memory | Current State | Canonical Local Master |\n|---|---|---|---|\n',[LEDGER_PATH]:JSON.stringify(emptyRegistrationLedger(),null,2)+'\n','vercel.json':'{"git":{"deploymentEnabled":false}}\n'};
 for(const [p,c] of Object.entries(initial)){await fs.mkdir(path.dirname(path.join(root,p)),{recursive:true});await fs.writeFile(path.join(root,p),c,{mode:0o600});}
 git(['add','.']);git(['commit','-m','Synthetic data-only catalog']);
 const state={clock:now,actor:{subject:REGISTRATION_TEST_OWNER,role:'OWNER',aal:'aal2',verified:true,sessionActive:true,expiresAt:now+60000},commits:0,requests:[],dropAck:false,mutate:null,drafts:[],sourceSha:'a'.repeat(40)};
 const draft=createProjectDraft({projectId:'SYNTHETIC_IMPORT',name:'Private import / 私人匯入 / 비공개 가져오기',idea:'Synthetic original private Owner idea.',acceptance:'Preserve exact original idea; private registration is not delivery.',repositoryId:'JoeyAJ/synthetic-import-fixture',branch:'development',environment:'BACKEND_REQUIRED',deployment:'REQUIRED',previewUrl:'',...project},{draftId:'draft_'+'a'.repeat(24),now});
 state.drafts=[draft];
 const contents={...projectBootstrapPacket(draft,{now}).files,'.mission-control/source-profile.json':JSON.stringify({schemaVersion:'mc.source-profile.v1',profiles:[{projectId:draft.project.projectId,track:'BASELINE',repositoryId:draft.project.repositoryId,ref:draft.project.branch,path:'HANDOFF.md',contextPaths:['PRD.md','README.md','docs/PRODUCT_CHARTER.md','docs/PHASE_PLAN.md']}]})};
 const fetchImpl=async(target,options={})=>{
  const u=new URL(target);if(u.origin!=='https://api.github.com')throw Error('NO_EXTERNAL_NETWORK');state.requests.push({method:options.method||'GET',path:u.pathname});let data;
  const repoPrefix='/repos/'+registrationCatalogTarget.repositoryId;
  if(u.pathname===repoPrefix)data={id:registrationCatalogTarget.repositoryNumericId,full_name:registrationCatalogTarget.repositoryId,private:false,visibility:'public',archived:false,disabled:false};
  else if(u.pathname===repoPrefix+'/git/ref/heads/mc/registry')data={object:{type:'commit',sha:git(['rev-parse','refs/heads/mc/registry'])}};
  else if(u.pathname.startsWith(repoPrefix+'/git/commits/')){const sha=u.pathname.split('/').at(-1);data={sha,tree:{sha:git(['rev-parse',sha+'^{tree}'])}};}
  else if(u.pathname.startsWith(repoPrefix+'/git/trees/')){const sha=u.pathname.split('/').at(-1),raw=git(['ls-tree','-z',sha]);data={sha,truncated:false,tree:raw?raw.split('\0').filter(Boolean).map(row=>{const [meta,name]=row.split('\t'),[mode,type,sha]=meta.split(' ');return {path:name,mode,type,sha};}):[]};}
  else if(u.pathname.startsWith(repoPrefix+'/contents/')){const p=u.pathname.slice((repoPrefix+'/contents/').length),ref=u.searchParams.get('ref'),sha=git(['rev-parse',ref+':'+p]),content=git(['cat-file','blob',sha]);const raw=execFileSync('git',['cat-file','blob',sha],{cwd:root,env});data={type:'file',path:p,size:raw.length,encoding:'base64',content:raw.toString('base64'),sha};}
  else if(u.pathname==='/graphql'){
   const input=JSON.parse(options.body).variables.input,head=git(['rev-parse','refs/heads/mc/registry']);
   if(input.branch.repositoryNameWithOwner!==registrationCatalogTarget.repositoryId||input.branch.refName!=='mc/registry')throw Error('OUTSIDE_CATALOG_SCOPE');
   if(head!==input.expectedHeadOid)data={errors:[{type:'STALE_DATA'}]};
   else{const index=path.join(root,'fixture-index-'+state.commits),extra={GIT_INDEX_FILE:index};git(['read-tree',head],undefined,extra);for(const file of input.fileChanges.additions){const blob=git(['hash-object','-w','--stdin'],Buffer.from(file.contents,'base64'));git(['update-index','--add','--cacheinfo','100644',blob,file.path],undefined,extra);}const tree=git(['write-tree'],undefined,extra),commit=git(['commit-tree',tree,'-p',head],input.message.headline+'\n');try{git(['update-ref','refs/heads/mc/registry',commit,head]);}catch{return new Response(JSON.stringify({errors:[{type:'STALE_DATA'}]}));}state.commits++;data={data:{createCommitOnBranch:{commit:{oid:commit},ref:{target:{oid:commit}}}}};if(state.dropAck){state.dropAck=false;throw Error('SIMULATED_REPLY_LOSS_AFTER_COMMIT');}}
  }else throw Error('UNEXPECTED_GIT_PATH');
  state.mutate?.(u,data);return new Response(JSON.stringify(data));
 };
 const port=createRegistrationGitPort({credential:'synthetic-local-git-credential',activation:registrationTestActivation,ownerSubject:REGISTRATION_TEST_OWNER,fetchImpl,sourceQualification:'LOCAL_GIT_FIXTURE'});
 const sourceReader={configured:true,async inspectIdentity(){return{id:23456789,full_name:draft.project.repositoryId,private:true,visibility:'private',archived:false,disabled:false};},async resolveRevision(){return{commitSha:state.sourceSha};},async readFile({path:p,commitSha}){const content=contents[p],blobId=gitBlob(content);return{status:'FOUND',entryType:'file',content,blobId,commitSha,gitTreeEntry:{path:p,mode:'100644',blobId,commitSha}};}};
 const draftPort={async call(){return{schemaVersion:1,qualification:'OWNER_PRIVATE_DRAFTS',drafts:state.drafts};}};
 const head=()=>git(['rev-parse','refs/heads/mc/registry']);
 const request={schemaVersion:'mc.project-registration.v1',mode:'IMPORT_EXISTING_PRIVATE_REPOSITORY',requestId:'synthetic-native-import',draftId:draft.draftId,draftRevision:draft.revision,projectId:draft.project.projectId,repositoryId:draft.project.repositoryId,repositoryNumericId:23456789,ref:draft.project.branch,baselineSha:state.sourceSha,expectedRegistryDigest:contentDigest(initial[REGISTRY_PATH]),expectedIndexDigest:contentDigest(initial[INDEX_PATH]),files:Object.fromEntries(REGISTRATION_FILES.map(p=>[p,contentDigest(contents[p])])),resources:{backend:null,deployment:null}};
 const policy={qualification:'EXACT_PRIVATE_PROJECT_REGISTRATION_POLICY',ownerSubject:REGISTRATION_TEST_OWNER,approvalRef:'synthetic-local-approval',expiresAt:now+60000,target:Object.fromEntries(['draftId','draftRevision','projectId','repositoryId','repositoryNumericId','ref','baselineSha','expectedRegistryDigest','expectedIndexDigest','files','resources'].map(k=>[k,request[k]]))};
 const req={method:'POST',headers:{origin:'https://synthetic.invalid',authorization:'Bearer '+'a'.repeat(40),'content-type':'application/json'},body:request};
 const server=({writer=createAtomicGitRegistryWriter({port,ownerSubject:REGISTRATION_TEST_OWNER,expectedHeadSha:head(),now:()=>state.clock}),...options}={})=>createProjectRegistrationServer({policy,ownerSubject:REGISTRATION_TEST_OWNER,allowedOrigin:'https://synthetic.invalid',verifyOwner:async()=>state.actor,draftPort,repositoryReader:sourceReader,writer,now:()=>state.clock,...options});
 return{root,git,port,state,draft,contents,request,policy,req,server,sourceReader,draftPort,head,fetchImpl,initial,cleanup:()=>fs.rm(root,{recursive:true,force:true})};
}
