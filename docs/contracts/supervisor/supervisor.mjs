// Provider-neutral inactive supervisor. Safe data ports only, no process host.
import {exactKeys, fail, immutable, jsonData} from './data.mjs';
import {candidateCapabilities} from './launch-policy.mjs';
import {emptyPayload, validatePayload} from './safe-payload.mjs';
import {validateBinding} from './observation.mjs';
import {createCandidateJournal} from './journal.mjs';

export function safeCandidateInput(input, extra = []) {
  jsonData(input);
  if (!exactKeys(input, ['eventId', 'sequence', 'expectedRevision', 'observedAt', ...extra])) fail('INVALID_INPUT');
  return immutable(input);
}

export async function createInactiveObservationSupervisor({root, binding: bindingValue,
  clock = () => new Date().toISOString()}) {
  const binding = validateBinding(bindingValue);
  if (typeof clock !== 'function') fail('INVALID_CLOCK');
  const journal = await createCandidateJournal({root, binding});
  let lastIngestionError = null;
  const inputErrors = new Set(['INVALID_JSONL', 'UNSUPPORTED_CODEX_EVENT', 'INVALID_CODEX_ITEM',
    'INVALID_SAFE_PAYLOAD', 'NON_JSON_DATA', 'DATA_TOO_LARGE', 'INVALID_INPUT',
    'CLOCK_UNAVAILABLE', 'SYNTHETIC_TRANSPORT_ONLY', 'TRANSPORT_KIND_REQUIRED']);
  function reject(code) {
    const safeCode = inputErrors.has(code) ? code : 'INVALID_INPUT';
    lastIngestionError = safeCode; return {accepted: false, error: safeCode};
  }
  async function ingest(input) {
    try { input = safeCandidateInput(input, ['payload']); validatePayload(input.payload); }
    catch (error) { return reject(error.code || 'INVALID_SAFE_PAYLOAD'); }
    let recordedAt; try { recordedAt = clock(); } catch { return reject('CLOCK_UNAVAILABLE'); }
    const result = await journal.append(input, recordedAt);
    lastIngestionError = result.accepted ? null : result.error;
    return result;
  }
  return Object.freeze({
    describe: () => immutable({schemaVersion: 'mc.inactive-supervisor.v1', capabilities: candidateCapabilities,
      binding, processBindingVerified: false, credentialProvisioned: false, hostPersistenceVerified: false}),
    activate() { fail('CANDIDATE_ACTIVATION_DISABLED'); },
    ingestSafeEvent: ingest,
    rejectInput: reject,
    async recordSyntheticTransport(input) {
      if (binding.qualification !== 'SYNTHETIC_FIXTURE') return reject('SYNTHETIC_TRANSPORT_ONLY');
      try { input = safeCandidateInput(input, ['payload']); validatePayload(input.payload); }
      catch (error) { return reject(error.code || 'INVALID_SAFE_PAYLOAD'); }
      if (!['transport_open', 'stdout_eof', 'process_error', 'process_exit'].includes(input.payload.kind)) return reject('TRANSPORT_KIND_REQUIRED');
      return ingest(input);
    },
    async requestCancellation(input) {
      if (binding.qualification !== 'SYNTHETIC_FIXTURE') return {...reject('SYNTHETIC_TRANSPORT_ONLY'), signalSent: false};
      try { input = safeCandidateInput(input); } catch (error) { return {...reject(error.code || 'INVALID_INPUT'), signalSent: false}; }
      return {...await ingest({...input, payload: emptyPayload('cancel_requested')}), requestOnly: true, signalSent: false};
    },
    async view(readAt) {
      return immutable({...await journal.view(readAt), ingestionStatus: lastIngestionError ? 'rejected_input' : 'ready_candidate',
        lastIngestionError, supervisor: 'inactive', processBindingVerified: false});
    },
    snapshot: () => journal.snapshot(), close: () => journal.close()
  });
}
