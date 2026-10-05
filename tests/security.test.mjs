import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import { assertSafeDataRoot } from '../src/config.mjs';
import { spawnSync } from 'node:child_process';
test('source contains no mutating git/shell execution or canonical writes',async()=>{const files=['src/workspace/git-observer.mjs','src/api/routes.mjs','src/server.mjs'];for(const f of files){let t='';try{t=await fs.readFile(new URL(`../${f}`,import.meta.url),'utf8')}catch{}assert.doesNotMatch(t,/exec\(|shell:\s*true|git\s+(commit|push|reset|clean|checkout)|writeFile\([^)]*JOEY_CANONICAL_MEMORY/i)}});

test('data root rejects canonical root, descendants, and symlink aliases',async()=>{
  const parent=await fs.mkdtemp(path.join(os.tmpdir(),'mc-roots-'));
  const canonical=path.join(parent,'canonical');
  await fs.mkdir(path.join(canonical,'nested'),{recursive:true});
  const alias=path.join(parent,'alias');
  await fs.symlink(canonical,alias);
  await assert.rejects(()=>assertSafeDataRoot(canonical,canonical),/overlap/i);
  await assert.rejects(()=>assertSafeDataRoot(canonical,path.join(canonical,'nested')),/overlap/i);
  await assert.rejects(()=>assertSafeDataRoot(canonical,path.join(alias,'nested')),/overlap/i);
  await assert.doesNotReject(()=>assertSafeDataRoot(canonical,path.join(parent,'data')));
});

test('CLI sync rejects a data root inside Canonical Memory before writing',async()=>{
  const parent=await fs.mkdtemp(path.join(os.tmpdir(),'mc-cli-root-'));
  const canonical=path.join(parent,'canonical');
  await fs.mkdir(canonical,{recursive:true});
  const result=spawnSync(process.execPath,['src/cli.mjs','sync'],{cwd:new URL('..',import.meta.url),encoding:'utf8',env:{...process.env,MC_CANONICAL_ROOT:canonical,MC_DATA_ROOT:path.join(canonical,'cache-data')}});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/overlap/i);
  await assert.rejects(()=>fs.access(path.join(canonical,'cache-data','cache','projection.v1.json')));
});
