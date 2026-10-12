import {createHash} from 'node:crypto';
import {validateProjectDraft} from './project-draft.mjs';
import {canonicalDraftPreviewUrl} from './project-draft-url.mjs';
import {selectRepositoryRunProfile, SOURCE_PROFILE_PATH} from '../reporting/repository-run-source-profile.mjs';

export const REGISTRATION_VERSION = 'mc.project-registration.v1';
export const REGISTRATION_FILES = Object.freeze(['HANDOFF.md', 'PRD.md', 'README.md', 'docs/PRODUCT_CHARTER.md', 'docs/PHASE_PLAN.md', '.mission-control/bootstrap.json', SOURCE_PROFILE_PATH]);
export const REGISTRATION_MAX_BYTES = 16384;
export const REGISTRATION_MAX_AGE_MS = 30000;
const issued = new WeakSet();
const sha = v => typeof v === 'string' && /^[a-f0-9]{40}$/.test(v);
const hash = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const id = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(v);
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
export const registrationError = (code, status = 400) => Object.assign(new Error(code), {code, status});
const requireValue = (v, code = 'REGISTRATION_REQUEST_INVALID', status = 400) => { if (!v) throw registrationError(code, status); };

// Refuse executable/custom JSON values before any serializer or getter can run.
export function registrationJson(value) {
  const seen = new Set();
  function clean(v) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    requireValue(v && typeof v === 'object' && !seen.has(v)); seen.add(v);
    const array = Array.isArray(v), proto = Object.getPrototypeOf(v);
    requireValue(array ? proto === Array.prototype : proto === Object.prototype || proto === null);
    const keys = Reflect.ownKeys(v), result = array ? [] : {};
    requireValue(keys.every(k => typeof k === 'string'));
    if (array) requireValue(keys.length === v.length + 1 && keys.filter(k => k !== 'length').every((k, i) => k === String(i)));
    for (const k of keys) {
      if (array && k === 'length') continue;
      const d = Object.getOwnPropertyDescriptor(v, k);
      requireValue(d.enumerable && Object.hasOwn(d, 'value') && !['__proto__', 'constructor', 'prototype'].includes(k));
      Object.defineProperty(result, k, {value: clean(d.value), enumerable: true, configurable: true, writable: true});
    }
    seen.delete(v); return result;
  }
  const result = clean(value);
  requireValue(Buffer.byteLength(JSON.stringify(result)) <= REGISTRATION_MAX_BYTES, 'REGISTRATION_BODY_TOO_LARGE', 413);
  return result;
}
export function registrationDigest(value) {
  const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
export const contentDigest = content => createHash('sha256').update(content, 'utf8').digest('hex');

function resources(v) {
  requireValue(exact(v, ['backend', 'deployment']));
  if (v.backend !== null) requireValue(exact(v.backend, ['provider', 'projectRef']) && v.backend.provider === 'supabase' && /^[a-z0-9]{20}$/.test(v.backend.projectRef));
  if (v.deployment !== null) {
    const d = v.deployment;
    requireValue(exact(d, ['provider', 'accountId', 'projectId', 'environment', 'url']) && d.provider === 'vercel' && id(d.accountId) && id(d.projectId) && d.environment === 'preview' && d.url !== '' && canonicalDraftPreviewUrl(d.url));
  }
}
export function registrationRequest(input) {
  const v = registrationJson(input);
  requireValue(exact(v, ['schemaVersion', 'mode', 'requestId', 'draftId', 'draftRevision', 'projectId', 'repositoryId', 'repositoryNumericId', 'ref', 'baselineSha', 'expectedRegistryDigest', 'expectedIndexDigest', 'files', 'resources']));
  requireValue(v.schemaVersion === REGISTRATION_VERSION && v.mode === 'IMPORT_EXISTING_PRIVATE_REPOSITORY' && id(v.requestId) && /^draft_[a-f0-9]{16,32}$/.test(v.draftId) && Number.isSafeInteger(v.draftRevision) && v.draftRevision > 0 && v.draftRevision <= 100000);
  requireValue(/^[A-Z][A-Z0-9_]{2,63}$/.test(v.projectId) && Number.isSafeInteger(v.repositoryNumericId) && v.repositoryNumericId > 0 && sha(v.baselineSha) && hash(v.expectedRegistryDigest) && hash(v.expectedIndexDigest));
  // Reuse the existing draft's repository/ref rules; a derived repository is not accepted here.
  validateProjectDraft({schemaVersion:'mc.project-draft.v1', draftId:v.draftId, revision:v.draftRevision, createdAt:'2026-01-01T00:00:00.000Z', updatedAt:'2026-01-01T00:00:00.000Z', project:{projectId:v.projectId, name:'Registration validation', idea:'Registration validation', acceptance:'', repositoryId:v.repositoryId, branch:v.ref, environment:'CODE_ONLY', deployment:'NOT_REQUIRED', previewUrl:''}});
  requireValue(v.repositoryId !== '' && !['MC', 'MISSION_CONTROL', 'NEXAEON', 'WOOSONG_BUDDY', 'NAMYOUNG_WEB3D', 'JOEY_ASSET_SYSTEM'].includes(v.projectId));
  requireValue(v.ref !== 'mc' && v.ref !== 'mc/progress' && !v.ref.startsWith('mc/progress/'), 'REGISTRATION_REPORT_REF_CONFLICT', 409);
  requireValue(exact(v.files, REGISTRATION_FILES) && REGISTRATION_FILES.every(p => hash(v.files[p])));
  resources(v.resources); return v;
}
export function registrationPolicy(input, request, {ownerSubject, now = Date.now()} = {}) {
  requireValue(input !== null, 'REGISTRATION_NOT_ACTIVATED', 503);
  const p = registrationJson(input);
  requireValue(exact(p, ['qualification', 'ownerSubject', 'approvalRef', 'expiresAt', 'target']) && p.qualification === 'EXACT_PRIVATE_PROJECT_REGISTRATION_POLICY' && p.ownerSubject === ownerSubject && id(p.approvalRef) && Number.isSafeInteger(p.expiresAt) && p.expiresAt > now, 'REGISTRATION_SCOPE_DENIED', 403);
  const expected = Object.fromEntries(['draftId', 'draftRevision', 'projectId', 'repositoryId', 'repositoryNumericId', 'ref', 'baselineSha', 'expectedRegistryDigest', 'expectedIndexDigest', 'files', 'resources'].map(k => [k, request[k]]));
  requireValue(registrationDigest(p.target) === registrationDigest(expected), 'REGISTRATION_SCOPE_DENIED', 403);
  return p;
}
function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }

