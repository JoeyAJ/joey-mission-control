import {validateDraftStorageReply, sameDraft} from './project-draft-storage-contract.mjs';
import {REGISTRATION_MAX_BYTES, REGISTRATION_MAX_AGE_MS, REGISTRATION_FILES, registrationJson, registrationRequest, registrationPolicy, registrationError, verifyRegistrationObservation} from './project-registration-contract.mjs';

const result = (status, body) => ({status, body, headers:{'Cache-Control':'private, no-store', Vary:'Authorization', Pragma:'no-cache'}});
const publicErrors = new Set(['OWNER_AUTHORIZATION_DENIED', ...['BLOB_MISMATCH','BODY_TOO_LARGE','BOOTSTRAP_MISMATCH','DRAFT_CONFLICT','FILE_MISMATCH','HANDOFF_MISMATCH','HEAD_CHANGED','INDEX_FORMAT_UNSUPPORTED','INDEX_INVALID','INDEX_REVISION_CONFLICT','JSON_REQUIRED','NOT_ACTIVATED','OBSERVATION_EXPIRED','PORT_NOT_CONFIGURED','PRIVATE_IDENTITY_MISMATCH','PRIVATE_READ_UNAVAILABLE','RECEIPT_NOT_SERVER_ISSUED','REGISTRY_INVALID','REGISTRY_REVISION_CONFLICT','REPLAY_CONFLICT','REPORT_REF_CONFLICT','REQUEST_INVALID','RESOURCE_MISMATCH','RESOURCE_READER_NOT_CONFIGURED','SCOPE_DENIED','SOURCE_PROFILE_MISMATCH','TARGET_CONFLICT'].map(c => 'REGISTRATION_' + c)]);
async function body(req) {
  if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers?.['content-type'] || '')) throw registrationError('REGISTRATION_JSON_REQUIRED', 415);
  const length = req.headers?.['content-length'];
  if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > REGISTRATION_MAX_BYTES)) throw registrationError('REGISTRATION_BODY_TOO_LARGE', 413);
  if (req.body !== undefined) {
    if (typeof req.body !== 'string') return registrationJson(req.body);
    if (Buffer.byteLength(req.body) > REGISTRATION_MAX_BYTES) throw registrationError('REGISTRATION_BODY_TOO_LARGE', 413);
    return JSON.parse(req.body);
  }
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk); size += bytes.length;
    if (size > REGISTRATION_MAX_BYTES) throw registrationError('REGISTRATION_BODY_TOO_LARGE', 413);
    chunks.push(bytes);
  }
  return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(Buffer.concat(chunks)));
}

