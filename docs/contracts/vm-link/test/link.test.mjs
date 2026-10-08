import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtempSync, readFileSync, rmSync, symlinkSync, chmodSync, linkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {emptyBroker, assertOwner, registerWorker, approveSmoke, cancelJob, handleWorker} from '../src/broker.mjs';
import {AUDIENCE, OWNER, TASK, signedRequest, verifyEnvelope, validateJob} from '../src/protocol.mjs';
import {openJournal, initialJournal} from '../src/journal.mjs';
import {runPilot, reconcileOnly} from '../src/worker.mjs';
import {createTransport} from '../src/transport.mjs';
import {fixedArgv} from '../src/runtime.mjs';
import {emptyPayload} from '../vendor/safe-payload.mjs';

const principal = {subject: OWNER, aal: 'aal2', sessionCurrent: true};
function fixture() {
  const pair = generateKeyPairSync('ed25519'); // Ephemeral synthetic signing fixture; never persisted.
  const state = emptyBroker();
  registerWorker(state, principal, 'worker_1', pair.publicKey.export({type: 'spki', format: 'pem'}));
  const job = approveSmoke(state, principal, 'worker_1', 'approval_1');
  const envelope = (action, body = {}, id) => signedRequest(pair.privateKey, 'worker_1', action, body, Date.now(), id);
  const request = async (action, body) => handleWorker(state, envelope(action, body));
  return {pair, state, job, envelope, request};
}
function memoryJournal(state = initialJournal()) {
  return {read: () => structuredClone(state), write: next => {state = structuredClone(next);}};
}
function tmpJournal() {
  const root = mkdtempSync(join(tmpdir(), 'mc-link-test-'));
  return {root, journal: openJournal(root), cleanup: () => rmSync(root, {recursive: true, force: true})};
}
function completedPort(lines = ['{"type":"thread.started","thread_id":"synthetic_thread"}',
  '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"PRIVATE_MESSAGE_MUST_BE_DROPPED"}}',
  '{"type":"turn.completed","usage":{"input_tokens":123}}']) {
  return {stdout: Readable.from([lines.join('\n') + '\n']), stderr: Readable.from(['SECRET_STDERR_MUST_BE_DROPPED']),
    exit: Promise.resolve({code: 0, signal: null, spawnError: false}), terminate() {}};
}
function event(seq, payload = emptyPayload('turn_started')) {
  return {eventId: `event_${seq}`, seq, observedAt: Date.now(), payload};
}

