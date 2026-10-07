// All Agent/runtime events in this file are AUTHORED SYNTHETIC FIXTURES.
// No Codex child, model invocation, credential, network or database is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {appendObservation, emptyObservation, observationView, restoreObservation} from '../docs/contracts/supervisor/observation.mjs';
import {bindingForCandidate, createInactiveSupervisorCandidate} from '../docs/contracts/supervisor/candidate.mjs';
import {prepareCandidateLaunch, validateCommandRequest, validateLaunchPolicy} from '../docs/contracts/supervisor/launch-policy.mjs';
import {createCodexJsonlFramer, emptyPayload, normalizeCodexJsonl} from '../docs/contracts/supervisor/codex-jsonl.mjs';
import {createCandidateJournal} from '../docs/contracts/supervisor/journal.mjs';
import {createInactiveObservationSupervisor} from '../docs/contracts/supervisor/supervisor.mjs';
import {productionResponse} from '../api/index.mjs';
import {fixtureTime as t, supervisorFixture} from './helpers/supervisor-fixture.mjs';

const start = {type: 'thread.started', thread_id: 'synthetic_thread_1'};
const turn = {type: 'turn.started'};
const completed = {type: 'turn.completed'};
const journalFile = f => path.join(f.root, 'process-observations.v2.json');

test('inactive cloud-container plan validates exact executable/workspace and never activates or claims permission', async tc => {
  const f = await supervisorFixture(tc);
  assert.equal(f.plan.baselineObserved, false); assert.equal(f.plan.taskPermissionVerified, false);
  assert.equal(f.plan.effectiveRuntimePolicyVerified, false);
  assert.ok(Object.values(f.plan.capabilities).every(value => value === false));
  assert.throws(() => f.supervisor.activate(), /CANDIDATE_ACTIVATION_DISABLED/);
  const view = await f.supervisor.view(t(0));
  assert.equal(view.current.status, 'disconnected_candidate'); assert.equal(view.current.runtimeConnected, false);
  assert.equal(view.current.agent, null); assert.equal(view.current.task, null); assert.equal(view.current.model, null);
  assert.equal(view.observed.freshness, 'unknown'); assert.equal(view.observed.outcome, 'unknown');
  assert.equal(view.ownerAcceptance, 'NOT_INFERRED'); assert.equal(view.testOnly, true);
  assert.equal(f.supervisor.describe().hostPersistenceVerified, false);
  assert.equal(await fs.readFile(f.request.executable, 'utf8'), 'SYNTHETIC_EXECUTABLE_NEVER_RUN\n');
});

test('shell/bypass/config/environment/unknown options and sibling workspaces cannot enter a command plan', async tc => {
  const f = await supervisorFixture(tc);
  const bad = [{...f.request, executable: '/bin/sh'}, {...f.request, workspace: f.request.workspace + '-evil'},
    {...f.request, baselineSha: 'b'.repeat(40)}, {...f.request, env: {TOKEN: 'synthetic'}},
    {...f.request, argv: ['exec', '--json', '--dangerously-bypass-approvals-and-sandbox']},
    {...f.request, argv: [...f.request.argv.slice(0, 8), '', '--extra']},
    {...f.request, argv: [...f.request.argv.slice(0, 8), 'x\0y']},
    {...f.request, argv: ['exec', '--json', '--sandbox', 'workspace-write', ...f.request.argv.slice(4)]}];
  for (const request of bad) assert.throws(() => validateCommandRequest(f.policy, request), /COMMAND_SCOPE_REJECTED/);
  assert.throws(() => validateLaunchPolicy({...f.policy, sandbox: 'danger-full-access'}), /INVALID_LAUNCH_POLICY/);
  assert.throws(() => validateLaunchPolicy({...f.policy, allowedWorkspaces: [f.request.workspace, f.request.workspace]}), /INVALID_LAUNCH_POLICY/);
  const literalPrompt = {...f.request, argv: [...f.request.argv.slice(0, 8), 'SYNTHETIC $(never-run) `never-run`; literal prompt']};
  assert.equal(validateCommandRequest(f.policy, literalPrompt).request.argv[8], literalPrompt.argv[8]);
});

