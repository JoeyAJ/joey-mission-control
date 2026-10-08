import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
test('Edge modules work without ambient Node Buffer and keep pairing/signature denial and diagnostics strict',()=>{
 const r=spawnSync(process.execPath,['--experimental-vm-modules',fileURLToPath(new URL('../integration/edge-web-runtime.mjs',import.meta.url))],{encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);const report=JSON.parse(r.stdout);assert(report.pass&&report.globalBufferAbsentBeforeModule&&report.realEd25519PairProofVerified&&report.rpcDenialStill403&&report.safeDiagnosticEnumsOnly);assert.equal(report.networkCalls,0);
});
