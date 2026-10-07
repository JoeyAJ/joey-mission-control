// Inactive orchestration seam. No child_process, signal, SDK, login or IO host.
import {validateCandidatePlan} from './launch-policy.mjs';
import {normalizeCodexJsonl} from './codex-jsonl.mjs';
import {validateBinding} from './observation.mjs';
import {createInactiveObservationSupervisor, safeCandidateInput} from './supervisor.mjs';

export function bindingForCandidate(planValue, {qualification = 'UNVERIFIED_IMPORTED_JSONL', cliVersion = null} = {}) {
  const plan = validateCandidatePlan(planValue), p = plan.policy, r = plan.request;
  return validateBinding({schemaVersion: 'mc.observer-binding.v2', runId: r.runId, attemptId: r.attemptId,
    projectId: p.projectId, missionId: p.missionId, baselineSha: p.baselineSha, scopeRef: p.scopeRef,
    scopeDigest: plan.scopeDigest, workspaceDigest: plan.workspaceDigest, launchPlanDigest: plan.launchPlanDigest,
    executableSha256: plan.executableSha256, providerId: 'codex', sourceFormat: 'codex.exec-jsonl', adapterVersion: 'mc.codex-jsonl.v1',
    runtimeVersion: cliVersion, qualification, freshnessMs: p.freshnessMs, maxEvents: p.maxEvents, maxBytes: p.maxBytes,
    cancelAllowed: p.cancelAllowed});
}

export async function createInactiveSupervisorCandidate({root, plan: planValue, qualification, cliVersion = null,
  clock = () => new Date().toISOString()}) {
  const plan = validateCandidatePlan(planValue);
  const binding = bindingForCandidate(plan, {qualification, cliVersion});
  const supervisor = await createInactiveObservationSupervisor({root, binding, clock});
  return Object.freeze({
    ...supervisor,
    async ingestCodex(input) {
      let payload;
      try { input = safeCandidateInput(input, ['line']); payload = normalizeCodexJsonl(input.line); }
      catch (error) { return supervisor.rejectInput(error.code || 'INVALID_JSONL'); }
      const {line, ...metadata} = input;
      return supervisor.ingestSafeEvent({...metadata, payload});
    }
  });
}