test('actual candidate path validation rejects executable/workspace symlinks, nonexistent paths and non-executable file', async tc => {
  const f = await supervisorFixture(tc);
  const link = path.join(f.files, 'linked-workspace'); await fs.symlink(f.request.workspace, link);
  await assert.rejects(prepareCandidateLaunch({...f.policy, allowedWorkspaces: [link]},
    {...f.request, workspace: link, argv: [...f.request.argv.slice(0, 6), link, ...f.request.argv.slice(7)]}), /PATH_SCOPE_REJECTED/);
  const binaryLink = path.join(f.files, 'linked-codex'); await fs.symlink(f.request.executable, binaryLink);
  await assert.rejects(prepareCandidateLaunch({...f.policy, executable: binaryLink}, {...f.request, executable: binaryLink}), /PATH_SCOPE_REJECTED/);
  await fs.chmod(f.request.executable, 0o600);
  await assert.rejects(prepareCandidateLaunch(f.policy, f.request), /EXECUTABLE_REJECTED/);
  await fs.rm(f.request.workspace, {recursive: true});
  await assert.rejects(prepareCandidateLaunch(f.policy, f.request), /ENOENT/);
});

test('bounded redaction keeps typed item metadata; raw command/code/message/model/time/identity/usage never persist', async tc => {
  const f = await supervisorFixture(tc);
  await f.deliver(start, 1); await f.deliver(turn, 2);
  const event = {type: 'item.completed', model: 'SYNTHETIC_PRIVATE_MODEL', verified: true, timestamp: t(0),
    identity: 'SYNTHETIC_PRIVATE_IDENTITY', usage: {input_tokens: 99}, item: {id: 'synthetic_item_1',
      type: 'command_execution', status: 'completed', exit_code: 1, command: 'SYNTHETIC_PRIVATE_COMMAND',
      aggregated_output: 'SYNTHETIC_PRIVATE_OUTPUT', text: 'SYNTHETIC_PRIVATE_TEXT',
      changes: [{path: '/SYNTHETIC_PRIVATE_PATH', diff: 'SYNTHETIC_PRIVATE_CODE'}]}};
  assert.equal((await f.deliver(event, 3)).accepted, true);
  const bytes = await fs.readFile(journalFile(f), 'utf8');
  assert.doesNotMatch(bytes, /SYNTHETIC_PRIVATE/);
  assert.doesNotMatch(bytes, /"argv"|"workspace"|"executable"|"timestamp"|input_tokens/);
  const view = await f.supervisor.view(t(3));
  assert.equal(view.history[2].payload.commandExitCode, 1); assert.equal(view.history[2].sourceEventAt, null);
  assert.equal(view.observed.turnStatus, 'in_progress'); assert.equal(view.current.model, null);
  assert.equal(view.current.runtimeConnected, false); assert.equal(view.qualification, 'SYNTHETIC_FIXTURE');
});

test('candidate cannot be upgraded by plan capabilities, verified qualification or extra caller fields', async tc => {
  const f = await supervisorFixture(tc);
  assert.throws(() => bindingForCandidate(f.plan, {qualification: 'VERIFIED_CHILD_PIPE'}), /INVALID_BINDING/);
  assert.throws(() => bindingForCandidate({...f.plan, capabilities: {...f.plan.capabilities, dispatch: true}}), /INVALID_CANDIDATE_PLAN/);
  const result = await f.supervisor.ingestCodex({...f.metadata(1), line: JSON.stringify(start), qualification: 'VERIFIED'});
  assert.equal(result.error, 'INVALID_INPUT'); assert.equal((await f.supervisor.snapshot()).revision, 0);
});

test('source time stays absent; read/redraw/silence/transport metadata do not renew provider freshness', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1);
  assert.equal((await f.supervisor.view(t(61))).observed.freshness, 'stale');
  f.setTime(61); await f.supervisor.recordSyntheticTransport({...f.metadata(2, 61), payload: emptyPayload('transport_open')});
  const stale = await f.supervisor.view(t(62));
  assert.equal(stale.observed.lastProviderEventAt, t(0)); assert.equal(stale.observed.freshness, 'stale');
  assert.equal(stale.sourceEventAt, null); assert.equal(stale.current.runtimeConnected, false);
  // A genuine-shaped new fixture event may resume observation on the same
  // bound attempt after silence; expiry is not a fictitious session restart.
  assert.equal((await f.deliver(turn, 3, 63)).accepted, true);
  assert.equal((await f.supervisor.view(t(64))).observed.freshness, 'observed_recently');
});