// Proposed POST interface, intentionally not mounted in src/server.mjs or api/.
// Default null policy refuses all writes. All ports are injected server-side;
// browser receipts, typed URLs and existing five-scope capabilities confer nothing.
export function createProjectRegistrationServer({policy = null, ownerSubject, allowedOrigin, verifyOwner, draftPort, repositoryReader, resourceReader = null, writer = null, now = Date.now} = {}) {
  const configuredPolicy = policy === null ? null : registrationJson(policy);
  return Object.freeze({async handle(req, {signal} = {}) {
    if (req.method !== 'POST') return result(405, {error:'REGISTRATION_METHOD_DENIED'});
    if (configuredPolicy === null) return result(503, {error:'REGISTRATION_NOT_ACTIVATED'});
    if (typeof allowedOrigin !== 'string' || req.headers?.origin !== allowedOrigin || req.headers?.['sec-fetch-site'] === 'cross-site') return result(403, {error:'ORIGIN_DENIED'});
    const token = /^Bearer ([A-Za-z0-9_.-]{20,8192})$/.exec(req.headers?.authorization || '')?.[1];
    if (!token) return result(401, {error:'OWNER_AUTHENTICATION_REQUIRED'});
    const abort = new AbortController(), cancel = () => abort.abort();
    signal?.addEventListener('abort', cancel, {once:true}); if (signal?.aborted) cancel();
    const timer = setTimeout(cancel, REGISTRATION_MAX_AGE_MS); timer.unref?.();
    let request;
    const active = () => { if (abort.signal.aborted) throw registrationError('REGISTRATION_PRIVATE_READ_UNAVAILABLE', 503); };
    const owner = async () => {
      active();
      let a;
      try { a = await verifyOwner(token, {signal:abort.signal}); }
      catch { throw registrationError('OWNER_AUTHORIZATION_DENIED', 403); }
      if (!a || typeof ownerSubject !== 'string' || !ownerSubject || a.subject !== ownerSubject || a.role !== 'OWNER' || a.aal !== 'aal2' || a.verified !== true || a.sessionActive !== true || !Number.isSafeInteger(a.expiresAt) || a.expiresAt <= now()) throw registrationError('OWNER_AUTHORIZATION_DENIED', 403);
      active(); if (request) registrationPolicy(configuredPolicy, request, {ownerSubject, now:now()});
      return a;
    };
    const savedDraft = async () => {
      active();
      const reply = validateDraftStorageReply('list', await draftPort.call('list', null, token, {signal:abort.signal}));
      const d = reply.drafts.find(d => d.draftId === request.draftId);
      if (!d || d.revision !== request.draftRevision || reply.drafts.some(other => other.draftId !== request.draftId && (other.project.projectId === request.projectId || other.project.repositoryId.toLowerCase() === request.repositoryId.toLowerCase()))) throw registrationError('REGISTRATION_DRAFT_CONFLICT', 409);
      active(); return d;
    };
    try {
      await owner();
      request = registrationRequest(await body(req));
      registrationPolicy(configuredPolicy, request, {ownerSubject, now:now()});
      if (!draftPort || repositoryReader?.configured !== true || writer?.qualification !== 'LOCAL_REGISTRY_CANDIDATE_ONLY') throw registrationError('REGISTRATION_PORT_NOT_CONFIGURED', 503);
      const startedAt = now(), draft = await savedDraft(); await owner();
      const query = {repositoryId:request.repositoryId, ref:request.ref, signal:abort.signal};
      const repository = await repositoryReader.inspectIdentity(query);
      // Reject public/foreign identities before reading any private document.
      if (repository?.id !== request.repositoryNumericId || repository.full_name !== request.repositoryId || repository.private !== true || repository.visibility !== 'private' || repository.archived !== false || repository.disabled !== false) throw registrationError('REGISTRATION_PRIVATE_IDENTITY_MISMATCH', 409);
      const before = await repositoryReader.resolveRevision(query);
      if (before?.commitSha !== request.baselineSha) throw registrationError('REGISTRATION_HEAD_CHANGED', 409);
      const files = {};
      for (const path of REGISTRATION_FILES) {
        active();
        files[path] = await repositoryReader.readFile({...query, commitSha:request.baselineSha, path, maxBytes:98304});
        await owner();
      }
      const resourceObservations = {backend:null, deployment:null};
      for (const kind of ['backend', 'deployment']) if (request.resources[kind] !== null) {
        if (typeof resourceReader?.read !== 'function') throw registrationError('REGISTRATION_RESOURCE_READER_NOT_CONFIGURED', 503);
        resourceObservations[kind] = await resourceReader.read({kind, target:request.resources[kind], projectId:request.projectId, repositoryId:request.repositoryId, repositoryNumericId:request.repositoryNumericId, ref:request.ref, baselineSha:request.baselineSha, signal:abort.signal});
        await owner();
      }
      const after = await repositoryReader.resolveRevision(query);
      const identityAfter = await repositoryReader.inspectIdentity(query);
      if (identityAfter?.id !== repository.id || identityAfter.full_name !== repository.full_name || identityAfter.private !== true || identityAfter.visibility !== 'private' || identityAfter.archived !== false || identityAfter.disabled !== false) throw registrationError('REGISTRATION_PRIVATE_IDENTITY_MISMATCH', 409);
      const receipt = verifyRegistrationObservation({request, draft, repository:identityAfter, headBefore:before.commitSha, headAfter:after?.commitSha, files, resourceObservations, policy:configuredPolicy, ownerSubject, startedAt, now:now()});
      const registration = await writer.commit({receipt, expectedDigest:request.expectedRegistryDigest, expectedIndexDigest:request.expectedIndexDigest, authorize:async () => {
        await owner();
        if (!sameDraft(draft, await savedDraft())) throw registrationError('REGISTRATION_DRAFT_CONFLICT', 409);
        const finalIdentity = await repositoryReader.inspectIdentity(query);
        if (finalIdentity?.id !== request.repositoryNumericId || finalIdentity.full_name !== request.repositoryId || finalIdentity.private !== true || finalIdentity.visibility !== 'private' || finalIdentity.archived !== false || finalIdentity.disabled !== false) throw registrationError('REGISTRATION_PRIVATE_IDENTITY_MISMATCH', 409);
        if ((await repositoryReader.resolveRevision(query))?.commitSha !== request.baselineSha) throw registrationError('REGISTRATION_HEAD_CHANGED', 409);
        await owner();
      }});
      const finalActor = await owner();
      const expiresAt = Math.min(receipt.expiresAt, finalActor.expiresAt);
      return result(200, {schemaVersion:1, ...registration, currentVerification:{qualification:'INDEPENDENT_PRIVATE_REPOSITORY_READ', baselineSha:receipt.baselineSha, observedAt:receipt.observedAt, expiresAt}, expiresAt, developmentReady:false, executionAuthorized:false, verifiedDelivery:false});
    } catch (e) {
      const known = publicErrors.has(e?.code);
      const status = known && [400,401,403,409,413,415,503].includes(e.status) ? e.status : e instanceof SyntaxError ? 400 : 503;
      return result(status, {error:known ? e.code : status === 400 ? 'REGISTRATION_REQUEST_INVALID' : 'REGISTRATION_PRIVATE_READ_UNAVAILABLE'});
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }});
}
