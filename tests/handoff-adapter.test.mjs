import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs/promises'; import os from 'node:os'; import path from 'node:path';
import { parseHandoff, loadHandoffs } from '../src/canonical/handoff-adapter.mjs';
const sample='# Hermes → NexAeon Handoff\nTimestamp: 2026-10-04T15:29:27+09:00\nProject: JOEY_ASSET_SYSTEM\nTask: Publish Phase 1\nStatus: SUCCESS\n## Summary\nDone.\n## Changes\n- Six files\n## Verification\n- 106/106\n## Published Commit\n- Commit: `abc1234`\n## Decision Required\nNONE\n## Next Proposed Action\nStop.';
test('classifies handoff by body evidence not neutral title',()=>{const h=parseHandoff(sample,'x.md'); assert.equal(h.entityId,'JOEY_ASSET_SYSTEM'); assert.equal(h.task,'Publish Phase 1'); assert.equal(h.status,'SUCCESS'); assert.equal(h.nextAction,'Stop.');});
test('fails closed on ambiguous handoff',()=>{const h=parseHandoff('# Handoff\nTimestamp: 2026-10-04\nProject: Namyoung\nTask: X\nStatus: SUCCESS','x'); assert.equal(h.conflict,true); assert.equal(h.entityId,null);});
test('fails closed on malformed recognized-entity handoff',()=>{const h=parseHandoff('# Handoff\nProject: NEXAEON\nStatus: SUCCESS','x',new Set(['NEXAEON']));assert.equal(h.entityId,'NEXAEON');assert.equal(h.conflict,true);assert.match(h.conflictReasons.join(' '),/timestamp|task/i);});
test('fails closed on impossible calendar timestamps',()=>{const h=parseHandoff('# Handoff\nTimestamp: 2026-02-30T12:00:00Z\nProject: NEXAEON\nTask: X\nStatus: SUCCESS','x',new Set(['NEXAEON']));assert.equal(h.conflict,true);assert.match(h.conflictReasons.join(' '),/timestamp/i);});
test('keeps global latest and derives per entity latest from history',async()=>{const d=await fs.mkdtemp(path.join(os.tmpdir(),'mc-h-')); await fs.mkdir(path.join(d,'HISTORY')); await fs.writeFile(path.join(d,'LATEST.md'),sample); await fs.writeFile(path.join(d,'HISTORY','old.md'),sample.replace('15:29:27','14:29:27')); const x=await loadHandoffs(d); assert.equal(x.globalLatest.sourcePath.endsWith('LATEST.md'),true); assert.equal(x.byEntity.JOEY_ASSET_SYSTEM.task,'Publish Phase 1');});
test('per-entity latest is selected by timestamp rather than LATEST filename priority',async()=>{const d=await fs.mkdtemp(path.join(os.tmpdir(),'mc-h-order-'));await fs.mkdir(path.join(d,'HISTORY'));await fs.writeFile(path.join(d,'LATEST.md'),sample.replace('2026-10-04T15:29:27','2026-10-01T15:29:27').replace('Publish Phase 1','Older global'));await fs.writeFile(path.join(d,'HISTORY','newer.md'),sample.replace('2026-10-04T15:29:27','2026-10-02T15:29:27').replace('Publish Phase 1','Newer history'));const x=await loadHandoffs(d);assert.equal(x.byEntity.JOEY_ASSET_SYSTEM.task,'Newer history');});

test('rejects LATEST and HISTORY symlink escapes using canonical realpaths',async()=>{
  const d=await fs.mkdtemp(path.join(os.tmpdir(),'mc-h-safe-'));
  const outside=await fs.mkdtemp(path.join(os.tmpdir(),'mc-h-out-'));
  await fs.writeFile(path.join(outside,'evil.md'),sample);
  await fs.mkdir(path.join(d,'HISTORY'));
  await fs.symlink(path.join(outside,'evil.md'),path.join(d,'LATEST.md'));
  await assert.rejects(()=>loadHandoffs(d),/symlink|containment/i);
  await fs.rm(path.join(d,'LATEST.md'));
  await fs.writeFile(path.join(d,'LATEST.md'),sample);
  await fs.symlink(path.join(outside,'evil.md'),path.join(d,'HISTORY','evil.md'));
  await assert.rejects(()=>loadHandoffs(d),/symlink|containment/i);
});