test('identical late replay retains original receipt/times and bytes; changed ID payload conflicts', async tc => {
  const f = await supervisorFixture(tc); const first = await f.deliver(start, 1);
  const bytes = await fs.readFile(journalFile(f), 'utf8'); f.setTime(200);
  const replay = await f.supervisor.ingestCodex({...f.metadata(1, 200), expectedRevision: 999, line: JSON.stringify({...start, text: 'SYNTHETIC_DROPPED'})});
  assert.equal(replay.duplicate, true); assert.deepEqual(replay.receipt, first.receipt);
  assert.equal(await fs.readFile(journalFile(f), 'utf8'), bytes);
  assert.equal((await f.supervisor.view(t(200))).observed.freshness, 'stale');
  const conflict = await f.supervisor.ingestCodex({...f.metadata(1, 200), line: JSON.stringify({...start, thread_id: 'synthetic_other'})});
  assert.equal(conflict.error, 'EVENT_ID_CONFLICT'); assert.equal(await fs.readFile(journalFile(f), 'utf8'), bytes);
});

test('sequence/CAS/time and binding conflicts reject without replacing accepted history', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1);
  const bytes = await fs.readFile(journalFile(f), 'utf8'); f.setTime(2);
  for (const [patch, error] of [[{sequence: 3}, 'SEQUENCE_CONFLICT'], [{expectedRevision: 0}, 'REVISION_CONFLICT'],
    [{observedAt: t(3)}, 'TIME_CONFLICT'], [{observedAt: '2026-02-30T10:00:00Z'}, 'INVALID_TIME']]) {
    const result = await f.supervisor.ingestCodex({...f.metadata(2, 2), line: JSON.stringify(turn), ...patch});
    assert.equal(result.error, error);
  }
  assert.equal(await fs.readFile(journalFile(f), 'utf8'), bytes);
  const forged = structuredClone(await f.supervisor.snapshot()); forged.events[0].digest = 'b'.repeat(64);
  assert.throws(() => restoreObservation(forged, f.binding), /CORRUPT_SNAPSHOT/);
  assert.equal(appendObservation(forged, {...f.metadata(2, 2), payload: normalizeCodexJsonl(JSON.stringify(turn))}, f.binding, t(2)).accepted, false);
  assert.throws(() => restoreObservation(awaitableSnapshot(bytes), {...f.binding, attemptId: 'different_attempt'}), /CORRUPT_SNAPSHOT/);
});
function awaitableSnapshot(bytes) { return JSON.parse(bytes).state; }

test('turn completion is distinct from process exit and allows a subsequent turn on the same session', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1); await f.deliver(turn, 2); await f.deliver(completed, 3);
  let view = await f.supervisor.view(t(3));
  assert.equal(view.observed.turnStatus, 'completed'); assert.equal(view.observed.processStatus, 'unobserved');
  assert.equal(view.observed.outcome, 'unknown');
  assert.equal((await f.deliver(turn, 4)).accepted, true); await f.deliver(completed, 5);
  await f.transport({...emptyPayload('process_exit'), processExitCode: 0}, 6);
  view = await f.supervisor.view(t(6));
  assert.equal(view.observed.turnNumber, 2); assert.equal(view.observed.outcome, 'completed_turn_and_zero_exit_observed');
  assert.equal(view.ownerAcceptance, 'NOT_INFERRED'); assert.equal(view.current.task, null);
  assert.equal((await f.deliver(turn, 7)).error, 'PROCESS_ALREADY_EXITED');
});

test('cancellation is an intent with no signal sent; only a subsequent typed termination records its outcome', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1); await f.deliver(turn, 2); f.setTime(2);
  const cancel = await f.supervisor.requestCancellation(f.metadata(3));
  assert.equal(cancel.signalSent, false); assert.equal(cancel.requestOnly, true);
  let view = await f.supervisor.view(t(3)); assert.equal(view.observed.outcome, 'unknown');
  assert.equal(view.observed.lastProviderEventAt, t(1));
  await f.transport({...emptyPayload('process_exit'), signal: 'SIGTERM'}, 4);
  view = await f.supervisor.view(t(4));
  assert.equal(view.observed.outcome, 'termination_observed_after_cancel_request');
  assert.equal(view.observed.signal, 'SIGTERM'); assert.equal(view.current.runtimeConnected, false);
});

