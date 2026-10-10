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

test('current attributed checkpoint owns summary and next steps; preserved releases cannot overwrite it',()=>{
 const current='# Current\nProject: MISSION_CONTROL\nTimestamp: 2026-10-10T06:47:36Z\nTask: Current maintenance\nStatus: LOCAL_VERIFIED\nBaseline: '+ 'a'.repeat(40)+'\n## Current checkpoint\nCurrent source-bound result.\n## Next Action\nValidate current Owner copy.\n';
 const history='\n---\n# Historical release\nProject: MISSION_CONTROL\nTimestamp: 2026-10-09T05:00:00Z\nTask: Old release\nStatus: OLD\n## Summary\nOld release 4e65e2d.\n## Next Proposed Action\nPublish old release 4e65e2d.\n## Next Action\nRepeat old publication.\n';
 const h=parseHandoff(current+history,'repo@'+'b'.repeat(40)+':HANDOFF.md');assert.equal(h.summary,'Current source-bound result.');assert.equal(h.nextAction,'Validate current Owner copy.');assert.equal(h.task,'Current maintenance');assert.equal(h.timestamp,'2026-10-10T06:47:36Z');assert.equal(h.fingerprint,parseHandoff(current+history,'other-path').fingerprint);assert.notEqual(h.fingerprint,parseHandoff(current,'same').fingerprint);
 const missing=parseHandoff(current.replace('## Current checkpoint\nCurrent source-bound result.\n','').replace('## Next Action\nValidate current Owner copy.\n','')+history,'x');assert.equal(missing.summary,'');assert.equal(missing.nextAction,'');
 const invalid=parseHandoff(current.replace('2026-10-10T06:47:36Z','invalid')+history,'x');assert(invalid.conflict);assert.equal(invalid.timestamp,'invalid');
 const futureHistory=history.replace('2026-10-09T05:00:00Z','2099-01-01T00:00:00Z');assert.equal(parseHandoff(current+futureHistory,'x').nextAction,'Validate current Owner copy.');
});
test('explicit history section ends current extraction without changing original bytes; fenced titles are not record boundaries',()=>{
 const current=sample+'\n## Example\n```markdown\n# Example title\n```\n';const h=parseHandoff(current+'\n## Preserved prior checkpoint\n## Summary\nOLD\n## Next Proposed Action\nOLD','x');assert.equal(h.summary,'Done.');assert.equal(h.nextAction,'Stop.');
});
