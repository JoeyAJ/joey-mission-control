import {registrationError, registrationRequest, REGISTRATION_FILES, contentDigest} from './project-registration-contract.mjs';
import {registrationMemoryPaths} from './project-registry-writer.mjs';
import {registrationCatalogTarget, registrationReservedRepositoryIds} from './project-registration-config.mjs';
import {parseMarkdown, parseTable} from '../canonical/markdown.mjs';
import {sourceRef} from '../canonical/fingerprint.mjs';
import {buildProjectProjection} from '../projection/project-projection.mjs';

export const REGISTRY_PATH = 'PROJECT_REGISTRY_V1.0.md', INDEX_PATH = 'MEMORY_INDEX.md', LEDGER_PATH = '.mission-control/registration-ledger.json';
export const CATALOG_LIMIT = 32;
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v,k));
const fail = () => { throw registrationError('REGISTRATION_CATALOG_INVALID',503); };
export function emptyRegistrationLedger() { return {schemaVersion:'mc.registration-ledger.v1', reservedRepositoryIds:[...registrationReservedRepositoryIds], entries:[]}; }
export function parseRegistrationLedger(text, ownerSubject) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 1048576) fail();
  let ledger;try{ledger=JSON.parse(text);}catch{fail();}
  if (!exact(ledger,['schemaVersion','reservedRepositoryIds','entries']) || ledger.schemaVersion !== 'mc.registration-ledger.v1' || JSON.stringify(ledger.reservedRepositoryIds) !== JSON.stringify(registrationReservedRepositoryIds) || !Array.isArray(ledger.entries) || ledger.entries.length > CATALOG_LIMIT) fail();
  const projects=new Set(), repos=new Set(), numeric=new Set(ledger.reservedRepositoryIds), requests=new Set();
  for (const entry of ledger.entries) {
    const r=entry.receipt;
    if (!exact(entry,['receipt','baseCatalogHeadSha','memoryHashes']) || !r || r.schemaVersion !== 'mc.project-registration.v1' || r.qualification !== 'INDEPENDENT_PRIVATE_REPOSITORY_IMPORT' || r.mode !== 'IMPORT_EXISTING_PRIVATE_REPOSITORY' || r.ownerSubject !== ownerSubject || typeof r.name !== 'string' || !r.name.trim() || r.name.length>100 || /[\r\n\u0000-\u001f]/.test(r.name) || !/^[a-f0-9]{64}$/.test(r.requestDigest||'') || !Number.isSafeInteger(r.observedAt) || !Number.isSafeInteger(r.expiresAt) || r.observedAt >= r.expiresAt || !/^[a-f0-9]{40}$/.test(entry.baseCatalogHeadSha||'')) fail();
    try {registrationRequest({schemaVersion:r.schemaVersion,mode:r.mode,requestId:r.requestId,draftId:r.draftId,draftRevision:r.draftRevision,projectId:r.projectId,repositoryId:r.repositoryId,repositoryNumericId:r.repositoryNumericId,ref:r.ref,baselineSha:r.baselineSha,expectedRegistryDigest:'a'.repeat(64),expectedIndexDigest:'a'.repeat(64),files:Object.fromEntries(REGISTRATION_FILES.map(p=>[p,r.files[p]?.sha256])),resources:{backend:r.resources.backend?.target??null,deployment:r.resources.deployment?.target??null}});}catch{fail();}
    if (!r.repositoryId.startsWith('JoeyAJ/') || !exact(r.files,REGISTRATION_FILES) || REGISTRATION_FILES.some(p=>!exact(r.files[p],['sha256','blobId','gitMode']) || !/^[a-f0-9]{40}$/.test(r.files[p].blobId) || !['100644','100755'].includes(r.files[p].gitMode)) || r.sourceProfile?.projectId!==r.projectId || r.sourceProfile.repositoryId!==r.repositoryId || r.sourceProfile.ref!==r.ref || r.sourceProfile.path!=='HANDOFF.md' || r.sourceProfile.track!=='BASELINE' || JSON.stringify(r.sourceProfile.contextPaths)!==JSON.stringify(['PRD.md','README.md','docs/PRODUCT_CHARTER.md','docs/PHASE_PLAN.md']) || r.executionAuthorized!==false || r.developmentReady!==false || r.verifiedDelivery!==false || r.joeyAcceptance!=='PENDING' || r.sourceReadScope!=='PENDING_EXPLICIT_ACTIVATION' || r.reportWriteScope!=='PENDING_EXPLICIT_ACTIVATION') fail();
    const paths=registrationMemoryPaths(r.projectId);
    if(!exact(entry.memoryHashes,paths)||paths.some(p=>!/^[a-f0-9]{64}$/.test(entry.memoryHashes[p]||''))||projects.has(r.projectId)||repos.has(r.repositoryId.toLowerCase())||numeric.has(r.repositoryNumericId)||requests.has(r.requestId))fail();
    projects.add(r.projectId);repos.add(r.repositoryId.toLowerCase());numeric.add(r.repositoryNumericId);requests.add(r.requestId);
  }
  return ledger;
}
export function validateRegistrationCatalog(snapshot, ownerSubject) {
  if (!snapshot || !/^[a-f0-9]{40}$/.test(snapshot.headSha||'') || !snapshot.files || [REGISTRY_PATH,INDEX_PATH,LEDGER_PATH].some(p=>typeof snapshot.files[p]!=='string'||Buffer.byteLength(snapshot.files[p])>1048576)) fail();
  const ledger=parseRegistrationLedger(snapshot.files[LEDGER_PATH],ownerSubject), expected=[REGISTRY_PATH,INDEX_PATH,LEDGER_PATH,...ledger.entries.flatMap(e=>registrationMemoryPaths(e.receipt.projectId))];
  if(!exact(snapshot.files,expected))fail();
  const blocks=[...snapshot.files[REGISTRY_PATH].matchAll(/^###\s+\d+\.\s+(.+)\n\n```yaml\n([\s\S]*?)```/gm)].map(m=>({name:m[1],data:Object.fromEntries(m[2].split('\n').map(l=>l.match(/^([\w_]+):\s*(.*)$/)).filter(Boolean).map(m=>[m[1],m[2]==='null'?null:m[2]]))}));
  const index=parseMarkdown(snapshot.files[INDEX_PATH]);
  let rows;try{rows=parseTable(index.sections['Production Development Registry']);parseTable(index.sections['Systems Registry']);}catch{fail();}
  if(blocks.length!==ledger.entries.length||rows.length!==ledger.entries.length)fail();
  for(const e of ledger.entries){const r=e.receipt,b=blocks.filter(b=>b.data.project_id===r.projectId),row=rows.filter(row=>row.Project?.includes('`'+r.projectId+'`'));if(b.length!==1||row.length!==1||b[0].data.github!==r.repositoryId||Number(b[0].data.repository_numeric_id)!==r.repositoryNumericId||b[0].data.branch!==r.ref||b[0].data.local_head!==r.baselineSha||b[0].data.local_master!==null||b[0].data.production!==null||b[0].data.production_source_sha!==null||!row[0].Memory.includes('('+registrationMemoryPaths(r.projectId)[0]+')')||!row[0]['Current State'].includes('(PROJECTS/'+r.projectId+'/CURRENT_STATE.md)'))fail();for(const p of registrationMemoryPaths(r.projectId))if(typeof snapshot.files[p]!=='string'||Buffer.byteLength(snapshot.files[p])>98304||contentDigest(snapshot.files[p])!==e.memoryHashes[p])fail();}
  return {...snapshot,ledger,blocks};
}
// The project's public site, from the CURRENT_STATE.md yaml `public_url`; only plain https URLs are shown.
export function catalogSiteUrl(stateText) {
  const raw=parseMarkdown(stateText).metadata?.public_url;
  if (typeof raw!=='string') return null;
  try { const u=new URL(raw.trim()); return u.protocol==='https:'&&!u.username&&!u.password?u.href:null; } catch { return null; }
}
export function projectRegistrationCatalogView(snapshot, {ownerSubject, now=Date.now()}={}) {
  const s=validateRegistrationCatalog(snapshot,ownerSubject), source=(path,section='')=>({...sourceRef('git://'+registrationCatalogTarget.repositoryId+'@'+s.headSha+'/'+path,s.files[path],section),verificationStatus:'verified_private_catalog_bytes',readAt:new Date(now).toISOString()});
  const projects=s.ledger.entries.map(({receipt:r})=>{const b=s.blocks.find(b=>b.data.project_id===r.projectId),statePath='PROJECTS/'+r.projectId+'/CURRENT_STATE.md',nextPath='PROJECTS/'+r.projectId+'/NEXT_ACTIONS.md';const project=buildProjectProjection({id:r.projectId,name:b.name,entityType:'project',indexSource:source(INDEX_PATH),memoryPath:registrationMemoryPaths(r.projectId)[0],relevantDocs:registrationMemoryPaths(r.projectId),state:{...parseMarkdown(s.files[statePath]),source:source(statePath)},next:{...parseMarkdown(s.files[nextPath]),source:source(nextPath)},registry:{localMaster:null,github:r.repositoryId,branch:r.ref,storedHead:r.baselineSha,production:null,productionHead:null,source:source(REGISTRY_PATH)},git:{error:'No current local workspace or source-branch observation; private registration is a stored baseline.'}});return {projectId:r.projectId,name:b.name,repositoryId:r.repositoryId,repositoryNumericId:r.repositoryNumericId,ref:r.ref,baselineSha:r.baselineSha,requestId:r.requestId,requestDigest:r.requestDigest,registeredAt:r.observedAt,qualification:'HISTORICAL_PRIVATE_REGISTRATION_RECEIPT',siteUrl:catalogSiteUrl(s.files[statePath]),sourceReadScope:r.sourceReadScope,reportWriteScope:r.reportWriteScope,developmentReady:false,executionAuthorized:false,verifiedDelivery:false,joeyAcceptance:'PENDING',project};});
  return {schemaVersion:1,qualification:'OWNER_PRIVATE_GIT_CATALOG',catalogCommitSha:s.headSha,canonicalMemoryQualification:'NEW_PROJECT_PRIVATE_CATALOG_EXISTING_MAC_SNAPSHOT_UNCHANGED',projects};
}
