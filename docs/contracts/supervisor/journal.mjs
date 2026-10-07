// Explicit isolated local candidate custody. No database/canonical/public writer.
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {exactKeys, fail, hash, immutable, jsonData} from './data.mjs';
import {appendObservation, emptyObservation, observationView, restoreObservation, validateBinding} from './observation.mjs';

const productRoot = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const filename = 'process-observations.v2.json';
async function lstat(file) { try { return await fs.lstat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }

export async function createCandidateJournal({root, binding: bindingValue}) {
  const binding = validateBinding(bindingValue);
  if (typeof root !== 'string' || !path.isAbsolute(root) || path.normalize(root) !== root
    || !['/workspace', '/tmp'].includes(path.dirname(root))
    || !/^mc-supervisor-candidate-data-[A-Za-z0-9_-]+$/.test(path.basename(root))
    || root === productRoot || root.startsWith(productRoot + path.sep)) fail('CANDIDATE_ROOT_REJECTED');
  if (await fs.realpath(path.dirname(root)) !== path.dirname(root)) fail('CANDIDATE_ROOT_REJECTED');
  try { await fs.mkdir(root, {mode: 0o700}); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  const file = path.join(root, filename), lock = file + '.writer.lock';
  async function boundary() {
    const stat = await fs.lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) || await fs.realpath(root) !== root) fail('CANDIDATE_ROOT_REJECTED');
    const entry = await lstat(file);
    if (entry && (!entry.isFile() || entry.isSymbolicLink() || entry.nlink !== 1 || (entry.mode & 0o077)
      || entry.size > binding.maxBytes || await fs.realpath(file) !== file)) fail('JOURNAL_BOUNDARY_REJECTED');
  }
  await boundary();
  if ((await fs.readdir(root)).some(name => name !== filename && name !== filename + '.writer.lock'
    && !/^process-observations\.v2\.json\.[A-Za-z0-9_-]+\.tmp$/.test(name))) fail('CANDIDATE_ROOT_NOT_EMPTY');
  let lease;
  try { lease = await fs.open(lock, 'wx', 0o600); } catch (error) {
    if (error.code === 'EEXIST') fail('WRITER_BUSY');
    throw error;
  }
  const nonce = randomUUID();
  let closed = false, queue = Promise.resolve();
  try {
    await lease.writeFile(JSON.stringify({schemaVersion: 'mc.candidate-writer-lease.v1', nonce,
      pid: process.pid, bindingDigest: hash(binding)}));
    await lease.sync();
  } catch (error) { await lease.close(); await fs.rm(lock, {force: true}); throw error; }

  async function ownedLease() {
    if (closed) fail('JOURNAL_CLOSED');
    await boundary();
    const held = await lease.stat(), entry = await fs.lstat(lock);
    if (!entry.isFile() || entry.isSymbolicLink() || entry.nlink !== 1 || (entry.mode & 0o077)
      || entry.ino !== held.ino || entry.dev !== held.dev) fail('WRITER_LEASE_LOST');
  }
  async function readState() {
    await ownedLease();
    if (!await lstat(file)) return emptyObservation(binding);
    let record; try { record = JSON.parse(await fs.readFile(file, 'utf8')); } catch { fail('CORRUPT_JOURNAL'); }
    jsonData(record);
    if (!exactKeys(record, ['schemaVersion', 'binding', 'state']) || record.schemaVersion !== 'mc.supervisor-journal.v2'
      || hash(record.binding) !== hash(binding)) fail('JOURNAL_BINDING_MISMATCH');
    return restoreObservation(record.state, binding);
  }
  async function writeState(state) {
    await ownedLease();
    const text = JSON.stringify({schemaVersion: 'mc.supervisor-journal.v2', binding, state});
    if (Buffer.byteLength(text) > binding.maxBytes) fail('BYTE_CAPACITY');
    const temp = file + '.' + randomUUID() + '.tmp';
    let handle;
    try {
      handle = await fs.open(temp, 'wx', 0o600); await handle.writeFile(text); await handle.sync();
      await handle.close(); handle = null; await ownedLease(); await fs.rename(temp, file);
      const directory = await fs.open(root, 'r'); try { await directory.sync(); } finally { await directory.close(); }
    } finally { if (handle) await handle.close(); await fs.rm(temp, {force: true}); }
  }
  // Validate an existing record now. Failed restore never resets/quarantines it.
  try { await readState(); } catch (error) { await lease.close(); await fs.rm(lock, {force: true}); throw error; }
  function serialize(fn) {
    const result = queue.then(fn); queue = result.catch(() => {}); return result;
  }
  return Object.freeze({
    append(input, recordedAt) {
      try { input = immutable(input); } catch (error) { return Promise.resolve({accepted: false, error: error.code || 'INVALID_INPUT'}); }
      return serialize(async () => {
      let state; try { state = await readState(); } catch { return {accepted: false, error: 'JOURNAL_READ_OR_LEASE_FAILURE'}; }
      const result = appendObservation(state, input, binding, recordedAt);
      if (!result.accepted) return {accepted: false, error: result.error};
      if (!result.duplicate) {
        try { await writeState(result.state); } catch {
          // Rename/fsync might already have committed. Re-read the exact event
          // ID on retry; never invent a new attempt, ID or successful receipt.
          return {accepted: false, error: 'PERSISTENCE_UNCERTAIN'};
        }
      }
      return immutable({accepted: true, duplicate: result.duplicate, revision: result.receipt.sequence,
        receipt: result.receipt});
    }); },
    view(readAt) { return serialize(async () => observationView(await readState(), binding, readAt)); },
    snapshot() { return serialize(async () => immutable(await readState())); },
    close() { return serialize(async () => {
      if (closed) return;
      let owned = false; try { await ownedLease(); owned = true; } finally {
        closed = true; await lease.close(); if (owned) await fs.rm(lock, {force: true});
      }
    }); }
  });
}
