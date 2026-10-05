import test from 'node:test'; import assert from 'node:assert/strict'; import path from 'node:path';import fs from 'node:fs/promises';import os from 'node:os';
import { loadMemoryIndex, resolveCanonicalPath } from '../src/canonical/index-adapter.mjs';
const root='/Users/joeyaj/JOEY_CANONICAL_MEMORY';
test('loads current canonical entities, aliases, and nested case distinctly',async()=>{const x=await loadMemoryIndex(root); assert.deepEqual(x.entities.filter(e=>e.entityType==='project').map(e=>e.id),['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D']); assert.equal(x.entities.find(e=>e.id==='JOEY_ASSET_SYSTEM').entityType,'system'); assert.equal(x.entities.find(e=>e.id==='CASE_001_NAMYOUNG').parentId,'JOEY_ASSET_SYSTEM'); assert.equal(x.aliases['進入 Namyoung Web3D'],'NAMYOUNG_WEB3D');});
test('rejects traversal and symlink/path escape',async()=>{await assert.rejects(()=>resolveCanonicalPath(root,'../x')); await assert.rejects(()=>resolveCanonicalPath(root,path.join(root,'../x')));});

test('parses generic entity IDs and nested cases from canonical paths and aliases',async()=>{
 const d=await fs.mkdtemp(path.join(os.tmpdir(),'mc-index-'));
 await fs.mkdir(path.join(d,'PROJECTS','ALPHA'),{recursive:true});await fs.mkdir(path.join(d,'SYSTEMS','ORBIT','CASES','CASE_RED'),{recursive:true});
 await fs.writeFile(path.join(d,'MEMORY_INDEX.md'),'# Index\n## Production Development Registry\n| Project | Memory | Current State | Canonical Local Master |\n|---|---|---|---|\n| Any Name | [M](./PROJECTS/ALPHA/PROJECT_MEMORY.md) | [S](./PROJECTS/ALPHA/CURRENT_STATE.md) | `/repo/a` |\n## Systems Registry\n| System | Memory | Current State | Canonical Local Master |\n|---|---|---|---|\n| Orbit (`ORBIT`) | [M](./SYSTEMS/ORBIT/PROJECT_MEMORY.md) | [S](./SYSTEMS/ORBIT/CURRENT_STATE.md) | `/repo/o` |\n- `enter red` → [`CASE_RED`](./SYSTEMS/ORBIT/CASES/CASE_RED/CASE_MEMORY.md)');
 const x=await loadMemoryIndex(d);
 assert.deepEqual(x.entities.map(e=>e.id),['ALPHA','ORBIT','CASE_RED']);
 assert.equal(x.entities[2].parentId,'ORBIT');
 assert.equal(x.aliases['enter red'],'CASE_RED');
});