// Only server-observed bytes issue a receipt. Serialized/exported receipts are review evidence,
// never write tokens: the writer accepts only receipts minted in this process.
export function verifyRegistrationObservation({request, draft, repository, headBefore, headAfter, files, resourceObservations, policy, ownerSubject, startedAt, now = Date.now()}) {
  const r = registrationRequest(request), d = validateProjectDraft(draft), p = registrationPolicy(policy, r, {ownerSubject, now});
  requireValue(d.draftId === r.draftId && d.revision === r.draftRevision && d.project.projectId === r.projectId && d.project.repositoryId === r.repositoryId && d.project.branch === r.ref && d.project.acceptance !== '', 'REGISTRATION_DRAFT_CONFLICT', 409);
  requireValue(repository?.id === r.repositoryNumericId && repository.full_name === r.repositoryId && repository.private === true && repository.visibility === 'private' && repository.archived === false && repository.disabled === false, 'REGISTRATION_PRIVATE_IDENTITY_MISMATCH', 409);
  requireValue(headBefore === r.baselineSha && headAfter === r.baselineSha, 'REGISTRATION_HEAD_CHANGED', 409);
  requireValue(Number.isSafeInteger(startedAt) && startedAt <= now && now - startedAt <= REGISTRATION_MAX_AGE_MS, 'REGISTRATION_OBSERVATION_EXPIRED', 409);
  requireValue(exact(files, REGISTRATION_FILES), 'REGISTRATION_FILE_MISMATCH', 409);
  const evidence = {};
  for (const path of REGISTRATION_FILES) {
    const f = files[path];
    requireValue(f?.status === 'FOUND' && f.entryType === 'file' && f.commitSha === r.baselineSha && sha(f.blobId) && typeof f.content === 'string' && Buffer.byteLength(f.content) > 0 && Buffer.byteLength(f.content) <= 98304 && contentDigest(f.content) === r.files[path], 'REGISTRATION_FILE_MISMATCH', 409);
    const bytes = Buffer.from(f.content);
    requireValue(createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex') === f.blobId, 'REGISTRATION_BLOB_MISMATCH', 409);
    evidence[path] = {sha256:r.files[path], blobId:f.blobId};
  }
  let profile;
  try {
    const doc = JSON.parse(files[SOURCE_PROFILE_PATH].content);
    requireValue(doc.profiles?.length === 1, 'REGISTRATION_SOURCE_PROFILE_MISMATCH', 409);
    profile = selectRepositoryRunProfile(files[SOURCE_PROFILE_PATH].content, {projectId:r.projectId, repositoryId:r.repositoryId});
  } catch { throw registrationError('REGISTRATION_SOURCE_PROFILE_MISMATCH', 409); }
  requireValue(profile.ref === r.ref && profile.path === 'HANDOFF.md' && JSON.stringify(profile.contextPaths) === JSON.stringify(['PRD.md', 'README.md', 'docs/PRODUCT_CHARTER.md', 'docs/PHASE_PLAN.md']), 'REGISTRATION_SOURCE_PROFILE_MISMATCH', 409);
  let manifest; try { manifest = JSON.parse(files['.mission-control/bootstrap.json'].content); } catch { throw registrationError('REGISTRATION_BOOTSTRAP_MISMATCH', 409); }
  requireValue(exact(manifest, ['schemaVersion', 'qualification', 'projectId', 'repositoryId', 'branch', 'entryPath', 'draftRevision', 'preparedAt', 'repositoryVisibilityRequired', 'executionAuthorized', 'registration', 'reporting', 'environment', 'deployment']) && manifest.schemaVersion === 'mc.project-bootstrap.v1' && manifest.projectId === r.projectId && manifest.repositoryId === r.repositoryId && manifest.branch === r.ref && manifest.draftRevision === r.draftRevision && manifest.entryPath === 'HANDOFF.md' && manifest.repositoryVisibilityRequired === 'private' && manifest.executionAuthorized === false && manifest.qualification === 'OWNER_PREPARED_NOT_PROVISIONED' && manifest.registration === 'PENDING' && manifest.reporting === 'PENDING_SCOPE_APPROVAL' && manifest.environment === d.project.environment && manifest.deployment === d.project.deployment && typeof manifest.preparedAt === 'string' && Number.isFinite(Date.parse(manifest.preparedAt)) && new Date(manifest.preparedAt).toISOString() === manifest.preparedAt && Date.parse(manifest.preparedAt) >= Date.parse(d.createdAt) && Date.parse(manifest.preparedAt) <= startedAt, 'REGISTRATION_BOOTSTRAP_MISMATCH', 409);
  requireValue(new RegExp('^Project: ' + r.projectId + '\\s*$', 'm').test(files['HANDOFF.md'].content), 'REGISTRATION_HANDOFF_MISMATCH', 409);
  requireValue(exact(resourceObservations, ['backend', 'deployment']), 'REGISTRATION_RESOURCE_MISMATCH', 409);
  const verifiedResources = {};
  for (const kind of ['backend', 'deployment']) {
    const target = r.resources[kind], obs = resourceObservations[kind];
    if (target === null) { requireValue(obs === null, 'REGISTRATION_RESOURCE_MISMATCH', 409); verifiedResources[kind] = null; continue; }
    requireValue(exact(obs, ['qualification', 'projectId', 'repositoryId', 'repositoryNumericId', 'ref', 'baselineSha', 'target', 'readAt']) && obs.qualification === 'INDEPENDENT_CONFIGURATION_READ' && obs.projectId === r.projectId && obs.repositoryId === r.repositoryId && obs.repositoryNumericId === r.repositoryNumericId && obs.ref === r.ref && obs.baselineSha === r.baselineSha && registrationDigest(obs.target) === registrationDigest(target) && Number.isSafeInteger(obs.readAt) && obs.readAt >= startedAt && obs.readAt <= now, 'REGISTRATION_RESOURCE_MISMATCH', 409);
    verifiedResources[kind] = {target, qualification:'CONFIGURATION_VERIFIED_DELIVERY_UNVERIFIED'};
  }
  requireValue(!(d.project.environment === 'CODE_ONLY' && r.resources.backend) && !(d.project.deployment === 'NOT_REQUIRED' && r.resources.deployment) && (!d.project.previewUrl || !r.resources.deployment || d.project.previewUrl === r.resources.deployment.url), 'REGISTRATION_RESOURCE_MISMATCH', 409);
  const receipt = freeze({schemaVersion:REGISTRATION_VERSION, qualification:'INDEPENDENT_PRIVATE_REPOSITORY_IMPORT', mode:r.mode, requestId:r.requestId, requestDigest:registrationDigest(r), ownerSubject, approvalRef:p.approvalRef, draftId:d.draftId, draftRevision:d.revision, projectId:r.projectId, name:d.project.name, repositoryId:r.repositoryId, repositoryNumericId:r.repositoryNumericId, ref:r.ref, baselineSha:r.baselineSha, files:evidence, sourceProfile:profile, resources:verifiedResources, observedAt:now, expiresAt:Math.min(p.expiresAt, startedAt + REGISTRATION_MAX_AGE_MS), environmentStatus:d.project.environment === 'CODE_ONLY' ? 'NOT_REQUIRED' : verifiedResources.backend ? 'CONFIGURATION_VERIFIED' : 'PENDING_CONFIGURATION', deploymentStatus:d.project.deployment === 'NOT_REQUIRED' ? 'NOT_REQUIRED' : verifiedResources.deployment ? 'CONFIGURATION_VERIFIED_DELIVERY_UNVERIFIED' : 'PENDING_CONFIGURATION', sourceReadScope:'PENDING_EXPLICIT_ACTIVATION', reportWriteScope:'PENDING_EXPLICIT_ACTIVATION', developmentReady:false, executionAuthorized:false, verifiedDelivery:false, joeyAcceptance:'PENDING'});
  issued.add(receipt); return receipt;
}
export function assertIssuedRegistrationReceipt(receipt, now = Date.now()) {
  requireValue(issued.has(receipt), 'REGISTRATION_RECEIPT_NOT_SERVER_ISSUED', 403);
  requireValue(receipt.expiresAt > now && receipt.observedAt <= now, 'REGISTRATION_OBSERVATION_EXPIRED', 409);
  return receipt;
}
