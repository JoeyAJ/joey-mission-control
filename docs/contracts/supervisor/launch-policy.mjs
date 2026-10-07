// An inactive, exact command plan. This module never spawns, signals or logs in.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {exactKeys, fail, hash, identifier, immutable, jsonData, sha} from './data.mjs';

export const candidateCapabilities = Object.freeze({activated: false, dispatch: false, signal: false,
  network: false, databaseWrite: false, publicPublish: false, credentialProvisioning: false});
const policyKeys = ['schemaVersion', 'executable', 'allowedWorkspaces', 'projectId', 'missionId',
  'baselineSha', 'scopeRef', 'sandbox', 'freshnessMs', 'maxEvents', 'maxBytes', 'cancelAllowed'];
const requestKeys = ['runId', 'attemptId', 'executable', 'workspace', 'argv', 'baselineSha'];
const absolute = value => typeof value === 'string' && Buffer.byteLength(value) <= 1_024
  && path.isAbsolute(value) && path.normalize(value) === value && !/[\0\r\n]/.test(value);

export function validateLaunchPolicy(policy) {
  jsonData(policy);
  if (!exactKeys(policy, policyKeys) || policy.schemaVersion !== 'mc.inactive-launch-policy.v1'
    || !absolute(policy.executable) || !Array.isArray(policy.allowedWorkspaces)
    || !policy.allowedWorkspaces.length || policy.allowedWorkspaces.length > 8
    || !policy.allowedWorkspaces.every(absolute)
    || new Set(policy.allowedWorkspaces).size !== policy.allowedWorkspaces.length
    || !['projectId', 'missionId', 'scopeRef'].every(key => identifier(policy[key]))
    || !sha(policy.baselineSha) || policy.sandbox !== 'read-only'
    || !Number.isSafeInteger(policy.freshnessMs) || policy.freshnessMs < 1 || policy.freshnessMs > 86_400_000
    || !Number.isSafeInteger(policy.maxEvents) || policy.maxEvents < 1 || policy.maxEvents > 1_000
    || !Number.isSafeInteger(policy.maxBytes) || policy.maxBytes < 4_096 || policy.maxBytes > 2_000_000
    || typeof policy.cancelAllowed !== 'boolean') fail('INVALID_LAUNCH_POLICY');
  return immutable(policy);
}

export function validateCommandRequest(policyValue, request) {
  const policy = validateLaunchPolicy(policyValue);
  jsonData(request);
  if (!exactKeys(request, requestKeys) || !identifier(request.runId) || !identifier(request.attemptId)
    || request.executable !== policy.executable || !absolute(request.workspace)
    || !policy.allowedWorkspaces.includes(request.workspace) || request.baselineSha !== policy.baselineSha
    || !Array.isArray(request.argv) || request.argv.length !== 9) fail('COMMAND_SCOPE_REJECTED');
  const expected = ['exec', '--json', '--sandbox', 'read-only', '--ignore-user-config', '--cd', request.workspace, '--'];
  if (!expected.every((value, index) => request.argv[index] === value)
    || typeof request.argv[8] !== 'string' || !request.argv[8].trim()
    || Buffer.byteLength(request.argv[8]) > 8_192 || request.argv[8].includes('\0')) fail('COMMAND_SCOPE_REJECTED');
  // Prompt is an argument after --, never shell code. It is not persisted and
  // its content cannot establish permission or effective runtime configuration.
  return {policy, request: immutable(request)};
}

async function realNode(file, directory) {
  const stat = await fs.lstat(file);
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())
    || await fs.realpath(file) !== file) fail('PATH_SCOPE_REJECTED');
  return stat;
}

export async function prepareCandidateLaunch(policyValue, requestValue) {
  const {policy, request} = validateCommandRequest(policyValue, requestValue);
  // Exact roots only, rather than prefix matching /workspace and /workspace-evil.
  await realNode(request.workspace, true);
  const executable = await realNode(request.executable, false);
  if (!(executable.mode & 0o111) || executable.size > 256_000_000) fail('EXECUTABLE_REJECTED');
  const executableSha256 = createHash('sha256').update(await fs.readFile(request.executable)).digest('hex');
  return immutable({schemaVersion: 'mc.inactive-launch-plan.v1', capabilities: candidateCapabilities,
    policy, request, executableSha256, launchPlanDigest: hash(request), workspaceDigest: hash(request.workspace),
    scopeDigest: hash(policy), baselineObserved: false, effectiveRuntimePolicyVerified: false,
    taskPermissionVerified: false});
}

export function validateCandidatePlan(plan) {
  jsonData(plan);
  if (!exactKeys(plan, ['schemaVersion', 'capabilities', 'policy', 'request', 'executableSha256',
    'launchPlanDigest', 'workspaceDigest', 'scopeDigest', 'baselineObserved', 'effectiveRuntimePolicyVerified', 'taskPermissionVerified'])
    || plan.schemaVersion !== 'mc.inactive-launch-plan.v1'
    || hash(plan.capabilities) !== hash(candidateCapabilities)
    || !/^[a-f0-9]{64}$/.test(plan.executableSha256)
    || plan.baselineObserved !== false || plan.effectiveRuntimePolicyVerified !== false || plan.taskPermissionVerified !== false) fail('INVALID_CANDIDATE_PLAN');
  const {policy, request} = validateCommandRequest(plan.policy, plan.request);
  if (plan.launchPlanDigest !== hash(request) || plan.workspaceDigest !== hash(request.workspace)
    || plan.scopeDigest !== hash(policy)) fail('PLAN_DIGEST_MISMATCH');
  return immutable(plan);
}
