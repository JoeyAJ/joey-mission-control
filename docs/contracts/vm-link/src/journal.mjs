import {constants, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync,
  realpathSync, renameSync, unlinkSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fail, jsonData} from '../vendor/data.mjs';
import {exactKeys, identifier} from '../vendor/data.mjs';
import {validatePayload} from '../vendor/safe-payload.mjs';
import {TASK} from './protocol.mjs';

export const initialJournal = () => ({version: 'mc.vm-journal.v1', phase: 'IDLE', job: null,
  events: [], acknowledged: 0, outcome: null});
function validateState(state) {
  jsonData(state, {maxBytes: 512_000, maxString: 256});
  if (!exactKeys(state, ['version', 'phase', 'job', 'events', 'acknowledged', 'outcome'])
    || state.version !== 'mc.vm-journal.v1'
    || !['IDLE', 'CLAIMING', 'CLAIMED', 'SPAWN_INTENT', 'RUNNING', 'TERMINAL_LOCAL', 'FINISHED'].includes(state.phase)
    || !Array.isArray(state.events) || state.events.length > 128 || !Number.isInteger(state.acknowledged)
    || state.acknowledged < 0 || state.acknowledged > state.events.length
    || ![null, 'COMPLETED', 'FAILED', 'CANCELLED', 'UNKNOWN'].includes(state.outcome)) fail('INVALID_JOURNAL');
  if (state.job !== null && (!exactKeys(state.job, ['jobId', 'attemptId', 'workerId', 'fence', 'task', 'expiresAt', 'leaseUntil'])
    || !['jobId', 'attemptId', 'workerId'].every(key => identifier(state.job[key]))
    || state.job.task !== TASK || !Number.isSafeInteger(state.job.fence) || state.job.fence < 1
    || !Number.isSafeInteger(state.job.expiresAt) || !Number.isSafeInteger(state.job.leaseUntil))) fail('INVALID_JOURNAL');
  if (['IDLE', 'CLAIMING'].includes(state.phase) ? state.job !== null : state.job === null) fail('INVALID_JOURNAL');
  if (['TERMINAL_LOCAL', 'FINISHED'].includes(state.phase) ? state.outcome === null : state.outcome !== null) fail('INVALID_JOURNAL');
  const ids = new Set();
  state.events.forEach((event, index) => {
    if (!exactKeys(event, ['eventId', 'seq', 'observedAt', 'payload']) || !identifier(event.eventId)
      || ids.has(event.eventId) || event.seq !== index + 1 || !Number.isSafeInteger(event.observedAt)) fail('INVALID_JOURNAL');
    ids.add(event.eventId); validatePayload(event.payload);
  });
}
function safeFile(path, uid) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== uid
    || (stat.mode & 0o777) !== 0o600) fail('UNSAFE_JOURNAL_FILE');
}
export function openJournal(root, {uid = process.getuid(), create = false} = {}) {
  if (!isAbsolute(root) || resolve(root) !== root) fail('UNSAFE_JOURNAL_ROOT');
  if (create && !existsSync(root)) {
    // Parent must already be a real user-owned directory. No recursive chmod.
    const parent = lstatSync(dirname(root));
    if (!parent.isDirectory() || parent.isSymbolicLink() || parent.uid !== uid || realpathSync(dirname(root)) !== dirname(root)) fail('UNSAFE_JOURNAL_ROOT');
    mkdirSync(root, {mode: 0o700});
  }
  const stat = lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid || realpathSync(root) !== root
    || (stat.mode & 0o777) !== 0o700) fail('UNSAFE_JOURNAL_ROOT');
  const lockPath = join(root, 'writer.lock'), file = join(root, 'journal.json');
  const lock = openSync(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  writeFileSync(lock, JSON.stringify({pid: process.pid, nonce: randomUUID()})); fsyncSync(lock);
  const directory = openSync(root, constants.O_RDONLY | constants.O_DIRECTORY); fsyncSync(directory);
  let state = initialJournal(), released = false, uncertain = false;
  try {
    if (existsSync(file)) {
      safeFile(file, uid);
      const size = lstatSync(file).size;
      if (size > 512_000) fail('JOURNAL_LIMIT');
      state = JSON.parse(readFileSync(file, 'utf8')); validateState(state);
    }
  } catch (error) { closeSync(lock); closeSync(directory); unlinkSync(lockPath); throw error; }
  return {
    read: () => structuredClone(state),
    write(next) {
      if (released) fail('JOURNAL_CLOSED');
      validateState(next);
      const temp = join(root, `journal-${randomUUID()}.tmp`);
      let fd;
      try {
        fd = openSync(temp, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
        writeFileSync(fd, JSON.stringify(next)); fsyncSync(fd); closeSync(fd); fd = undefined;
        if (existsSync(file)) safeFile(file, uid);
        renameSync(temp, file); fsyncSync(directory); state = structuredClone(next);
      } catch {
        if (fd !== undefined) closeSync(fd);
        // Could have renamed successfully: preserve lock and stop all execution.
        uncertain = true;
        fail('PERSISTENCE_UNCERTAIN');
      }
    },
    close() {
      if (released) return;
      released = true; closeSync(lock);
      if (!uncertain) { unlinkSync(lockPath); fsyncSync(directory); }
      closeSync(directory);
    }
  };
}
