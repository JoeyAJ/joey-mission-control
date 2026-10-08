import {randomUUID} from 'node:crypto';
import {createCodexJsonlFramer} from '../vendor/codex-jsonl.mjs';
import {emptyPayload, validatePayload} from '../vendor/safe-payload.mjs';
import {exactKeys, fail} from '../vendor/data.mjs';
import {validateJob} from './protocol.mjs';

export async function runPilot({workerId, journal, request, startProcess, now = Date.now,
  pollMs = 15_000, controlMs = 3_000, pilotMs = 900_000, stopping = () => false}) {
  let state = journal.read();
  if (state.phase !== 'IDLE') fail('RECOVERY_REQUIRED');
  const pilotEnd = now() + pilotMs;
  const save = () => journal.write(state);
  while (now() < pilotEnd && !stopping()) {
    state.phase = 'CLAIMING'; save();
    const reply = await request('claim', {});
    if (!exactKeys(reply, ['job'])) fail('INVALID_CLAIM_RESPONSE');
    if (!reply.job) {
      state.phase = 'IDLE'; save();
      await new Promise(resolve => setTimeout(resolve, pollMs)); continue;
    }
    state.job = validateJob(reply.job, workerId, now()); state.phase = 'CLAIMED'; save();
    if (stopping()) { state.phase = 'TERMINAL_LOCAL'; state.outcome = 'UNKNOWN'; save(); return 'UNKNOWN'; }
    // Durable intent precedes spawn. A crash at either side never auto-relaunches.
    state.phase = 'SPAWN_INTENT'; save();
    const spawnBody = {jobId: state.job.jobId, attemptId: state.job.attemptId, fence: state.job.fence};
    const permission = await request('spawn_intent', spawnBody);
    if (!exactKeys(permission, ['authorized','leaseUntil','expiresAt']) || permission.authorized !== true
      || permission.expiresAt !== state.job.expiresAt || permission.leaseUntil !== state.job.leaseUntil
      || now() >= Math.min(permission.expiresAt, permission.leaseUntil) || stopping()) fail('SPAWN_NOT_AUTHORIZED');
    let port;
    try { port = startProcess(); }
    catch { state.phase = 'TERMINAL_LOCAL'; state.outcome = 'UNKNOWN'; save(); throw new Error('SPAWN_UNCERTAIN'); }
    state.phase = 'RUNNING';
    let cancelled = false, localError = false, stdoutBytes = 0, stderrBytes = 0;
    let finished = false, stopReason = null, persistenceError = false;
    const append = payload => {
      if (state.events.length >= 128) fail('EVENT_LIMIT');
      state.events.push({eventId: randomUUID(), seq: state.events.length + 1, observedAt: now(), payload: validatePayload(payload)});
      save();
    };
    const terminate = reason => {
      if (!stopReason) stopReason = reason;
      port.terminate();
    };
    try { append(emptyPayload('transport_open')); } catch { persistenceError = true; terminate('PERSISTENCE_UNCERTAIN'); }
    const consume = (result) => {
      for (const event of result.events) {append(event);if(['command_execution','file_change','mcp_tool_call','web_search'].includes(event.itemType)){localError=true;terminate('TASK_SCOPE_VIOLATION');}}
      if (result.error) { localError = true; terminate(result.error); }
    };
    const framer = createCodexJsonlFramer();
    const stdout = (async () => {
      try {
        for await (const chunk of port.stdout) {
          stdoutBytes += Buffer.byteLength(chunk);
          if (stdoutBytes > 262_144) { localError = true; terminate('OUTPUT_LIMIT'); break; }
          consume(framer.push(chunk));
        }
        consume(framer.end()); append(emptyPayload('stdout_eof'));
      } catch { localError = true; terminate('STREAM_OR_JOURNAL_FAILURE'); }
    })();
    const stderr = (async () => {
      try { for await (const chunk of port.stderr) {
        stderrBytes += Buffer.byteLength(chunk);
        if (stderrBytes > 262_144) { localError = true; terminate('STDERR_LIMIT'); break; }
      }} catch { localError = true; terminate('PIPE_FAILURE'); }
    })();
    const body = () => ({jobId: state.job.jobId, attemptId: state.job.attemptId, fence: state.job.fence});
    const flush = async () => {
      while (state.acknowledged < state.events.length) {
        const events = state.events.slice(state.acknowledged, state.acknowledged + 16);
        const ack = await request('events', {...body(), events});
        if (!exactKeys(ack, ['acceptedThrough']) || ack.acceptedThrough !== events.at(-1).seq) fail('INVALID_EVENT_ACK');
        state.acknowledged = ack.acceptedThrough; save();
      }
    };
    const watchdog = setInterval(() => {
      if (stopping() || now() >= Math.min(state.job.leaseUntil, state.job.expiresAt)) {
        cancelled = stopping(); terminate(cancelled ? 'LOCAL_STOP' : 'LEASE_OR_DEADLINE');
      }
    }, 100);
    const controller = (async () => {
      while (!finished && !stopReason) {
        try {
          const control = await request('control', body());
          if (!exactKeys(control, ['cancel', 'leaseUntil']) || typeof control.cancel !== 'boolean'
            || !Number.isSafeInteger(control.leaseUntil) || control.leaseUntil > state.job.expiresAt
            || control.leaseUntil > now() + 20_000) fail('INVALID_CONTROL_RESPONSE');
          state.job.leaseUntil = control.leaseUntil;
          if (control.cancel) {
            cancelled = true; append(emptyPayload('cancel_requested')); terminate('BROKER_CANCEL');
          }
          if (!stopReason) await flush();
        } catch { localError = true; terminate('BROKER_OR_JOURNAL_FAILURE'); }
        if (!finished && !stopReason) await new Promise(resolve => setTimeout(resolve, controlMs));
      }
    })();
    let exit;
    try {
      exit = await port.exit; finished = true; clearInterval(watchdog);
      await Promise.all([stdout, stderr, controller]);
      if (exit.spawnError) {
        const payload = emptyPayload('process_error'); payload.errorClass = 'SPAWN_FAILURE'; append(payload);
      } else {
        const payload = emptyPayload('process_exit'); payload.processExitCode = exit.code; payload.signal = exit.signal; append(payload);
      }
      const providerFailed = state.events.some(e => ['turn_failed', 'provider_error', 'process_error'].includes(e.payload.kind));
      state.outcome = cancelled ? 'CANCELLED' : localError || persistenceError || stopReason ? 'UNKNOWN'
        : exit.code === 0 && !providerFailed && state.events.some(e => e.payload.kind === 'turn_completed') ? 'COMPLETED' : 'FAILED';
      state.phase = 'TERMINAL_LOCAL'; save();
      await flush();
      const ack = await request('finish', {...body(), outcome: state.outcome});
      if (!exactKeys(ack, ['terminal', 'outcome']) || ack.terminal !== true || ack.outcome !== state.outcome) fail('INVALID_FINISH_ACK');
      state.phase = 'FINISHED'; save(); return state.outcome;
    } finally { finished = true; clearInterval(watchdog); if (!exit) terminate('WORKER_FAILURE'); }
  }
  return 'NO_JOB';
}

export async function reconcileOnly({journal, request}) {
  const state = journal.read();
  if (state.phase !== 'TERMINAL_LOCAL' || !state.job || !state.outcome) fail('OPERATOR_RECONCILIATION_REQUIRED');
  const body = {jobId: state.job.jobId, attemptId: state.job.attemptId, fence: state.job.fence};
  while (state.acknowledged < state.events.length) {
    const events = state.events.slice(state.acknowledged, state.acknowledged + 16);
    const ack = await request('events', {...body, events});
    if (!exactKeys(ack, ['acceptedThrough']) || ack.acceptedThrough !== events.at(-1).seq) fail('INVALID_EVENT_ACK');
    state.acknowledged = ack.acceptedThrough; journal.write(state);
  }
  const ack = await request('finish', {...body, outcome: state.outcome});
  if (!exactKeys(ack, ['terminal', 'outcome']) || ack.terminal !== true || ack.outcome !== state.outcome) fail('INVALID_FINISH_ACK');
  state.phase = 'FINISHED'; journal.write(state); return state.outcome;
}
