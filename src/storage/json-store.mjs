import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function lstatIfExists(target) {
  try {
    return await fs.lstat(target);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export class JsonStore {
  constructor(root, name, validator = () => true) {
    if (path.isAbsolute(name) || name.split(/[\\/]/).includes('..') || name.includes('\0')) throw new Error('Unsafe store path');
    this.root = path.resolve(root);
    this.file = path.resolve(this.root, name);
    if (!isContained(this.root, this.file)) throw new Error('Unsafe store path');
    this.validator = validator;
    this.updateQueue = Promise.resolve();
  }

  async ensure() {
    await fs.mkdir(this.root, { recursive: true });
    const rootStat = await fs.lstat(this.root);
    if (rootStat.isSymbolicLink()) throw new Error('Store root symlink mismatch');
    this.realRoot = await fs.realpath(this.root);
    if (!isContained(this.realRoot, await fs.realpath(this.root))) throw new Error('Store root containment mismatch');

    const relativeParent = path.relative(this.root, path.dirname(this.file));
    let current = this.root;
    for (const component of relativeParent.split(path.sep).filter(Boolean)) {
      current = path.join(current, component);
      const stat = await lstatIfExists(current);
      if (stat?.isSymbolicLink()) throw new Error(`Store parent symlink rejected: ${current}`);
    }
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const realParent = await fs.realpath(path.dirname(this.file));
    if (!isContained(this.realRoot, realParent)) throw new Error('Store path containment mismatch');

    const fileStat = await lstatIfExists(this.file);
    if (fileStat?.isSymbolicLink()) throw new Error('Store file symlink rejected');
    if (fileStat) {
      const realFile = await fs.realpath(this.file);
      if (!isContained(this.realRoot, realFile)) throw new Error('Store file containment mismatch');
    }
  }

  async read() {
    await this.ensure();
    try {
      const text = await fs.readFile(this.file, 'utf8');
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        const quarantine = `${this.file}.corrupt.${Date.now()}.${randomUUID()}`;
        await fs.rename(this.file, quarantine);
        throw new Error(`corrupt JSON quarantined at ${quarantine}`);
      }
      if (!this.validator(data)) throw new Error('Stored JSON failed validation');
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this.write([]);
        return [];
      }
      throw error;
    }
  }

  async write(data) {
    await this.ensure();
    if (!this.validator(data)) throw new Error('JSON failed validation');
    const temp = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temp, JSON.stringify(data, null, 2), { mode: 0o600, flag: 'wx' });
      const realParent = await fs.realpath(path.dirname(temp));
      if (!isContained(this.realRoot, realParent)) throw new Error('Temporary file containment mismatch');
      await fs.rename(temp, this.file);
    } finally {
      await fs.rm(temp, { force: true });
    }
    return data;
  }

  async acquireUpdateLock() {
    await this.ensure();
    const lock = `${this.file}.lock`;
    const deadline = Date.now() + 5000;
    while (true) {
      try {
        const handle = await fs.open(lock, 'wx', 0o600);
        await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
        return async () => {
          await handle.close();
          await fs.rm(lock, { force: true });
        };
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const stat = await lstatIfExists(lock);
        if (stat?.isSymbolicLink()) throw new Error('Store lock symlink rejected');
        if (stat && Date.now() - stat.mtimeMs > 30000) {
          await fs.rm(lock, { force: true });
          continue;
        }
        if (Date.now() >= deadline) throw new Error('Timed out waiting for store update lock');
        await sleep(10);
      }
    }
  }

  async update(fn) {
    const operation = this.updateQueue.then(async () => {
      const release = await this.acquireUpdateLock();
      try {
        const data = await this.read();
        const next = await fn(data);
        return await this.write(next);
      } finally {
        await release();
      }
    });
    this.updateQueue = operation.catch(() => {});
    return operation;
  }
}
