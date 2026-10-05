import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';

async function canonicalizeCandidate(target) {
  let cursor = path.resolve(target);
  const suffix = [];
  while (true) {
    try {
      const real = await fs.realpath(cursor);
      return path.join(real, ...suffix.reverse());
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(cursor);
      if (parent === cursor) throw error;
      suffix.push(path.basename(cursor));
      cursor = parent;
    }
  }
}

function isEqualOrDescendant(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

export async function assertSafeDataRoot(canonicalRoot, dataRoot) {
  const canonical = await canonicalizeCandidate(canonicalRoot);
  const data = await canonicalizeCandidate(dataRoot);
  if (isEqualOrDescendant(canonical, data)) {
    throw new Error('MC_DATA_ROOT overlap with MC_CANONICAL_ROOT is forbidden');
  }
  return { canonicalRoot: canonical, dataRoot: data };
}

export const config = {
  host: '127.0.0.1',
  port: Number(process.env.MC_PORT || 4310),
  canonicalRoot: process.env.MC_CANONICAL_ROOT || '/Users/joeyaj/JOEY_CANONICAL_MEMORY',
  dataRoot: process.env.MC_DATA_ROOT || path.join(os.homedir(), 'Library', 'Application Support', 'JoeyMissionControl'),
  writeToken: process.env.MC_WRITE_TOKEN || randomBytes(24).toString('hex'),
  bodyLimit: 65536
};
