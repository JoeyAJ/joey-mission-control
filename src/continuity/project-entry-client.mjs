// Same-origin Owner metadata transport. No repository content reader or dispatch.
const projects=['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'];
const sha=/^[a-f0-9]{40}$/;
export function validateProjectEntryReply(reply,project,now=Date.now()){
 const e=reply?.entry;if(reply?.schemaVersion!==1||reply.privateReadOnly!==true||reply.qualification!=='OWNER_CONNECTOR_SNAPSHOT_READ'||!Number.isSafeInteger(reply.expiresAt)||reply.expiresAt<=now||!projects.includes(project)||e?.projectId!==project||e.qualification!=='CONNECTOR_VERIFIED_SOURCE_SNAPSHOT'||e.websiteRepositoryReadable!==false||e.websiteContentIncluded!==false||e.executionAuthorized!==false||!sha.test(e.commitSha)||!Number.isFinite(Date.parse(e.observedAt))||e.lastDeveloper?.agent!==null||e.lastDeveloper.qualification!=='NOT_EXPLICITLY_RECORDED')throw Error('PROJECT_ENTRY_RESPONSE_INVALID');
 const repositories={NEXAEON:'JoeyAJ/nexaeon-web',WOOSONG_BUDDY:'JoeyAJ/woosongbuddy',NAMYOUNG_WEB3D:'JoeyAJ/namyoung-web3d',JOEY_ASSET_SYSTEM:'JoeyAJ/joey-asset-system'};
 if(e.repositoryId!==repositories[project]||e.branch!=='main'||!Array.isArray(e.documents)||e.documents.length>12||!Array.isArray(e.branches)||e.branches.length>4)throw Error('PROJECT_ENTRY_RESPONSE_INVALID');
 const documents=[...e.documents,...e.branches.flatMap(b=>{if(!sha.test(b.commitSha)||typeof b.name!=='string'||!/^[A-Za-z0-9_/-]{1,100}$/.test(b.name))throw Error('PROJECT_ENTRY_RESPONSE_INVALID');return b.documents||[];})];
 for(const d of documents)if(typeof d.path!=='string'||d.path.length>240||!/^([A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$/.test(d.path)||d.path.split('/').some(p=>p==='.'||p==='..')||!d.path.endsWith('.md')||!sha.test(d.blobId)||d.qualification!=='CONNECTOR_PINNED_FILE_READ')throw Error('PROJECT_ENTRY_RESPONSE_INVALID');
 return reply;
}
export const projectEntryUrl=(entry,path,commitSha=entry.commitSha)=>'https://github.com/'+entry.repositoryId+'/blob/'+commitSha+'/'+path;
export function projectEntryInstructions(e){
 const lines=['Continue '+e.projectId+' using your own existing authorized access to private repository '+e.repositoryId+'.',
  'Resolve current branch HEAD first. Observed branch '+e.branch+' at '+e.commitSha+' ('+e.observedAt+'); authority: '+e.authority.qualification+'. This is a connector-verified snapshot, not live website repository access.',
  'Entry: '+projectEntryUrl(e,e.entryPath)+'. Root HANDOFF.md was missing at the observed SHA. Read the verified entry/context documents at the resolved version; reconcile changed or missing facts before dependent work.',
  ...e.documents.map(d=>d.kind+': '+projectEntryUrl(e,d.path)+' (observed Git blob '+d.blobId+').'),
  'Last development Agent: not explicitly recorded. Do not infer it from a Git author, tooling reference or the product Agent/model.',
  'Recorded source/version: '+e.version+'. Status: '+e.status+'. Known next steps: '+e.nextSteps,
  ...e.notes];
 for(const b of e.branches){lines.push('Separate branch '+b.name+' at '+b.commitSha+': '+b.qualification+'. '+(b.version||''));for(const d of b.documents||[])lines.push(d.kind+': '+projectEntryUrl(e,d.path,b.commitSha)+' (observed Git blob '+d.blobId+').');}
 lines.push('Keep accepted baseline, separate candidates and historical context distinct. This instruction does not authorize deployment, SQL, new permissions, model execution or destructive actions. Report missing access or context precisely.',
  'After already authorized development, run appropriate tests and update the real project handoff with the actual development Agent, timestamp, exact source/version, completed changes, tests, blockers, acceptance state and next steps. Preserve history; unknown remains unknown.');
 return lines.join('\n\n');
}
export function createProjectEntryClient({getAccessToken,fetchImpl=globalThis.fetch,origin=globalThis.location?.origin,now=Date.now}={}){
 if(globalThis.location?.origin&&origin!==globalThis.location.origin)throw Error('SAME_ORIGIN_TRANSPORT_REQUIRED');
 return Object.freeze({async read(project,{signal}={}){if(!projects.includes(project))throw Error('PROJECT_ENTRY_SCOPE_DENIED');const token=await getAccessToken();if(typeof token!=='string'||!/^[A-Za-z0-9_.-]{20,8192}$/.test(token))throw Error('OWNER_AUTHENTICATION_REQUIRED');
  const url=new URL('/api/private/project-entry',origin);url.searchParams.set('project',project);const response=await fetchImpl(url,{method:'GET',headers:{Authorization:'Bearer '+token},credentials:'same-origin',cache:'no-store',redirect:'error',signal});
  if(!response.ok){const error=Error(response.status===401||response.status===403?'OWNER_AUTHORIZATION_DENIED':'PRIVATE_ENTRY_UNAVAILABLE');error.status=response.status;throw error;}return validateProjectEntryReply(await response.json(),project,now());
 }});
}
