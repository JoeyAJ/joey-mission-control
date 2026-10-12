import {boundedPrivateJsonRequest} from '../continuity/remote-handoff-server.mjs';
import {registrationActivated, registrationCatalogTarget, projectRegistrationActivation, registrationReservedRepositoryIds} from './project-registration-config.mjs';
import {REGISTRY_PATH,INDEX_PATH,LEDGER_PATH,parseRegistrationLedger,validateRegistrationCatalog,CATALOG_LIMIT} from './project-registration-catalog.mjs';
import {registrationMemoryPaths,createLocalProjectRegistryWriter} from './project-registry-writer.mjs';
import {assertIssuedRegistrationReceipt,contentDigest,registrationError} from './project-registration-contract.mjs';

const sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const roots=[REGISTRY_PATH,INDEX_PATH,LEDGER_PATH];
const allowed=p=>roots.includes(p)||/^PROJECTS\/[A-Z][A-Z0-9_]{2,63}\/(?:PROJECT_MEMORY|CURRENT_STATE|NEXT_ACTIONS|ARCHITECTURE|DECISIONS)\.md$/.test(p);
const failure=(code='REGISTRATION_CATALOG_UNAVAILABLE',status=503)=>{throw registrationError(code,status);};
export function createRegistrationGitPort({credential,activation=projectRegistrationActivation,ownerSubject,fetchImpl=globalThis.fetch,sourceQualification='APPROVED_REMOTE_GIT'}={}) {
  const configured=registrationActivated(activation)&&typeof credential==='string'&&credential.length>=20&&!/\s/.test(credential);
  const c=registrationCatalogTarget;
  const request=async(path,{signal,method='GET',body,limit=3145728}={})=>{
    if(!configured)failure('REGISTRATION_NOT_ACTIVATED');
    const result=await boundedPrivateJsonRequest(fetchImpl,path.startsWith('/graphql')?'https://api.github.com/graphql':'https://api.github.com/repos/'+c.repositoryId+path,{method,headers:{Authorization:'Bearer '+credential,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})},signal,limit);
    if(result.status!==200)failure();return result.data;
  };
  const identity=async signal=>{const r=await request('',{signal,limit:65536});if(Number(r.id)!==c.repositoryNumericId||r.full_name!==c.repositoryId||r.private!==true||r.visibility!=='private'||r.archived!==false||r.disabled!==false)failure('REGISTRATION_PRIVATE_IDENTITY_MISMATCH',409);};
  const head=async signal=>{const r=await request('/git/ref/heads/'+c.ref,{signal,limit:65536});if(r.object?.type!=='commit'||!sha(r.object.sha))failure();return r.object.sha;};
  if(!['APPROVED_REMOTE_GIT','LOCAL_GIT_FIXTURE'].includes(sourceQualification))failure('REGISTRATION_PORT_NOT_CONFIGURED');
  return Object.freeze({qualification:'SCOPED_GIT_REGISTRATION_PORT',sourceQualification,configured,
    async readSnapshot({signal,expectedCommitSha}={}) {
      await identity(signal);const headSha=await head(signal);if(expectedCommitSha&&headSha!==expectedCommitSha)failure('REGISTRATION_CATALOG_HEAD_CONFLICT',409);
      const commit=await request('/git/commits/'+headSha,{signal,limit:65536});if(commit.sha!==headSha||!sha(commit.tree?.sha))failure();const trees=new Map();
      const tree=async id=>{if(!trees.has(id))trees.set(id,request('/git/trees/'+id,{signal,limit:262144}));const t=await trees.get(id);if(t.sha!==id||t.truncated!==false||!Array.isArray(t.tree)||t.tree.length>2048)failure('REGISTRATION_GIT_ENTRY_INVALID',409);return t;};
      const read=async path=>{
        if(!allowed(path))failure('REGISTRATION_SCOPE_DENIED',403);let id=commit.tree.sha,entry;const parts=path.split('/');
        for(let i=0;i<parts.length;i++){const matches=(await tree(id)).tree.filter(e=>e.path===parts[i]);if(matches.length!==1||!sha(matches[0].sha))failure('REGISTRATION_GIT_ENTRY_INVALID',409);entry=matches[0];if(i===parts.length-1){if(entry.type!=='blob'||!['100644','100755'].includes(entry.mode))failure('REGISTRATION_GIT_ENTRY_INVALID',409);}else{if(entry.type!=='tree'||entry.mode!=='040000')failure('REGISTRATION_GIT_ENTRY_INVALID',409);id=entry.sha;}}
        const d=await request('/contents/'+path+'?ref='+headSha,{signal,limit:1500000});
        if(d.type!=='file'||d.path!==path||d.sha!==entry.sha||d.target||d.submodule_git_url||d.encoding!=='base64'||typeof d.content!=='string'||!Number.isSafeInteger(d.size)||d.size<1||d.size>(roots.includes(path)?1048576:98304))failure('REGISTRATION_GIT_ENTRY_INVALID',409);
        const encoded=d.content.replace(/\n/g,'');if(!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))failure();const bytes=Buffer.from(encoded,'base64');if(bytes.length!==d.size)failure();
        const {createHash}=await import('node:crypto');if(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex')!==entry.sha)failure('REGISTRATION_GIT_ENTRY_INVALID',409);
        return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      };
      const files={};for(const path of roots)files[path]=await read(path);
      const ledger=parseRegistrationLedger(files[LEDGER_PATH],ownerSubject), memoryPaths=ledger.entries.flatMap(e=>registrationMemoryPaths(e.receipt.projectId));
      for(let i=0;i<memoryPaths.length;i+=4)await Promise.all(memoryPaths.slice(i,i+4).map(async path=>{files[path]=await read(path);}));
      await identity(signal);if(await head(signal)!==headSha)failure('REGISTRATION_CATALOG_HEAD_CONFLICT',409);
      return validateRegistrationCatalog({headSha,files},ownerSubject);
    },
    async commitFiles({expectedHeadSha,projectId,files,signal}) {
      if(!sha(expectedHeadSha))failure('REGISTRATION_REQUEST_INVALID',400);
      const paths=[...roots,...registrationMemoryPaths(projectId)];if(Object.keys(files).length!==8||paths.some(p=>typeof files[p]!=='string'||Buffer.byteLength(files[p])>(roots.includes(p)?1048576:98304)))failure('REGISTRATION_SCOPE_DENIED',403);
      await identity(signal);
      const input={branch:{repositoryNameWithOwner:c.repositoryId,refName:c.ref},expectedHeadOid:expectedHeadSha,fileChanges:{additions:paths.map(path=>({path,contents:Buffer.from(files[path]).toString('base64')})),deletions:[]},message:{headline:'Register verified private project '+projectId}};
      const r=await request('/graphql',{method:'POST',signal,body:{query:'mutation RegisterPrivateProject($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid}ref{target{oid}}}}',variables:{input}},limit:65536});
      if(r.errors?.length)failure(r.errors.some(e=>e.type==='STALE_DATA')?'REGISTRATION_CATALOG_HEAD_CONFLICT':'REGISTRATION_CATALOG_UNAVAILABLE',r.errors.some(e=>e.type==='STALE_DATA')?409:503);
      const result=r.data?.createCommitOnBranch;if(!sha(result?.commit?.oid)||result.ref?.target?.oid!==result.commit.oid)failure();return {commitSha:result.commit.oid};
    }
  });
}

