// Process-observation v2: a pure candidate reducer, never a live Agent claim.
import {digest, exactKeys, fail, hash, identifier, immutable, jsonData, sha, utc} from './data.mjs';
import {providerKinds, transportKinds, validatePayload} from './safe-payload.mjs';

export const OBSERVATION_VERSION = 'mc.process-observation.v2';
export const qualifications = ['SYNTHETIC_FIXTURE', 'UNVERIFIED_IMPORTED_JSONL'];
const bindingKeys = ['schemaVersion', 'runId', 'attemptId', 'projectId', 'missionId', 'baselineSha',
  'scopeRef', 'scopeDigest', 'workspaceDigest', 'launchPlanDigest', 'executableSha256', 'sourceFormat',
  'providerId', 'adapterVersion', 'runtimeVersion', 'qualification', 'freshnessMs', 'maxEvents', 'maxBytes', 'cancelAllowed'];
const eventKeys = ['schemaVersion', 'bindingDigest', 'eventId', 'sequence', 'expectedRevision',
  'sourceEventAt', 'observedAt', 'recordedAt', 'payload', 'digest'];
const acceptedStates = new WeakSet();
function frozenState(value) { const state = immutable(value); acceptedStates.add(state); return state; }

export function validateBinding(binding) {
  jsonData(binding, {maxBytes: 4_096, maxString: 256});
  if (!exactKeys(binding, bindingKeys) || binding.schemaVersion !== 'mc.observer-binding.v2'
    || !['runId', 'attemptId', 'projectId', 'missionId', 'scopeRef'].every(key => identifier(binding[key]))
    || !sha(binding.baselineSha)
    || !['scopeDigest', 'workspaceDigest', 'launchPlanDigest', 'executableSha256'].every(key => digest(binding[key]))
    || !identifier(binding.providerId)
    || !['sourceFormat', 'adapterVersion'].every(key => typeof binding[key] === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(binding[key]))
    || (binding.runtimeVersion !== null && (typeof binding.runtimeVersion !== 'string' || !/^[A-Za-z0-9.+_-]{1,80}$/.test(binding.runtimeVersion)))
    || !qualifications.includes(binding.qualification)
    || !Number.isSafeInteger(binding.freshnessMs) || binding.freshnessMs < 1 || binding.freshnessMs > 86_400_000
    || !Number.isSafeInteger(binding.maxEvents) || binding.maxEvents < 1 || binding.maxEvents > 1_000
    || !Number.isSafeInteger(binding.maxBytes) || binding.maxBytes < 4_096 || binding.maxBytes > 2_000_000
    || typeof binding.cancelAllowed !== 'boolean') fail('INVALID_BINDING');
  return immutable(binding);
}

export function emptyObservation(bindingValue) {
  const binding = validateBinding(bindingValue);
  return frozenState({schemaVersion: OBSERVATION_VERSION, bindingDigest: hash(binding), revision: 0, events: []});
}

