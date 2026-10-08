import {createHash, createPublicKey, randomUUID, sign, verify} from 'node:crypto';
import {canonical, exactKeys, fail, identifier, jsonData} from '../vendor/data.mjs';
import {validatePayload} from '../vendor/safe-payload.mjs';

export const VERSION = 'mc.vm-link.v1';
export const AUDIENCE = 'https://scmvedfqwlhkyvljymjj.supabase.co/functions/v1/mc-worker-link-v1';
export const OWNER = '6f0ca2ae-83e0-4684-af12-0b37d08182db';
export const TASK = 'SMOKE_CONNECTION_V1';
export const TASK_SECONDS = 60;
export const PROMPT = '只回覆 MC_CONNECTION_OK。不要呼叫工具、讀寫檔案、執行命令、瀏覽網頁、連外或委派。';
export const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
const keys = ['version', 'workerId', 'requestId', 'issuedAt', 'audience', 'action', 'body'];
const actions = ['pair', 'identity', 'claim', 'spawn_intent', 'control', 'events', 'finish'];
export function validateRequest(request) {
  jsonData(request, {maxBytes: 48_000, maxString: 256});
  if (!exactKeys(request, keys) || request.version !== VERSION || !identifier(request.workerId)
    || !identifier(request.requestId) || request.audience !== AUDIENCE || !actions.includes(request.action)
    || !Number.isSafeInteger(request.issuedAt)) fail('INVALID_REQUEST');
  const body = request.body;
  const jobFields = ['jobId', 'attemptId', 'fence'];
  const bodyKeys = ['claim','identity'].includes(request.action) ? [] : request.action === 'pair' ? ['pairingCode','publicKey'] : request.action === 'events'
    ? [...jobFields, 'events'] : request.action === 'finish' ? [...jobFields, 'outcome'] : jobFields;
  if (!exactKeys(body, bodyKeys)) fail('INVALID_REQUEST');
  if (!['claim','identity','pair'].includes(request.action) && (!identifier(body.jobId) || !identifier(body.attemptId)
    || !Number.isSafeInteger(body.fence) || body.fence < 1)) fail('INVALID_REQUEST');
  if (request.action === 'pair' && (typeof body.pairingCode !== 'string' || !/^mc_pair_[A-Za-z0-9_-]{43}$/.test(body.pairingCode) || typeof body.publicKey !== 'string' || body.publicKey.length > 256)) fail('INVALID_PAIRING');
  if (request.action === 'events') {
    if (!Array.isArray(body.events) || !body.events.length || body.events.length > 16) fail('INVALID_EVENTS');
    for (const event of body.events) {
      if (!exactKeys(event, ['eventId', 'seq', 'observedAt', 'payload']) || !identifier(event.eventId)
        || !Number.isSafeInteger(event.seq) || event.seq < 1 || !Number.isSafeInteger(event.observedAt)) fail('INVALID_EVENTS');
      validatePayload(event.payload);
    }
  }
  if (request.action === 'finish' && !['COMPLETED', 'FAILED', 'CANCELLED', 'UNKNOWN'].includes(body.outcome)) fail('INVALID_OUTCOME');
  return request;
}
export function signedRequest(privateKey, workerId, action, body, now = Date.now(), requestId = randomUUID()) {
  const request = validateRequest({version: VERSION, workerId, requestId, issuedAt: now, audience: AUDIENCE, action, body});
  return {request, signature: sign(null, Buffer.from(canonical(request)), privateKey).toString('base64')};
}
export function verifyEnvelope(envelope, publicKey, now = Date.now()) {
  if (!exactKeys(envelope, ['request', 'signature']) || typeof envelope.signature !== 'string'
    || !/^[A-Za-z0-9+/]{86}==$/.test(envelope.signature)) fail('INVALID_SIGNATURE');
  const request = validateRequest(envelope.request), key = createPublicKey(publicKey);
  if (key.asymmetricKeyType !== 'ed25519' || Math.abs(now - request.issuedAt) > 30_000
    || !verify(null, Buffer.from(canonical(request)), key, Buffer.from(envelope.signature, 'base64'))) fail('INVALID_SIGNATURE');
  return request;
}
export function validateJob(job, workerId, now = Date.now()) {
  if (!exactKeys(job, ['jobId', 'attemptId', 'workerId', 'fence', 'task', 'expiresAt', 'leaseUntil'])
    || !identifier(job.jobId) || !identifier(job.attemptId) || job.workerId !== workerId || job.task !== TASK
    || !Number.isSafeInteger(job.fence) || job.fence < 1 || !Number.isSafeInteger(job.expiresAt)
    || !Number.isSafeInteger(job.leaseUntil) || job.expiresAt <= now || job.expiresAt > now + 65_000
    || job.leaseUntil <= now || job.leaseUntil > now + 20_000 || job.leaseUntil > job.expiresAt) fail('INVALID_JOB');
  return job;
}