export function createAtomicGitRegistryWriter({port,ownerSubject,expectedHeadSha,now=Date.now,signal}={}) {
  return Object.freeze({qualification:'ATOMIC_GIT_REGISTRY_WRITER',async commit({receipt,expectedDigest,expectedIndexDigest,authorize}) {
    if(port?.configured!==true||port.qualification!=='SCOPED_GIT_REGISTRATION_PORT'||typeof authorize!=='function')failure('REGISTRATION_NOT_ACTIVATED');
    await authorize();assertIssuedRegistrationReceipt(receipt,now());
    const before=validateRegistrationCatalog(await port.readSnapshot({signal}),ownerSubject), prior=before.ledger.entries.find(e=>e.receipt.requestId===receipt.requestId);
    const result=(snapshot,r,replay)=>({qualification:port.sourceQualification==='LOCAL_GIT_FIXTURE'?'LOCAL_GIT_REGISTRATION_VERIFIED':'PRIVATE_GIT_REGISTRATION_VERIFIED',catalogCommitSha:snapshot.headSha,registryDigest:contentDigest(snapshot.files[REGISTRY_PATH]),indexDigest:contentDigest(snapshot.files[INDEX_PATH]),canonicalMemoryPaths:registrationMemoryPaths(r.projectId),receipt:r,replay,liveRegistered:port.sourceQualification==='APPROVED_REMOTE_GIT'});
    if(prior){if(prior.receipt.requestDigest!==receipt.requestDigest)failure('REGISTRATION_REPLAY_CONFLICT',409);await authorize();return result(before,prior.receipt,true);}
    if(before.headSha!==expectedHeadSha)failure('REGISTRATION_CATALOG_HEAD_CONFLICT',409);
    if(before.ledger.entries.length>=CATALOG_LIMIT)failure('REGISTRATION_CATALOG_CAPACITY',409);
    if(registrationReservedRepositoryIds.includes(receipt.repositoryNumericId)||before.ledger.entries.some(e=>e.receipt.repositoryNumericId===receipt.repositoryNumericId))failure('REGISTRATION_TARGET_CONFLICT',409);
    const memoryFiles=Object.fromEntries(Object.entries(before.files).filter(([p])=>!roots.includes(p))), local=createLocalProjectRegistryWriter({registryText:before.files[REGISTRY_PATH],memoryIndexText:before.files[INDEX_PATH],memoryFiles,now});
    await local.commit({receipt,expectedDigest,expectedIndexDigest,authorize});const candidate=local.inspect(), newPaths=registrationMemoryPaths(receipt.projectId);
    const entry={receipt,baseCatalogHeadSha:before.headSha,memoryHashes:Object.fromEntries(newPaths.map(p=>[p,contentDigest(candidate.memoryFiles[p])]))};
    const ledger={...before.ledger,entries:[...before.ledger.entries,entry]}, files={[REGISTRY_PATH]:candidate.registryText,[INDEX_PATH]:candidate.memoryIndexText,[LEDGER_PATH]:JSON.stringify(ledger,null,2)+'\n',...Object.fromEntries(newPaths.map(p=>[p,candidate.memoryFiles[p]]))};
    await authorize();assertIssuedRegistrationReceipt(receipt,now());
    const committed=await port.commitFiles({expectedHeadSha:before.headSha,projectId:receipt.projectId,files,signal});if(!sha(committed?.commitSha))failure('REGISTRATION_READBACK_MISMATCH');
    const after=validateRegistrationCatalog(await port.readSnapshot({signal,expectedCommitSha:committed.commitSha}),ownerSubject);
    if(after.headSha!==committed.commitSha||Object.entries(files).some(([p,content])=>after.files[p]!==content))failure('REGISTRATION_READBACK_MISMATCH');
    await authorize();return result(after,after.ledger.entries.find(e=>e.receipt.requestId===receipt.requestId).receipt,false);
  }});
}