test('completed/zero exit racing a cancellation request does not become cancelled', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1); await f.deliver(turn, 2); f.setTime(2);
  await f.supervisor.requestCancellation(f.metadata(3)); await f.deliver(completed, 4);
  await f.transport({...emptyPayload('process_exit'), processExitCode: 0}, 5);
  assert.equal((await f.supervisor.view(t(5))).observed.outcome, 'completed_turn_and_zero_exit_observed');
});

test('EOF is unknown exit/outcome, nonzero exit is observed failure, and spawn/error text is withheld', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1); await f.deliver(turn, 2);
  await f.transport(emptyPayload('stdout_eof'), 3);
  const eof = await f.supervisor.view(t(3)); assert.equal(eof.observed.outcome, 'unknown');
  assert.equal(eof.observed.exitCode, null); assert.equal(eof.observed.transportStatus, 'eof_observed');
  assert.equal((await f.deliver(completed, 4)).error, 'TRANSPORT_ALREADY_ENDED');
  await f.transport({...emptyPayload('process_exit'), processExitCode: 1}, 4);
  assert.equal((await f.supervisor.view(t(4))).observed.outcome, 'failed_exit_observed');
  const raw = normalizeCodexJsonl('{"type":"error","message":"SYNTHETIC_PRIVATE_FAILURE","code":"SECRET_CUSTOM_CODE"}');
  assert.equal(raw.errorClass, 'PROVIDER_ERROR'); assert.doesNotMatch(JSON.stringify(raw), /PRIVATE|SECRET/);
});

test('spawn failure remains missing session and blocks new source events on that attempt', async tc => {
  const f = await supervisorFixture(tc);
  await f.transport({...emptyPayload('process_error'), errorClass: 'SPAWN_FAILURE'}, 1);
  const view = await f.supervisor.view(t(1));
  assert.equal(view.observed.threadId, null); assert.equal(view.observed.freshness, 'unknown');
  assert.equal(view.observed.outcome, 'failed_to_start_observed');
  assert.equal((await f.deliver(start, 2)).error, 'PROCESS_ALREADY_EXITED');
});

test('missing startup, item sequence, contradictory status and terminal item mutation reject', async tc => {
  const f = await supervisorFixture(tc);
  assert.equal((await f.deliver(turn, 1)).error, 'SESSION_REQUIRED');
  await f.deliver(start, 1); await f.deliver(turn, 2);
  const item = {id: 'synthetic_item', type: 'command_execution', status: 'in_progress'};
  assert.equal((await f.deliver({type: 'item.updated', item}, 3)).error, 'ITEM_START_REQUIRED');
  assert.equal((await f.deliver({type: 'item.started', item: {...item, status: 'completed'}}, 3)).error, 'INVALID_SAFE_PAYLOAD');
  await f.deliver({type: 'item.started', item}, 3);
  await f.deliver({type: 'item.completed', item: {...item, status: 'completed', exit_code: 0}}, 4);
  assert.equal((await f.deliver({type: 'item.updated', item}, 5)).error, 'ITEM_CONFLICT');
});

test('unverified imports cannot claim OS transport, signal or activated source', async tc => {
  const f = await supervisorFixture(tc, {qualification: 'UNVERIFIED_IMPORTED_JSONL'}); await f.deliver(start, 1);
  assert.equal((await f.transport(emptyPayload('transport_open'), 2)).error, 'SYNTHETIC_TRANSPORT_ONLY');
  assert.equal((await f.supervisor.requestCancellation(f.metadata(2))).signalSent, false);
  const view = await f.supervisor.view(t(2));
  assert.equal(view.qualification, 'UNVERIFIED_IMPORTED_JSONL'); assert.equal(view.testOnly, false);
  assert.equal(view.current.runtimeConnected, false);
});

test('cancellation scope and malformed exit signal/code cannot record success', async tc => {
  const f = await supervisorFixture(tc, {policy: {cancelAllowed: false}}); f.setTime(0);
  assert.equal((await f.supervisor.requestCancellation(f.metadata(1))).error, 'CANCELLATION_SCOPE_REJECTED');
  for (const patch of [{processExitCode: 0, signal: 'SIGTERM'}, {processExitCode: -1}, {signal: 'SYNTHETIC_SECRET_SIGNAL'}, {}]) {
    const result = await f.transport({...emptyPayload('process_exit'), ...patch}, 1);
    assert.equal(result.error, 'INVALID_SAFE_PAYLOAD');
  }
  assert.equal((await f.supervisor.snapshot()).revision, 0);
});