function lifecycle(events, next = null) {
  const state = {threadId: null, turnNumber: 0, turnStatus: 'unknown', processStatus: 'unobserved',
    transportStatus: 'unobserved', exitCode: null, signal: null, cancelRequested: false,
    lastProviderEventAt: null, lastTransportEventAt: null, latestObservation: 'unknown', items: new Map()};
  for (const event of next ? [...events, next] : events) {
    const p = event.payload;
    if (providerKinds.includes(p.kind)) {
      if (['exited', 'start_failed'].includes(state.processStatus)) fail('PROCESS_ALREADY_EXITED');
      if (state.transportStatus === 'eof_observed') fail('TRANSPORT_ALREADY_ENDED');
      if (p.kind === 'session_started') {
        if (state.threadId !== null) fail('SESSION_ALREADY_STARTED');
        state.threadId = p.threadId;
      } else if (p.kind === 'turn_started') {
        if (!state.threadId) fail('SESSION_REQUIRED');
        if (state.turnStatus === 'in_progress') fail('TURN_ALREADY_RUNNING');
        state.turnNumber++; state.turnStatus = 'in_progress'; state.items.clear();
      } else if (p.kind.startsWith('item_')) {
        if (!state.threadId || state.turnStatus !== 'in_progress') fail('TURN_REQUIRED');
        const previous = state.items.get(p.itemId);
        if (previous?.closed || (previous && previous.type !== p.itemType)) fail('ITEM_CONFLICT');
        if (p.kind === 'item_started' && previous) fail('ITEM_ALREADY_STARTED');
        if (p.kind === 'item_updated' && !previous) fail('ITEM_START_REQUIRED');
        state.items.set(p.itemId, {type: p.itemType, closed: p.kind === 'item_completed'});
      } else if (p.kind === 'turn_completed') {
        if (!state.threadId || state.turnStatus !== 'in_progress') fail('TURN_REQUIRED');
        state.turnStatus = 'completed';
      } else if (p.kind === 'turn_failed') {
        // Startup failures can precede a turn-start event. They do not invent a
        // session or turn ID; the missing identity remains unknown.
        state.turnStatus = 'failed';
      }
      state.lastProviderEventAt = event.observedAt;
      state.latestObservation = p.kind;
    } else {
      if (p.kind === 'transport_open') {
        if (['exited', 'start_failed'].includes(state.processStatus)) fail('PROCESS_ALREADY_EXITED');
        state.transportStatus = 'open_observed';
      } else if (p.kind === 'stdout_eof') {
        if (state.transportStatus === 'eof_observed') fail('EOF_ALREADY_RECORDED');
        state.transportStatus = 'eof_observed';
      } else if (p.kind === 'process_error') {
        state.transportStatus = 'error_observed';
        if (p.errorClass === 'SPAWN_FAILURE') state.processStatus = 'start_failed';
      } else if (p.kind === 'process_exit') {
        if (state.processStatus === 'exited') fail('PROCESS_ALREADY_EXITED');
        state.processStatus = 'exited'; state.exitCode = p.processExitCode; state.signal = p.signal;
      } else if (p.kind === 'cancel_requested') {
        if (state.processStatus === 'exited') fail('PROCESS_ALREADY_EXITED');
        if (state.cancelRequested) fail('CANCEL_ALREADY_REQUESTED');
        state.cancelRequested = true;
      }
      // A cancellation intent is control metadata, not transport freshness.
      if (p.kind !== 'cancel_requested') state.lastTransportEventAt = event.observedAt;
      state.latestObservation = p.kind;
    }
  }
  delete state.items;
  return state;
}

function eventDigest(bindingDigest, input) {
  // Observation/receipt time and CAS are excluded from replay identity. Retrying
  // a delivery preserves its first times, even if the retry arrives much later.
  return hash({bindingDigest, eventId: input.eventId, sequence: input.sequence, payload: input.payload});
}

export function appendObservation(previous, input, bindingValue, recordedAt) {
  const original = previous;
  try {
    const binding = validateBinding(bindingValue), bindingDigest = hash(binding);
    jsonData(previous); jsonData(input);
    if (!exactKeys(previous, ['schemaVersion', 'bindingDigest', 'revision', 'events'])
      || previous.schemaVersion !== OBSERVATION_VERSION || previous.bindingDigest !== bindingDigest
      || !Array.isArray(previous.events) || previous.events.length !== previous.revision) fail('STATE_BINDING_MISMATCH');
    if (!acceptedStates.has(previous)) previous = restoreObservation(previous, binding);
    if (!exactKeys(input, ['eventId', 'sequence', 'expectedRevision', 'payload', 'observedAt'])
      || !identifier(input.eventId) || !Number.isSafeInteger(input.sequence) || input.sequence < 1
      || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) fail('INVALID_EVENT');
    validatePayload(input.payload);
    const observed = utc(input.observedAt), recorded = utc(recordedAt);
    if (observed > recorded) fail('TIME_CONFLICT');
    if (transportKinds.includes(input.payload.kind) && binding.qualification !== 'SYNTHETIC_FIXTURE') fail('SYNTHETIC_TRANSPORT_ONLY');
    if (input.payload.kind === 'cancel_requested' && !binding.cancelAllowed) fail('CANCELLATION_SCOPE_REJECTED');
    const contentDigest = eventDigest(bindingDigest, input);
    const duplicate = previous.events.find(event => event.eventId === input.eventId);
    if (duplicate) {
      if (duplicate.digest !== contentDigest) fail('EVENT_ID_CONFLICT');
      return {accepted: true, duplicate: true, state: previous, receipt: immutable(duplicate)};
    }
    if (input.sequence !== previous.revision + 1) fail('SEQUENCE_CONFLICT');
    if (input.expectedRevision !== previous.revision) fail('REVISION_CONFLICT');
    const last = previous.events.at(-1);
    if (last && (observed < utc(last.observedAt) || recorded < utc(last.recordedAt))) fail('TIME_CONFLICT');
    if (previous.revision >= binding.maxEvents) fail('EVENT_CAPACITY');
    const event = {schemaVersion: OBSERVATION_VERSION, bindingDigest, eventId: input.eventId,
      sequence: input.sequence, expectedRevision: input.expectedRevision, sourceEventAt: null,
      observedAt: input.observedAt, recordedAt, payload: input.payload, digest: contentDigest};
    lifecycle(previous.events, event);
    const state = {schemaVersion: OBSERVATION_VERSION, bindingDigest, revision: previous.revision + 1,
      events: [...previous.events, event]};
    if (Buffer.byteLength(JSON.stringify({schemaVersion: 'mc.supervisor-journal.v2', binding, state})) > binding.maxBytes) fail('BYTE_CAPACITY');
    return {accepted: true, duplicate: false, state: frozenState(state), receipt: immutable(event)};
  } catch (error) {
    return {accepted: false, error: error.code || 'INVALID_EVENT', state: original};
  }
}

