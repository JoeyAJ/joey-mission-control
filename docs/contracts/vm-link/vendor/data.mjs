// Candidate contract utilities. No ambient credentials, network or execution.
import {createHash} from 'node:crypto';

export const fail = code => { throw Object.assign(new Error(code), {code}); };
export const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
export const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
export const exactKeys = (value, names) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join('|') === [...names].sort().join('|');

// Reject executable/accessor serialization, sparse arrays and prototype tricks
// before copying or hashing. Bounds apply even to fields later discarded.
export function jsonData(value, {maxBytes = 2_000_000, maxString = 65_536} = {}) {
  const seen = new Set();
  function walk(v, depth) {
    if (depth > 16) fail('NON_JSON_DATA');
    if (v === null || typeof v === 'boolean') return;
    if (typeof v === 'string') { if (Buffer.byteLength(v) > maxString) fail('NON_JSON_DATA'); return; }
    if (typeof v === 'number') { if (!Number.isFinite(v)) fail('NON_JSON_DATA'); return; }
    if (!v || typeof v !== 'object' || seen.has(v)) fail('NON_JSON_DATA');
    const array = Array.isArray(v), proto = Object.getPrototypeOf(v);
    if (array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) fail('NON_JSON_DATA');
    if (Object.getOwnPropertyDescriptor(Object.prototype, 'toJSON') || Object.getOwnPropertyDescriptor(Array.prototype, 'toJSON')) fail('NON_JSON_DATA');
    const descriptors = Object.getOwnPropertyDescriptors(v), keys = Reflect.ownKeys(descriptors);
    if (keys.length > 4_097) fail('NON_JSON_DATA');
    seen.add(v);
    for (const key of keys) {
      const entry = descriptors[key];
      if (typeof key !== 'string' || !('value' in entry)) fail('NON_JSON_DATA');
      if (array && key === 'length') continue;
      if (!entry.enumerable || key === 'toJSON' || (array && !/^(0|[1-9]\d*)$/.test(key))) fail('NON_JSON_DATA');
      walk(entry.value, depth + 1);
    }
    if (array && keys.length !== v.length + 1) fail('NON_JSON_DATA');
    seen.delete(v);
  }
  walk(value, 0);
  if (Buffer.byteLength(JSON.stringify(value)) > maxBytes) fail('DATA_TOO_LARGE');
  return value;
}

export function canonical(value) {
  jsonData(value);
  return JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}
export const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
export function immutable(value) {
  const copy = JSON.parse(JSON.stringify(jsonData(value)));
  function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
  return freeze(copy);
}
export function utc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)) fail('INVALID_TIME');
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z')) fail('INVALID_TIME');
  return ms;
}
