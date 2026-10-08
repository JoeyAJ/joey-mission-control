// Provider-neutral safe event vocabulary. Data validation only, no transport.
import {exactKeys, fail, identifier, immutable, jsonData} from './data.mjs';

export const payloadKeys = ['kind', 'threadId', 'itemId', 'itemType', 'itemStatus', 'commandExitCode',
  'processExitCode', 'signal', 'errorClass'];
export const providerKinds = ['session_started', 'turn_started', 'item_started', 'item_updated',
  'item_completed', 'turn_completed', 'turn_failed', 'provider_error'];
export const transportKinds = ['transport_open', 'stdout_eof', 'process_error', 'process_exit', 'cancel_requested'];
export const itemTypes = ['agent_message', 'reasoning', 'command_execution', 'file_change', 'mcp_tool_call', 'web_search', 'todo_list', 'error', 'unknown'];
const statuses = ['in_progress', 'completed', 'failed'];
const signals = ['SIGINT', 'SIGTERM', 'SIGKILL', 'SIGABRT', 'SIGSEGV', 'SIGHUP', 'SIGQUIT',
  'SIGPIPE', 'SIGALRM', 'SIGBUS', 'SIGFPE', 'SIGILL', 'SIGTRAP', 'SIGXCPU', 'SIGXFSZ',
  'SIGSYS', 'SIGUSR1', 'SIGUSR2'];
export const emptyPayload = kind => ({kind, threadId: null, itemId: null, itemType: null, itemStatus: null,
  commandExitCode: null, processExitCode: null, signal: null, errorClass: null});
const exitCode = v => Number.isInteger(v) && v >= 0 && v <= 255;

export function validatePayload(payload) {
  jsonData(payload, {maxBytes: 2_048, maxString: 256});
  if (!exactKeys(payload, payloadKeys) || ![...providerKinds, ...transportKinds].includes(payload.kind)) fail('INVALID_SAFE_PAYLOAD');
  const expected = emptyPayload(payload.kind);
  if (payload.kind === 'session_started') {
    if (!identifier(payload.threadId)) fail('INVALID_SAFE_PAYLOAD');
    expected.threadId = payload.threadId;
  }
  if (payload.kind.startsWith('item_')) {
    if (!identifier(payload.itemId) || !itemTypes.includes(payload.itemType)
      || (payload.itemStatus !== null && !statuses.includes(payload.itemStatus))) fail('INVALID_SAFE_PAYLOAD');
    if (payload.kind === 'item_started' && payload.itemStatus !== null && payload.itemStatus !== 'in_progress') fail('INVALID_SAFE_PAYLOAD');
    if (payload.kind === 'item_completed' && payload.itemStatus === 'in_progress') fail('INVALID_SAFE_PAYLOAD');
    expected.itemId = payload.itemId; expected.itemType = payload.itemType; expected.itemStatus = payload.itemStatus;
    if (payload.commandExitCode !== null) {
      if (payload.itemType !== 'command_execution' || !exitCode(payload.commandExitCode)) fail('INVALID_SAFE_PAYLOAD');
      expected.commandExitCode = payload.commandExitCode;
    }
  }
  if (['turn_failed', 'provider_error'].includes(payload.kind)) expected.errorClass = 'PROVIDER_ERROR';
  if (payload.kind === 'process_error') {
    if (!['SPAWN_FAILURE', 'PIPE_FAILURE', 'UNKNOWN_TRANSPORT_ERROR'].includes(payload.errorClass)) fail('INVALID_SAFE_PAYLOAD');
    expected.errorClass = payload.errorClass;
  }
  if (payload.kind === 'process_exit') {
    if (!((exitCode(payload.processExitCode) && payload.signal === null)
      || (payload.processExitCode === null && signals.includes(payload.signal)))) fail('INVALID_SAFE_PAYLOAD');
    expected.processExitCode = payload.processExitCode; expected.signal = payload.signal;
  }
  if (JSON.stringify(payload) !== JSON.stringify(expected)) {
    // Order-independent equality; rejects hidden side channels in unused fields.
    if (!payloadKeys.every(key => payload[key] === expected[key])) fail('INVALID_SAFE_PAYLOAD');
  }
  return immutable(payload);
}