test('single-writer lease refuses concurrent/stale ownership rather than stealing it', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1);
  await assert.rejects(createInactiveSupervisorCandidate(f.config), /WRITER_BUSY/);
  const lock = journalFile(f) + '.writer.lock', bytes = await fs.readFile(lock, 'utf8');
  await fs.utimes(lock, 1, 1);
  await assert.rejects(createInactiveSupervisorCandidate(f.config), /WRITER_BUSY/);
  assert.equal(await fs.readFile(lock, 'utf8'), bytes);
});

test('restart restores exact private receipts and stale view without implicit dispatch/resume', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1);
  const bytes = await fs.readFile(journalFile(f), 'utf8'); await f.supervisor.close(); f.setTime(500);
  f.supervisor = await createInactiveSupervisorCandidate(f.config);
  assert.equal((await f.supervisor.view(t(500))).observed.freshness, 'stale');
  assert.throws(() => f.supervisor.activate(), /CANDIDATE_ACTIVATION_DISABLED/);
  const replay = await f.supervisor.ingestCodex({...f.metadata(1, 500), line: JSON.stringify(start)});
  assert.equal(replay.duplicate, true); assert.equal(await fs.readFile(journalFile(f), 'utf8'), bytes);
  await f.supervisor.close();
  await assert.rejects(createInactiveSupervisorCandidate({...f.config, plan: {...f.plan, policy: {...f.plan.policy, missionId: 'other'}}}), /PLAN_DIGEST_MISMATCH/);
  f.supervisor = null;
});

test('capacity refuses without truncation, and accepted replay still works at capacity', async tc => {
  const f = await supervisorFixture(tc, {policy: {maxEvents: 2}}); await f.deliver(start, 1); await f.deliver(turn, 2);
  const bytes = await fs.readFile(journalFile(f), 'utf8');
  assert.equal((await f.deliver(completed, 3)).error, 'EVENT_CAPACITY');
  assert.equal(await fs.readFile(journalFile(f), 'utf8'), bytes);
  f.setTime(100); assert.equal((await f.supervisor.ingestCodex({...f.metadata(1, 100), line: JSON.stringify(start)})).duplicate, true);
});

test('byte capacity refuses rather than pruning old source/receipt identity', async tc => {
  const f = await supervisorFixture(tc, {policy: {maxBytes: 4_096}}); await f.deliver(start, 1); await f.deliver(turn, 2);
  let result, sequence = 3;
  for (; sequence < 20; sequence++) {
    result = await f.deliver({type: 'item.completed', item: {id: 'synthetic_' + sequence, type: 'agent_message', text: 'SYNTHETIC_DISCARDED'}}, sequence);
    if (!result.accepted) break;
  }
  assert.equal(result.accepted, false); assert.ok(['BYTE_CAPACITY', 'PERSISTENCE_UNCERTAIN'].includes(result.error));
  const snapshot = await f.supervisor.snapshot(); assert.equal(snapshot.events[0].eventId, 'synthetic_delivery_1');
  assert.equal(snapshot.revision, sequence - 1); assert.ok((await fs.stat(journalFile(f))).size <= 4_096);
});

test('failed pre-rename commit retains old bytes; lost acknowledgement replays the original durable receipt', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1);
  const before = await fs.readFile(journalFile(f), 'utf8'), original = fs.rename;
  fs.rename = async () => { throw new Error('SYNTHETIC_PRE_RENAME_FAILURE'); };
  try { assert.equal((await f.deliver(turn, 2)).error, 'PERSISTENCE_UNCERTAIN'); } finally { fs.rename = original; }
  assert.equal(await fs.readFile(journalFile(f), 'utf8'), before);
  const accepted = await f.deliver(turn, 2); assert.equal(accepted.accepted, true);
  f.setTime(50);
  const readback = await f.supervisor.ingestCodex({...f.metadata(2, 50), line: JSON.stringify(turn)});
  assert.deepEqual(readback.receipt, accepted.receipt); assert.equal(readback.duplicate, true);
});

