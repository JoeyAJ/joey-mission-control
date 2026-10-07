// Authored synthetic fixtures. The dummy executable is NEVER executed.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {prepareCandidateLaunch} from '../../docs/contracts/supervisor/launch-policy.mjs';
import {bindingForCandidate, createInactiveSupervisorCandidate} from '../../docs/contracts/supervisor/candidate.mjs';

export const fixtureTime = seconds => new Date(Date.UTC(2026, 9, 7, 10, 0, seconds)).toISOString();
export async function supervisorFixture(tc, options = {}) {
  const files = await fs.mkdtemp(path.join(os.tmpdir(), 'mc-supervisor-synthetic-'));
  const workspace = path.join(files, 'workspace'), executable = path.join(files, 'synthetic-codex');
  await fs.mkdir(workspace); await fs.writeFile(executable, 'SYNTHETIC_EXECUTABLE_NEVER_RUN\n', {mode: 0o700});
  const policy = {schemaVersion: 'mc.inactive-launch-policy.v1', executable, allowedWorkspaces: [workspace],
    projectId: 'MISSION_CONTROL', missionId: 'synthetic_cloud_runner', baselineSha: 'a'.repeat(40),
    scopeRef: 'SYNTHETIC_SCOPE_NOT_PERMISSION', sandbox: 'read-only', freshnessMs: 60_000,
    maxEvents: 1_000, maxBytes: 2_000_000, cancelAllowed: true, ...options.policy};
  const request = {runId: 'synthetic_run_1', attemptId: 'synthetic_attempt_1', executable, workspace,
    argv: ['exec', '--json', '--sandbox', 'read-only', '--ignore-user-config', '--cd', workspace, '--',
      'SYNTHETIC_PRIVATE_PROMPT_NEVER_EXECUTED'], baselineSha: policy.baselineSha};
  const plan = await prepareCandidateLaunch(policy, request);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mc-supervisor-candidate-data-fixture-'));
  let now = fixtureTime(0), supervisor = null;
  const config = {root, plan, qualification: options.qualification || 'SYNTHETIC_FIXTURE',
    cliVersion: 'SYNTHETIC_VERSION_1', clock: () => now};
  if (options.open !== false) supervisor = await createInactiveSupervisorCandidate(config);
  tc.after(async () => { if (supervisor) await supervisor.close(); await fs.rm(root, {recursive: true, force: true}); await fs.rm(files, {recursive: true, force: true}); });
  const metadata = (sequence, seconds = sequence - 1) => ({eventId: 'synthetic_delivery_' + sequence,
    sequence, expectedRevision: sequence - 1, observedAt: fixtureTime(seconds)});
  return {files, root, policy, request, plan, config, binding: bindingForCandidate(plan, config),
    get supervisor() { return supervisor; }, set supervisor(value) { supervisor = value; }, metadata,
    setTime: seconds => { now = fixtureTime(seconds); },
    async deliver(event, sequence, seconds = sequence - 1, patch = {}) {
      now = fixtureTime(seconds); return supervisor.ingestCodex({...metadata(sequence, seconds), line: JSON.stringify(event), ...patch});
    },
    async transport(payload, sequence, seconds = sequence - 1) {
      now = fixtureTime(seconds); return supervisor.recordSyntheticTransport({...metadata(sequence, seconds), payload});
    }
  };
}
