import test from 'node:test'; import assert from 'node:assert/strict';
import { loadEntityMemory } from '../src/canonical/memory-adapter.mjs';
test('loads only allowlisted canonical memory documents with fingerprints',async()=>{const x=await loadEntityMemory('/Users/joeyaj/JOEY_CANONICAL_MEMORY','PROJECTS/NAMYOUNG'); assert.ok(x.CURRENT_STATE.sections['Current Stage']); assert.match(x.CURRENT_STATE.source.fingerprint,/^[a-f0-9]{64}$/); await assert.rejects(()=>loadEntityMemory('/Users/joeyaj/JOEY_CANONICAL_MEMORY','../x'));});