test('corrupt snapshots and changed provenance fail closed without reset/quarantine', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1); await f.supervisor.close(); f.supervisor = null;
  const file = journalFile(f), valid = await fs.readFile(file, 'utf8'); await fs.writeFile(file, '{');
  await assert.rejects(createInactiveSupervisorCandidate(f.config), /CORRUPT_JOURNAL/);
  assert.equal(await fs.readFile(file, 'utf8'), '{'); assert.equal((await fs.readdir(f.root)).length, 1);
  await fs.writeFile(file, valid);
  await assert.rejects(createInactiveSupervisorCandidate({...f.config, qualification: 'UNVERIFIED_IMPORTED_JSONL'}), /JOURNAL_BINDING_MISMATCH/);
  assert.equal(await fs.readFile(file, 'utf8'), valid);
  f.supervisor = await createInactiveSupervisorCandidate(f.config);
});

test('candidate storage refuses product/formal roots, symlink file/root and hardlinked custody', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1); await f.supervisor.close(); f.supervisor = null;
  for (const root of [process.cwd(), '/workspace/mc-private-restore', f.root + '/nested'])
    await assert.rejects(createCandidateJournal({root, binding: f.binding}), /CANDIDATE_ROOT_REJECTED/);
  const file = journalFile(f), original = file + '.saved'; await fs.rename(file, original); await fs.symlink(original, file);
  await assert.rejects(createInactiveSupervisorCandidate(f.config), /JOURNAL_BOUNDARY_REJECTED/);
  await fs.rm(file); await fs.rename(original, file);
  const hardlink = path.join(f.files, 'journal-hardlink'); await fs.link(file, hardlink);
  await assert.rejects(createInactiveSupervisorCandidate(f.config), /JOURNAL_BOUNDARY_REJECTED/);
  await fs.rm(hardlink);
  const link = f.root + '-linked'; await fs.symlink(f.root, link); tc.after(() => fs.rm(link));
  await assert.rejects(createInactiveSupervisorCandidate({...f.config, root: link}), /CANDIDATE_ROOT_REJECTED/);
});

test('input serialization/accessor attacks and mutable queued metadata never execute or change accepted receipt', async tc => {
  const f = await supervisorFixture(tc); let getterCalls = 0;
  const evil = {...f.metadata(1)}; Object.defineProperty(evil, 'line', {enumerable: true, get() { getterCalls++; return JSON.stringify(start); }});
  assert.equal((await f.supervisor.ingestCodex(evil)).error, 'NON_JSON_DATA'); assert.equal(getterCalls, 0);
  const journalRoot = f.root + '-second', journal = await createCandidateJournal({root: journalRoot, binding: f.binding});
  tc.after(async () => { await journal.close(); await fs.rm(journalRoot, {recursive: true, force: true}); });
  const input = {...f.metadata(1), payload: normalizeCodexJsonl(JSON.stringify(start))};
  const promise = journal.append(input, t(0)); input.eventId = 'mutated'; input.payload = emptyPayload('turn_started');
  const result = await promise; assert.equal(result.receipt.eventId, 'synthetic_delivery_1');
  assert.equal(result.receipt.payload.kind, 'session_started');
});

test('views and restored state are immutable; unknown provider fields/items cannot inject a side channel', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1); await f.deliver(turn, 2);
  await f.deliver({type: 'item.completed', item: {id: 'synthetic_unknown', type: 'SYNTHETIC_SECRET_TYPE', text: '<script>synthetic</script>'}}, 3);
  const view = await f.supervisor.view(t(3)); assert.equal(view.history[2].payload.itemType, 'unknown');
  assert.equal(view.history[2].payload.itemStatus, null);
  assert.throws(() => { view.history[0].sourceEventAt = t(0); }, TypeError);
  assert.throws(() => { view.current.runtimeConnected = true; }, TypeError);
  const snapshot = awaitableSnapshot(await fs.readFile(journalFile(f), 'utf8'));
  assert.throws(() => observationView(snapshot, f.binding, t(0)), /READ_TIME_CONFLICT/);
});

test('Codex framer handles split multibyte/CRLF and bounded final line, without exposing raw source bytes', () => {
  const framer = createCodexJsonlFramer();
  const raw = Buffer.from(JSON.stringify(start) + '\r\n' + JSON.stringify({type: 'error', message: 'SYNTHETIC_PRIVATE_中文'}) + '\n');
  const split = raw.indexOf(Buffer.from('中')) + 1;
  const first = framer.push(raw.subarray(0, split)), second = framer.push(raw.subarray(split));
  assert.equal(first.events.length, 1); assert.equal(second.events.length, 1);
  assert.equal(second.events[0].errorClass, 'PROVIDER_ERROR'); assert.doesNotMatch(JSON.stringify([first, second]), /PRIVATE|中文/);
  assert.equal(framer.end().error, null); assert.equal(framer.push('x').error, 'FRAMER_CLOSED');
  const final = createCodexJsonlFramer(); assert.equal(final.push(JSON.stringify(start)).events.length, 0);
  assert.equal(final.end().events[0].kind, 'session_started');
});