test('Owner registration/admission requires fixed subject, AAL2 and current session', () => {
  for (const invalid of [{...principal, subject: 'other'}, {...principal, aal: 'aal1'}, {...principal, sessionCurrent: false}, null])
    assert.throws(() => assertOwner(invalid), {code: 'OWNER_AAL2_REQUIRED'});
  assertOwner(principal);
});
test('signed audience, worker, body and timestamp cannot be changed', () => {
  const f = fixture(), envelope = f.envelope('claim');
  assert.equal(verifyEnvelope(envelope, f.state.workers.worker_1.publicKey).action, 'claim');
  for (const alter of [e => {e.request.audience = 'https://example.invalid';}, e => {e.request.workerId = 'other';},
    e => {e.request.issuedAt -= 31_000;}, e => {e.request.body.command = 'arbitrary';}]) {
    const changed = structuredClone(envelope); alter(changed); assert.throws(() => handleWorker(f.state, changed));
  }
});
test('replayed request returns same claim; a new request cannot claim again', async () => {
  const f = fixture(), envelope = f.envelope('claim', {}, 'request_1');
  const first = handleWorker(f.state, envelope);
  assert.deepEqual(handleWorker(f.state, envelope), first);
  assert.deepEqual(await f.request('claim', {}), {job: null});
  assert.equal(Object.values(f.state.jobs).filter(j => j.claimed).length, 1);
});
test('same request identifier with another signed body is refused', () => {
  const f = fixture(); handleWorker(f.state, f.envelope('claim', {}, 'request_1'));
  const altered = f.envelope('claim', {}, 'request_1'); altered.request.issuedAt += 1;
  const signed = signedRequest(f.pair.privateKey, 'worker_1', 'claim', {}, altered.request.issuedAt, 'request_1');
  assert.throws(() => handleWorker(f.state, signed), {code: 'REQUEST_REPLAY_CONFLICT'});
});
test('only one active job is admitted and worker has no approve action', () => {
  const f = fixture();
  assert.throws(() => approveSmoke(f.state, principal, 'worker_1', 'approval_2'), {code: 'APPROVAL_CONFLICT'});
  assert.throws(() => f.envelope('approve', {}), {code: 'INVALID_REQUEST'});
});
test('unexpected task, arbitrary argv and wrong worker in a claim fail closed', async () => {
  const f = fixture(), {job} = await f.request('claim', {});
  for (const altered of [{...job, task: 'SHELL'}, {...job, argv: ['rm']}, {...job, workerId: 'other'}])
    assert.throws(() => validateJob(altered, 'worker_1'), {code: 'INVALID_JOB'});
});
test('stale fence cannot post events or finish', async () => {
  const f = fixture(), {job} = await f.request('claim', {});
  const body = {jobId: job.jobId, attemptId: job.attemptId, fence: 2};
  await assert.rejects(f.request('events', {...body, events: [event(1)]}), {code: 'JOB_FENCE_MISMATCH'});
});
test('events deduplicate by stable ID and sequence; conflicting batches roll back', async () => {
  const f = fixture(), {job} = await f.request('claim', {});
  const body = {jobId: job.jobId, attemptId: job.attemptId, fence: job.fence};
  const first = event(1);
  assert.deepEqual(await f.request('events', {...body, events: [first]}), {acceptedThrough: 1});
  assert.deepEqual(await f.request('events', {...body, events: [first]}), {acceptedThrough: 1});
  await assert.rejects(f.request('events', {...body, events: [event(2), event(4)]}), {code: 'EVENT_ORDER_OR_LIMIT'});
  assert.equal(f.state.jobs[job.jobId].events.length, 1);
  await assert.rejects(f.request('events', {...body, events: [{...first, observedAt: first.observedAt + 1}]}), {code: 'EVENT_REPLAY_CONFLICT'});
});
test('expired lease cancels instead of renewing or requeueing', async () => {
  const f = fixture(), {job} = await f.request('claim', {});
  f.state.jobs[job.jobId].leaseUntil = Date.now() - 1;
  const control = await f.request('control', {jobId: job.jobId, attemptId: job.attemptId, fence: job.fence});
  assert.equal(control.cancel, true); assert.deepEqual(await f.request('claim', {}), {job: null});
});
test('exit zero alone is insufficient for COMPLETED', async () => {
  const f = fixture(), {job} = await f.request('claim', {});
  const body = {jobId: job.jobId, attemptId: job.attemptId, fence: job.fence};
  await assert.rejects(f.request('finish', {...body, outcome: 'COMPLETED'}), {code: 'COMPLETION_EVIDENCE_REQUIRED'});
});
test('real disk journal is private, durable and single-writer', () => {
  const f = tmpJournal();
  try {
    assert.throws(() => openJournal(f.root), {code: 'EEXIST'});
    const state = initialJournal(); state.phase = 'CLAIMING'; f.journal.write(state); f.journal.close();
    const next = openJournal(f.root); assert.equal(next.read().phase, 'CLAIMING'); next.close();
  } finally { f.journal.close(); f.cleanup(); }
});
test('journal refuses extra fields, unsafe mode, symlinks and hard links', () => {
  const f = tmpJournal();
  try {
    assert.throws(() => f.journal.write({...initialJournal(), secret: 'forbidden'}), {code: 'INVALID_JOURNAL'});
    f.journal.write(initialJournal()); f.journal.close();
    linkSync(join(f.root, 'journal.json'), join(f.root, 'alias'));
    assert.throws(() => openJournal(f.root), {code: 'UNSAFE_JOURNAL_FILE'});
    rmSync(join(f.root, 'alias')); chmodSync(join(f.root, 'journal.json'), 0o644);
    assert.throws(() => openJournal(f.root), {code: 'UNSAFE_JOURNAL_FILE'});
    chmodSync(join(f.root, 'journal.json'), 0o600);
    symlinkSync(f.root, `${f.root}-link`);
    assert.throws(() => openJournal(`${f.root}-link`), {code: 'UNSAFE_JOURNAL_ROOT'});
    rmSync(`${f.root}-link`);
  } finally { f.journal.close(); f.cleanup(); }
});
test('durable spawn intent precedes exactly one synthetic process start and safe completion', async () => {
  const f = fixture(), disk = tmpJournal(); let starts = 0;
  try {
    const outcome = await runPilot({workerId: 'worker_1', journal: disk.journal, request: f.request,
      startProcess: () => { assert.equal(disk.journal.read().phase, 'SPAWN_INTENT'); starts++; return completedPort(); }, controlMs: 1});
    assert.equal(outcome, 'COMPLETED'); assert.equal(starts, 1); assert.equal(disk.journal.read().phase, 'FINISHED');
    const text = readFileSync(join(disk.root, 'journal.json'), 'utf8');
    assert.ok(!text.includes('PRIVATE_MESSAGE')); assert.ok(!text.includes('SECRET_STDERR')); assert.ok(!text.includes('input_tokens'));
    await assert.rejects(runPilot({workerId: 'worker_1', journal: disk.journal, request: f.request, startProcess: () => { starts++; }}), {code: 'RECOVERY_REQUIRED'});
    assert.equal(starts, 1);
  } finally { disk.journal.close(); disk.cleanup(); }
});
test('lost claim ACK leaves durable CLAIMING and cannot auto-relaunch', async () => {
  const journal = memoryJournal(); let requests = 0, starts = 0;
  await assert.rejects(runPilot({workerId: 'worker_1', journal, request: async () => {requests++; throw new Error('lost');}, startProcess: () => {starts++;}}));
  assert.equal(journal.read().phase, 'CLAIMING');
  await assert.rejects(runPilot({workerId: 'worker_1', journal, request: async () => {requests++;}, startProcess: () => {starts++;}}), {code: 'RECOVERY_REQUIRED'});
  assert.equal(requests, 1); assert.equal(starts, 0);
});
test('Owner cancel terminates the synthetic process and records cancellation', async () => {
  const f = fixture(), journal = memoryJournal(); let resolveExit, stops = 0;
  const exit = new Promise(resolve => {resolveExit = resolve;});
  const outcome = await runPilot({workerId: 'worker_1', journal, request: f.request, controlMs: 1,
    startProcess: () => {
      cancelJob(f.state, principal, f.job.jobId);
      return {stdout: Readable.from((async function*() {yield '{"type":"turn.started"}\n'; await exit;})()),
        stderr: Readable.from([]), exit, terminate: () => {stops++; resolveExit({code: null, signal: 'SIGTERM', spawnError: false});}};
    }});
  assert.equal(outcome, 'CANCELLED'); assert.ok(stops >= 1);
  assert.ok(journal.read().events.some(e => e.payload.kind === 'cancel_requested'));
});
test('lost terminal ACK is reconciled with safe events and never claims or spawns', async () => {
  const f = fixture(), journal = memoryJournal(); let lost = false;
  const request = async (action, body) => { const reply = await f.request(action, body);
    if (action === 'finish' && !lost) {lost = true; throw new Error('lost ACK');} return reply; };
  await assert.rejects(runPilot({workerId: 'worker_1', journal, request, startProcess: () => completedPort(), controlMs: 1}));
  assert.equal(journal.read().phase, 'TERMINAL_LOCAL');
  const actions = [];
  assert.equal(await reconcileOnly({journal, request: async (action, body) => {actions.push(action); return f.request(action, body);}}), 'COMPLETED');
  assert.ok(!actions.includes('claim')); assert.equal(journal.read().phase, 'FINISHED');
});
test('a terminal provider error is not erased by later turn.completed and exit zero', async () => {
  const f = fixture(), journal = memoryJournal();
  const result = await runPilot({workerId: 'worker_1', journal, request: f.request, controlMs: 1,
    startProcess: () => completedPort(['{"type":"error","message":"PRIVATE_ERROR"}', '{"type":"turn.completed"}'])});
  assert.equal(result, 'FAILED');
});
test('transport uses exact HTTPS audience, refuses redirects/403, and never returns raw bodies', async () => {
  const f = fixture(); let input;
  const request = createTransport({workerId: 'worker_1', privateKey: f.pair.privateKey,
    fetchImpl: async (url, options) => {input = {url, options}; return new Response('PRIVATE_ERROR', {status: 403});}});
  await assert.rejects(request('claim', {}), {code: 'BROKER_HTTP_403'});
  assert.equal(input.url, AUDIENCE); assert.equal(input.options.redirect, 'error');
  assert.ok(!Object.hasOwn(input.options.headers, 'authorization')); assert.ok(!Object.hasOwn(input.options.headers, 'apikey'));
});
test('runtime argv is fixed read-only ChatGPT mode, without a shell job input', () => {
  const args = fixedArgv('/synthetic/empty');
  assert.ok(args.includes('read-only')); assert.ok(args.includes('forced_login_method="chatgpt"'));
  assert.ok(args.includes('--ignore-user-config')); assert.equal(args.at(-2), '--');
});
test('crash-safe persistence failure before spawn cannot start a process', async () => {
  const f = fixture(); let state = initialJournal(), starts = 0;
  const journal = {read: () => structuredClone(state), write: next => {
    if (next.phase === 'SPAWN_INTENT') { const error = new Error('fixture'); error.code = 'PERSISTENCE_UNCERTAIN'; throw error; }
    state = structuredClone(next);
  }};
  await assert.rejects(runPilot({workerId: 'worker_1', journal, request: f.request, startProcess: () => {starts++;}}), {code: 'PERSISTENCE_UNCERTAIN'});
  assert.equal(starts, 0); assert.equal(state.phase, 'CLAIMED');
});
test('unparseable provider stdout fails closed even with process exit zero', async () => {
  const f = fixture(), journal = memoryJournal(); let stops = 0;
  const result = await runPilot({workerId: 'worker_1', journal, request: f.request, controlMs: 1,
    startProcess: () => ({...completedPort(['not-json-PRIVATE_RAW']), terminate: () => {stops++;}})});
  assert.equal(result, 'UNKNOWN'); assert.ok(stops > 0);
  assert.ok(!JSON.stringify(journal.read()).includes('PRIVATE_RAW'));
});
