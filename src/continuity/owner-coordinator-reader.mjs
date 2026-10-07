// Explicit Owner-only journal reads on the existing SDK. No writes or persistence.
const projects=new Set(['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v),integer=v=>Number.isSafeInteger(v)&&v>=0;
const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const safeSummary=v=>typeof v==='string'&&v.length>0&&v.length<=1024&&!/\/(?:Users|home|private|workspace|tmp)\/|Bearer\s|(?:password|token|secret)\s*[:=]|sb_secret_|eyJ[A-Za-z0-9_-]+\.|PRIVATE KEY/i.test(v);
const fail=()=>{throw Error('COORDINATOR_READ_DENIED');};
export async function validateCoordinatorPage(body,{projectId,contextHash,afterRevision,digest}={}){
 if(!exact(body,['schemaVersion','projectId','epoch','baselineSha','contextHash','revision','lastCommittedAt','afterRevision','writerQualification','ownerDecisionEnabled','runtimeConnected','receipts'])||body.schemaVersion!==1||body.projectId!==projectId||body.contextHash!==contextHash||!hash(body.contextHash)||!id(body.epoch)||!/^[a-f0-9]{40}$/.test(body.baselineSha)||!integer(body.revision)||body.revision>10000||!integer(body.lastCommittedAt)||body.afterRevision!==afterRevision||body.writerQualification!=='TOOL_MEDIATED_COORDINATOR_ATTESTATION'||body.ownerDecisionEnabled!==false||body.runtimeConnected!==false||!Array.isArray(body.receipts)||body.receipts.length>50)fail();
 let revision=afterRevision,time=0;const ids=new Set();
 for(const r of body.receipts){
  const c=r.content,op=c?.operation,p=op?.payload;
  if(!exact(r,['revision','operationId','digest','writerId','approvalRef','toolInvocationRef','actualSqlCaller','committedAt','content'])||!integer(r.revision)||r.revision!==revision+1||r.revision>body.revision||!hash(r.digest)||r.writerId!=='nexaeon-coordinator'||!id(r.operationId)||!id(r.approvalRef)||!id(r.toolInvocationRef)||r.actualSqlCaller!=='postgres'||!integer(r.committedAt)||r.committedAt<time||r.committedAt>body.lastCommittedAt||ids.has(r.operationId)||!exact(c,['writerId','approvalRef','summary','operation'])||c.writerId!==r.writerId||c.approvalRef!==r.approvalRef||!safeSummary(c.summary)||!exact(op,['id','epoch','projectId','baselineSha','expectedRevision','kind','payload'])||op.id!==r.operationId||op.projectId!==projectId||op.epoch!==body.epoch||op.baselineSha!==body.baselineSha||op.expectedRevision!==r.revision-1||!id(p?.proposalId))fail();
  if(op.kind==='proposal'){if(!exact(p,['proposalId','contextHash','acceptanceHash','expiresAt'])||p.contextHash!==contextHash||!hash(p.acceptanceHash)||!integer(p.expiresAt)||p.expiresAt<=r.committedAt||p.expiresAt>r.committedAt+86400000)fail();}
  else if(op.kind==='result'){if(!exact(p,['proposalId','resultHash','evidenceHashes','qualification'])||!hash(p.resultHash)||!Array.isArray(p.evidenceHashes)||p.evidenceHashes.length<1||p.evidenceHashes.length>16||!p.evidenceHashes.every(hash)||p.qualification!=='SUBMITTER_ATTESTED')fail();}else fail();
  if(await digest(c)!==r.digest)fail();revision=r.revision;time=r.committedAt;ids.add(r.operationId);
 }
 if(body.receipts.length===0&&afterRevision<body.revision)fail();
 return structuredClone(body);
}
export function createOwnerCoordinatorReader({enabled=false,ownerSubject,inspectCurrentOwner,rpc,digest,now=Date.now}={}){
 const configured=enabled===true&&typeof ownerSubject==='string'&&typeof inspectCurrentOwner==='function'&&typeof rpc==='function'&&typeof digest==='function';let generation=0,sequence=0,disposed=false,status=configured?'idle':'unconfigured';
 async function read(projectId,{afterRevision=0}={}){
  const g=generation,s=++sequence,current=()=>{if(disposed||g!==generation||s!==sequence)fail();};
  if(!configured||disposed||!projects.has(projectId)||!integer(afterRevision)||afterRevision>10000)fail();status='reading';
  async function owner(){const a=await inspectCurrentOwner(projectId);current();if(a?.status!=='authenticated'||a.subject!==ownerSubject||a.role!=='OWNER'||a.aal!=='aal2'||a.verified!==true||a.sessionActive!==true||a.memberActive!==true||!a.projects?.includes(projectId)||!integer(a.expiresAt)||a.expiresAt<=now())fail();}
  try{await owner();const scope=await rpc('mc_owner_context_scope',{project:projectId});current();if(scope.error||!exact(scope.data,['projectId','contextHash'])||scope.data.projectId!==projectId||!hash(scope.data.contextHash))fail();await owner();const result=await rpc('mc_owner_coordinator_receipts',{project:projectId,after_revision:afterRevision,page_limit:50});current();if(result.error)fail();const value=await validateCoordinatorPage(structuredClone(result.data),{projectId,contextHash:scope.data.contextHash,afterRevision,digest});current();await owner();current();status='connected';return value;}catch{if(g===generation&&s===sequence)status='denied';fail();}
 }
 return Object.freeze({read,view:()=>({status,configured:configured&&!disposed,privateReadOnly:true,runtimeConnected:false,writerEnabled:false}),invalidate(){generation++;sequence++;status=disposed?'closed':configured?'idle':'unconfigured';},dispose(){disposed=true;generation++;sequence++;status='closed';}});
}