test('framing rejects oversized/malformed/unknown/invalid UTF-8/deep input and cannot restart itself', () => {
  for (const [bytes, expected] of [[Buffer.alloc(65_537, 120), 'LINE_LIMIT'], [Buffer.alloc(262_145), 'CHUNK_LIMIT'],
    [Buffer.from('{\n'), 'INVALID_JSONL'], [Buffer.from('{"type":"fake.heartbeat"}\n'), 'UNSUPPORTED_CODEX_EVENT'],
    [Buffer.from([0xff, 10]), 'INVALID_ENCODING']]) {
    const framer = createCodexJsonlFramer(), result = framer.push(bytes);
    assert.equal(result.error, expected); assert.equal(result.events.length, 0);
    assert.equal(framer.push(JSON.stringify(start) + '\n').error, expected); assert.doesNotMatch(JSON.stringify(result), /xxx|heartbeat/);
  }
  let nested = {}; for (let i = 0; i < 20; i++) nested = {nested};
  assert.throws(() => normalizeCodexJsonl(JSON.stringify({type: 'error', nested})), /NON_JSON_DATA/);
  const framer = createCodexJsonlFramer(), mixed = framer.push(JSON.stringify(start) + '\n{\n');
  assert.equal(mixed.events.length, 1); assert.equal(mixed.error, 'INVALID_JSONL');
});

test('provider-neutral observation contract accepts no v1 time/attestation promotion', async tc => {
  const f = await supervisorFixture(tc, {open: false});
  const state = emptyObservation(f.binding), input = {...f.metadata(1), payload: normalizeCodexJsonl(JSON.stringify(start))};
  const result = appendObservation(state, input, f.binding, t(0)); assert.equal(result.accepted, true);
  assert.equal(result.receipt.schemaVersion, 'mc.process-observation.v2'); assert.equal(result.receipt.sourceEventAt, null);
  assert.equal(appendObservation(state, {...input, eventAt: t(0)}, f.binding, t(0)).error, 'INVALID_EVENT');
  assert.equal(appendObservation(state, input, {...f.binding, qualification: 'VERIFIED'}, t(0)).error, 'INVALID_BINDING');
});

test('provider-neutral supervisor consumes safe fixtures without a Codex adapter or provider API', async tc => {
  const f = await supervisorFixture(tc, {open: false});
  const binding = {...f.binding, providerId: 'synthetic_other_provider', sourceFormat: 'synthetic.safe-events.v1',
    adapterVersion: 'synthetic.adapter.v1', runtimeVersion: null};
  const core = await createInactiveObservationSupervisor({root: f.root, binding, clock: () => t(0)});
  tc.after(() => core.close());
  const accepted = await core.ingestSafeEvent({...f.metadata(1), payload: {...emptyPayload('session_started'), threadId: 'synthetic_other_thread'}});
  assert.equal(accepted.accepted, true); assert.equal(core.describe().binding.providerId, 'synthetic_other_provider');
  assert.equal(core.ingestCodex, undefined); assert.throws(() => core.activate(), /CANDIDATE_ACTIVATION_DISABLED/);
  assert.equal((await core.view(t(0))).current.runtimeConnected, false);
  await core.close();
});

test('clock failures and caller-supplied private rejection details cannot become source evidence', async tc => {
  const f = await supervisorFixture(tc, {open: false});
  const core = await createInactiveObservationSupervisor({root: f.root, binding: f.binding,
    clock: () => { throw Error('SYNTHETIC_PRIVATE_CLOCK_FAILURE'); }});
  tc.after(() => core.close());
  assert.equal((await core.ingestSafeEvent({...f.metadata(1), payload: normalizeCodexJsonl(JSON.stringify(start))})).error, 'CLOCK_UNAVAILABLE');
  assert.equal(core.rejectInput('SYNTHETIC_PRIVATE_CALLER_DIAGNOSTIC').error, 'INVALID_INPUT');
  const view = await core.view(t(0)); assert.equal(view.revision, 0);
  assert.doesNotMatch(JSON.stringify(view), /SYNTHETIC_PRIVATE/); await core.close();
});

