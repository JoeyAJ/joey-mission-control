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

// CLI-only local test settings; never exposed through the browser API.
export function parseStartOptions(args){
 const options={port:config.port,dataRoot:config.dataRoot};
 for(let i=0;i<args.length;i+=2){
  const flag=args[i],value=args[i+1];
  if(!['--port','--data-root'].includes(flag)||!value)throw new Error('Usage: npm run start -- [--port NUMBER] [--data-root ABSOLUTE_PATH]');
  if(flag==='--port'){
   if(!/^\d+$/.test(value)||Number(value)<1||Number(value)>65535)throw new Error('Invalid local port');
   options.port=Number(value);
  }else{
   if(!path.isAbsolute(value)||value.includes('\0'))throw new Error('Data root must be an absolute safe path');
   options.dataRoot=value;
  }
 }
 return options;
}
