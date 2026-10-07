// Official Codex exec JSONL shapes, consumed only as synthetic/imported input.
// No process, stdin binding, network, raw output persistence or message parsing.
import {fail, identifier, jsonData} from './data.mjs';
import {emptyPayload, itemTypes, validatePayload} from './safe-payload.mjs';
export {emptyPayload, validatePayload} from './safe-payload.mjs';

export function normalizeCodexJsonl(line) {
  if (typeof line !== 'string' || Buffer.byteLength(line) > 65_536 || !line.trim()) fail('INVALID_JSONL');
  let event; try { event = JSON.parse(line); } catch { fail('INVALID_JSONL'); }
  jsonData(event, {maxBytes: 65_536, maxString: 65_536});
  if (!event || typeof event !== 'object' || Array.isArray(event) || typeof event.type !== 'string') fail('INVALID_JSONL');
  const mapping = {'thread.started': 'session_started', 'turn.started': 'turn_started',
    'item.started': 'item_started', 'item.updated': 'item_updated', 'item.completed': 'item_completed',
    'turn.completed': 'turn_completed', 'turn.failed': 'turn_failed', error: 'provider_error'};
  if (!Object.hasOwn(mapping, event.type)) fail('UNSUPPORTED_CODEX_EVENT');
  const payload = emptyPayload(mapping[event.type]);
  if (payload.kind === 'session_started') payload.threadId = event.thread_id;
  if (payload.kind.startsWith('item_')) {
    const item = event.item;
    if (!item || typeof item !== 'object' || Array.isArray(item) || !identifier(item.id) || typeof item.type !== 'string') fail('INVALID_CODEX_ITEM');
    payload.itemId = item.id;
    payload.itemType = itemTypes.includes(item.type) ? item.type : 'unknown';
    payload.itemStatus = Object.hasOwn(item, 'status') ? item.status : null;
    if (item.type === 'command_execution' && Object.hasOwn(item, 'exit_code')) payload.commandExitCode = item.exit_code;
  }
  if (['turn_failed', 'provider_error'].includes(payload.kind)) payload.errorClass = 'PROVIDER_ERROR';
  // Model/identity/time/usage and arbitrary fields are not trusted or projected.
  return validatePayload(payload);
}

// Bounded framing; partial UTF-8 survives chunk splits. Errors are typed and
// sticky. Accepted earlier lines are returned with the error, never raw lines.
export function createCodexJsonlFramer() {
  let pending = Buffer.alloc(0), closed = false, error = null;
  function consume(chunk, final) {
    if (closed) return {events: [], error: error || 'FRAMER_CLOSED', ended: true};
    const events = [];
    try {
      if (!(typeof chunk === 'string' || Buffer.isBuffer(chunk)) || Buffer.byteLength(chunk) > 262_144) fail('CHUNK_LIMIT');
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      let start = 0;
      while (start < bytes.length) {
        const newline = bytes.indexOf(10, start), end = newline < 0 ? bytes.length : newline;
        if (pending.length + end - start > 65_536) fail('LINE_LIMIT');
        pending = Buffer.concat([pending, bytes.subarray(start, end)]);
        if (newline < 0) break;
        if (events.length >= 1_000) fail('BATCH_LIMIT');
        const line = new TextDecoder('utf-8', {fatal: true}).decode(pending).replace(/\r$/, '');
        events.push(normalizeCodexJsonl(line)); pending = Buffer.alloc(0); start = newline + 1;
      }
      if (final && pending.length) {
        if (events.length >= 1_000) fail('BATCH_LIMIT');
        events.push(normalizeCodexJsonl(new TextDecoder('utf-8', {fatal: true}).decode(pending)));
      }
      if (final) { closed = true; pending = Buffer.alloc(0); }
    } catch (caught) {
      error = ['CHUNK_LIMIT', 'LINE_LIMIT', 'BATCH_LIMIT', 'INVALID_JSONL', 'UNSUPPORTED_CODEX_EVENT',
        'INVALID_CODEX_ITEM', 'INVALID_SAFE_PAYLOAD', 'NON_JSON_DATA', 'DATA_TOO_LARGE'].includes(caught.code)
        ? caught.code : 'INVALID_ENCODING';
      closed = true; pending = Buffer.alloc(0);
    }
    return {events, error, ended: closed};
  }
  return Object.freeze({push: chunk => consume(chunk, false), end: () => consume(Buffer.alloc(0), true)});
}