export function restoreObservation(snapshot, bindingValue) {
  const binding = validateBinding(bindingValue);
  jsonData(snapshot);
  if (!exactKeys(snapshot, ['schemaVersion', 'bindingDigest', 'revision', 'events'])
    || snapshot.schemaVersion !== OBSERVATION_VERSION || snapshot.bindingDigest !== hash(binding)
    || !Array.isArray(snapshot.events) || !Number.isSafeInteger(snapshot.revision)
    || snapshot.revision < 0 || snapshot.revision !== snapshot.events.length || snapshot.revision > binding.maxEvents) fail('CORRUPT_SNAPSHOT');
  let state = emptyObservation(binding);
  for (const event of snapshot.events) {
    if (!exactKeys(event, eventKeys) || event.schemaVersion !== OBSERVATION_VERSION
      || event.bindingDigest !== snapshot.bindingDigest || event.sourceEventAt !== null) fail('CORRUPT_SNAPSHOT');
    const result = appendObservation(state, {eventId: event.eventId, sequence: event.sequence,
      expectedRevision: event.expectedRevision, observedAt: event.observedAt, payload: event.payload}, binding, event.recordedAt);
    if (!result.accepted || result.duplicate || result.receipt.digest !== event.digest) fail('CORRUPT_SNAPSHOT');
    state = result.state;
  }
  return state;
}

export function observationView(snapshot, bindingValue, readAt) {
  const binding = validateBinding(bindingValue), state = restoreObservation(snapshot, binding), now = utc(readAt);
  const observed = lifecycle(state.events), last = state.events.at(-1);
  if (last && now < utc(last.recordedAt)) fail('READ_TIME_CONFLICT');
  const ageMs = observed.lastProviderEventAt === null ? null : now - utc(observed.lastProviderEventAt);
  const freshness = ageMs === null ? 'unknown' : ageMs > binding.freshnessMs ? 'stale' : 'observed_recently';
  let outcome = 'unknown';
  if (observed.processStatus === 'start_failed') outcome = 'failed_to_start_observed';
  if (observed.processStatus === 'exited') {
    if (observed.signal && observed.cancelRequested) outcome = 'termination_observed_after_cancel_request';
    else if (observed.signal) outcome = 'signal_exit_observed';
    else if (observed.exitCode !== null && observed.exitCode !== 0) outcome = 'failed_exit_observed';
    else if (observed.exitCode === 0 && observed.turnStatus === 'completed') outcome = 'completed_turn_and_zero_exit_observed';
  }
  return immutable({schemaVersion: 'mc.candidate-observation-view.v2', qualification: binding.qualification,
    testOnly: binding.qualification === 'SYNTHETIC_FIXTURE', candidate: true, activated: false,
    revision: state.revision, readAt, sourceEventAt: null, timeBasis: 'OBSERVER_TIME_NOT_SOURCE_TIME',
    observed: {...observed, freshness, ageMs, outcome},
    current: {status: 'disconnected_candidate', runtimeConnected: false, agent: null, task: null, model: null},
    taskPermissionVerified: false, ownerAcceptance: 'NOT_INFERRED',
    bindingDigest: hash(binding), history: state.events});
}
