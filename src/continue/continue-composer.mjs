import { redact } from './redaction.mjs';
import { continuationConflicts, fingerprintSetDigest } from './policy-guard.mjs';

export function composeContinue({ project, handoff = {}, git = {}, storedContext = {}, currentFingerprints = [] }) {
  const policyConflicts = continuationConflicts({ git, storedContext, currentFingerprints });
  const projectionConflicts = (project.conflicts || []).map(conflict => conflict.message || conflict.kind || String(conflict));
  const conflicts = [...new Set([...policyConflicts, ...projectionConflicts])];
  const approvalGates = project.approvalGates || [];
  const canContinue = conflicts.length === 0 && approvalGates.length === 0;
  const payload = {
    schemaVersion: '1.0',
    entityId: project.id,
    generatedAt: new Date().toISOString(),
    lastAI: project.lastAI?.value || 'Unknown',
    lastCompleted: project.lastCompleted?.value || 'Unknown',
    currentTask: project.currentTask?.value || 'Unknown',
    blocker: project.blocker?.value || 'Unknown',
    nextAction: project.nextAction?.value || 'Unknown',
    latestCommit: git.head || 'Unknown',
    recommendedWorkspace: project.workspace?.value || 'Unknown',
    handoffContext: redact(handoff.summary || 'Unknown'),
    sourceFingerprints: currentFingerprints,
    sourceFingerprintDigest: currentFingerprints.length ? fingerprintSetDigest(currentFingerprints) : null,
    approvalGates,
    conflicts,
    freshness: {
      gitObservedAt: git.observedAt || null,
      fingerprintsCurrent: !policyConflicts.some(message => /fingerprint/i.test(message))
    },
    canContinue,
    hermesPrompt: null
  };
  if (canContinue) {
    payload.hermesPrompt = redact(`Resume ${project.id}. Last AI: ${payload.lastAI}. Last completed: ${payload.lastCompleted}. Current task: ${payload.currentTask}. Blocker: ${payload.blocker}. Next action: ${payload.nextAction}. Commit: ${payload.latestCommit}. Workspace: ${payload.recommendedWorkspace}. Handoff: ${payload.handoffContext}. You are not authorized to write canonical state, commit, push, deploy, or bypass approval.`);
  }
  return payload;
}
