// Transactional reference core. The caller must load and commit state under one
// DB transaction; this module is not an HTTP endpoint or an Owner verifier.
import {createPublicKey, randomUUID} from 'node:crypto';
import {AUDIENCE, OWNER, TASK, digest, validateRequest, verifyEnvelope} from './protocol.mjs';
import {fail, identifier} from '../vendor/data.mjs';

export const emptyBroker = () => ({workers: {}, jobs: {}, requests: {}, approvals: {}});
export function assertOwner(verifiedPrincipal) {
  // Only the trusted server JWT/session verifier may supply this principal.
  if (verifiedPrincipal?.subject !== OWNER || verifiedPrincipal?.aal !== 'aal2'
    || verifiedPrincipal?.sessionCurrent !== true) fail('OWNER_AAL2_REQUIRED');
}
export function registerWorker(state, principal, workerId, publicKey) {
  assertOwner(principal);
  if (!identifier(workerId) || Object.hasOwn(state.workers, workerId)) fail('WORKER_EXISTS_OR_INVALID');
  if (typeof publicKey !== 'string' || publicKey.length > 256 || createPublicKey(publicKey).asymmetricKeyType !== 'ed25519') fail('INVALID_WORKER_PUBLIC_KEY');
  state.workers[workerId] = {publicKey, enabled: true};
}
export function approveSmoke(state, principal, workerId, approvalId, now = Date.now()) {
  assertOwner(principal);
  if (!identifier(approvalId) || Object.hasOwn(state.approvals, approvalId) || !state.workers[workerId]?.enabled
    || Object.values(state.jobs).some(job => !job.terminal)) fail('APPROVAL_CONFLICT');
  const jobId = randomUUID();
  const job = {jobId, attemptId: randomUUID(), workerId, fence: 1, task: TASK,
    approvedAt: now, claimBefore: now + 900_000, expiresAt: null, leaseUntil: null,
    claimed: false, cancel: false, terminal: false, events: [], outcome: null};
  state.jobs[jobId] = job; state.approvals[approvalId] = jobId;
  return {jobId, task: TASK, workerId, commandDigest: digest({task: TASK}), cancelAllowed: true};
}
export function cancelJob(state, principal, jobId) {
  assertOwner(principal); const job = state.jobs[jobId];
  if (!job || job.terminal) fail('JOB_NOT_ACTIVE');
  job.cancel = true;
  if (!job.claimed) { job.terminal = true; job.outcome = 'CANCELLED'; }
}
function applyWorker(state, envelope, now) {
  const worker = state.workers[envelope?.request?.workerId];
  if (!worker?.enabled) fail('WORKER_DISABLED');
  const request = verifyEnvelope(envelope, worker.publicKey, now);
  validateRequest(request);
  const key = `${request.workerId}:${request.requestId}`, requestDigest = digest(request);
  if (Object.hasOwn(state.requests, key)) {
    if (state.requests[key].digest !== requestDigest) fail('REQUEST_REPLAY_CONFLICT');
    return structuredClone(state.requests[key].response);
  }
  // Hard cap: one pilot, no unbounded request storage or service loop.
  if (Object.keys(state.requests).length >= 256) fail('PILOT_REQUEST_LIMIT');
  let response;
  if (request.action === 'claim') {
    const job = Object.values(state.jobs).find(j => j.workerId === request.workerId && !j.claimed && !j.terminal);
    if (!job || job.claimBefore < now) response = {job: null};
    else {
      job.claimed = true; job.expiresAt = now + 60_000; job.leaseUntil = now + 15_000;
      response = {job: Object.fromEntries(['jobId', 'attemptId', 'workerId', 'fence', 'task', 'expiresAt', 'leaseUntil'].map(k => [k, job[k]]))};
    }
  } else {
    const body = request.body, job = state.jobs[body.jobId];
    if (!job || !job.claimed || job.workerId !== request.workerId || job.attemptId !== body.attemptId
      || job.fence !== body.fence) fail('JOB_FENCE_MISMATCH');
    if (request.action === 'spawn_intent') {
      if (job.terminal || job.cancel || job.spawnIntent || now >= job.leaseUntil || now >= job.expiresAt) fail('SPAWN_DENIED');
      job.spawnIntent = true; response = {authorized:true,leaseUntil:job.leaseUntil,expiresAt:job.expiresAt};
    } else if (request.action === 'control') {
      // A missed lease is never silently renewed and never causes requeue.
      if (!job.terminal && !job.cancel && now < job.leaseUntil && now < job.expiresAt)
        job.leaseUntil = Math.min(now + 15_000, job.expiresAt);
      response = {cancel: job.cancel || job.terminal || now >= job.leaseUntil || now >= job.expiresAt,
        leaseUntil: job.leaseUntil};
    } else if (request.action === 'events') {
      for (const event of body.events) {
        const prior = job.events.find(e => e.seq === event.seq || e.eventId === event.eventId);
        if (prior) { if (digest(prior) !== digest(event)) fail('EVENT_REPLAY_CONFLICT'); continue; }
        if (job.terminal || event.seq !== job.events.length + 1 || job.events.length >= 128) fail('EVENT_ORDER_OR_LIMIT');
        job.events.push(structuredClone(event));
      }
      response = {acceptedThrough: job.events.length};
    } else {
      if (job.terminal && job.outcome !== body.outcome) fail('TERMINAL_CONFLICT');
      if (!job.terminal && body.outcome === 'COMPLETED') {
        const terminal = job.events.at(-1)?.payload;
        if (terminal?.kind !== 'process_exit' || terminal.processExitCode !== 0 || terminal.signal !== null
          || !job.events.some(e => e.payload.kind === 'turn_completed')
          || job.events.some(e => ['turn_failed', 'provider_error', 'process_error', 'cancel_requested'].includes(e.payload.kind))
          || job.cancel) fail('COMPLETION_EVIDENCE_REQUIRED');
      }
      job.terminal = true; job.outcome = body.outcome;
      response = {terminal: true, outcome: job.outcome};
    }
  }
  // HTTP/DB adapter must atomically commit this receipt AND mutations above.
  state.requests[key] = {digest: requestDigest, response: structuredClone(response)};
  return response;
}
export function handleWorker(state, envelope, now = Date.now()) {
  // Also rollback partial batches in the reference implementation. Production
  // must serialize this whole operation with SELECT FOR UPDATE / transaction.
  const next = structuredClone(state);
  const response = applyWorker(next, envelope, now);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, next);
  return response;
}
export const brokerDeployment = Object.freeze({deployed: false, audience: AUDIENCE,
  databaseAdapterImplemented: false, ownerSessionVerifierImplemented: false});