test('framing batch bound keeps safe metadata bounded rather than storing arbitrary log volume', () => {
  const framer = createCodexJsonlFramer(), result = framer.push('{"type":"turn.started"}\n'.repeat(1_001));
  assert.equal(result.events.length, 1_000); assert.equal(result.error, 'BATCH_LIMIT');
  assert.equal(framer.end().error, 'BATCH_LIMIT');
});

test('supervisor candidate stays outside public/import graph and has no live transport/signal primitive', async () => {
  const directory = 'docs/contracts/supervisor';
  for (const name of await fs.readdir(directory)) {
    if (!name.endsWith('.mjs')) continue;
    const source = await fs.readFile(path.join(directory, name), 'utf8');
    assert.doesNotMatch(source, /from\s+['"]node:(?:child_process|http|https|net|tls)['"]|\b(?:fetch|WebSocket)\s*\(|process\.kill\s*\(/);
    assert.doesNotMatch(source, /\/Users\/|JOEY_CANONICAL_MEMORY|OPENAI_API_KEY|CODEX_API_KEY|sb_secret_/);
  }
  assert.match(await fs.readFile('.vercelignore', 'utf8'), /^docs$/m);
  for (const file of ['api/index.mjs', 'src/server.mjs', 'src/cli.mjs', 'public/app.js'])
    assert.doesNotMatch(await fs.readFile(file, 'utf8'), /contracts\/supervisor|createInactiveObservationSupervisor/);
  for (const route of ['supervisor', 'execution-events', 'runner', 'dispatch']) {
    const url = new URL('https://synthetic.invalid/api?route=' + route);
    assert.equal(productionResponse('GET', url).status, 404); assert.equal(productionResponse('POST', url).status, 403);
  }
});

test('unexpected signal records termination while absent exit/turn success remain unknown', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1); await f.deliver(turn, 2);
  await f.transport({...emptyPayload('process_exit'), signal: 'SIGSEGV'}, 3);
  const view = await f.supervisor.view(t(3));
  assert.equal(view.observed.outcome, 'signal_exit_observed'); assert.equal(view.observed.cancelRequested, false);
  assert.equal(view.observed.exitCode, null); assert.equal(view.current.task, null);
  assert.equal((await f.transport(emptyPayload('stdout_eof'), 4)).accepted, true);
});

test('post-rename uncertain commit is reconciled by same receipt without a new attempt/event', async tc => {
  const f = await supervisorFixture(tc), original = fs.rename;
  fs.rename = async (...args) => { await original(...args); throw Error('SYNTHETIC_ACK_LOST_AFTER_RENAME'); };
  try { assert.equal((await f.deliver(start, 1)).error, 'PERSISTENCE_UNCERTAIN'); } finally { fs.rename = original; }
  assert.equal((await f.supervisor.snapshot()).revision, 1); f.setTime(100);
  const replay = await f.supervisor.ingestCodex({...f.metadata(1, 100), line: JSON.stringify(start)});
  assert.equal(replay.duplicate, true); assert.equal(replay.receipt.observedAt, t(0));
  assert.equal(replay.receipt.recordedAt, t(0)); assert.equal((await f.supervisor.snapshot()).revision, 1);
  assert.throws(() => f.supervisor.activate(), /CANDIDATE_ACTIVATION_DISABLED/);
});

test('replaced writer lease fails closed and its new owner file is never deleted by the old holder', async tc => {
  const f = await supervisorFixture(tc); await f.deliver(start, 1);
  const file = journalFile(f), before = await fs.readFile(file, 'utf8'), lock = file + '.writer.lock';
  await fs.rename(lock, path.join(f.files, 'old-lease'));
  await fs.writeFile(lock, 'SYNTHETIC_REPLACEMENT_LEASE', {mode: 0o600});
  assert.equal((await f.deliver(turn, 2)).error, 'JOURNAL_READ_OR_LEASE_FAILURE');
  assert.equal(await fs.readFile(file, 'utf8'), before);
  await assert.rejects(f.supervisor.close(), /WRITER_LEASE_LOST/);
  assert.equal(await fs.readFile(lock, 'utf8'), 'SYNTHETIC_REPLACEMENT_LEASE');
});
