// Server-only exact-blob policy. Joey approved this single historical exclusion on 2026-10-10.
export const preparedMaintenanceReceipt=Object.freeze({schemaVersion:1,qualification:'SERVER_MAINTENANCE_RESOLVED_REJECTION',receiptId:'mc-terminal-scope-pilot-maintenance-20261010',projectId:'MISSION_CONTROL',track:'BASELINE',repositoryId:'JoeyAJ/joey-mission-control',reportRef:'mc/progress',runId:'claude-mc-desktop-pilot-run-20261010T055619Z-b3e4d1',path:'.mission-control/runs/claude-mc-desktop-pilot-run-20261010T055619Z-b3e4d1.json',originalBlobId:'52a0beae3bf5b35589024e846ca2f8f4b6bae5c5',rejectionReason:'RUN_REPORT_SCOPE_INVALID',maintenanceReason:'PREPARED_PROMPT_EMPTY_CONTEXT_PATHS_TERMINAL_FAILED_EXCLUDED',disposition:'EXCLUDED_HISTORY_NOT_TRUSTED_OR_PREDECESSOR',validation:'SCHEMA_VALID_TERMINAL_FAILED'});
// Joey approved this additional exact-blob exclusion and MC publication on 2026-11-03.
// The malformed body remains in Git, never parsed into trusted history or a predecessor.
export const buddyMaintenanceReceipt=Object.freeze({schemaVersion:1,qualification:'SERVER_MAINTENANCE_RESOLVED_REJECTION',receiptId:'buddy-terminal-ops-maintenance-20261103',projectId:'WOOSONG_BUDDY',track:'BASELINE',repositoryId:'JoeyAJ/woosongbuddy',reportRef:'mc/progress',runId:'claude-buddy-supabase-keepalive-20261028T021400Z',path:'.mission-control/runs/claude-buddy-supabase-keepalive-20261028T021400Z.json',originalBlobId:'2a55933b78b73b6b09304c4bb88f26bf2ed92444',rejectionReason:'RUN_REPORT_INVALID',maintenanceReason:'MALFORMED_OPS_TERMINAL_PRESERVED_BACKFILL_VERIFIED',disposition:'EXCLUDED_HISTORY_NOT_TRUSTED_OR_PREDECESSOR',validation:'SCHEMA_INVALID_PINNED_TERMINAL_COMPLETED'});
const buddySuccessor={runId:'codex-buddy-history-backfill-20261103',path:'.mission-control/runs/codex-buddy-history-backfill-20261103.json',blobId:'1794459edc27524bc8815295bc795c6b8d1d9901',codeSha:'d70a7963febb669fd6205d10e2f7e0c3bf16c03a'};
export const approvedMaintenanceReceipts=Object.freeze([preparedMaintenanceReceipt,buddyMaintenanceReceipt]);
export function resolvePreparedRejection({configuration,rejection,report,receipts,runs=[]}){
 for(const p of approvedMaintenanceReceipts){
  if(!receipts.some(r=>JSON.stringify(r)===JSON.stringify(p))||configuration.projectId!==p.projectId||configuration.track!==p.track||configuration.repositoryId!==p.repositoryId||configuration.reportRef!==p.reportRef||rejection.runId!==p.runId||rejection.path!==p.path||rejection.providerBlobId!==p.originalBlobId||rejection.errorCategory!==p.rejectionReason)continue;
  if(p===preparedMaintenanceReceipt){if(report?.runId!==p.runId||report.projectId!==p.projectId||report.track!==p.track||report.repositoryId!==p.repositoryId||report.reportRef!==p.reportRef||report.events.at(-1)?.kind!=='failed')continue;}
  else{
   // Only already validated, lineage-checked successor bytes in this same scan can
   // resolve the known malformed blob. A missing/changed successor fails closed.
   const row=runs.find(r=>r.report.runId===buddySuccessor.runId),r=row?.report,e=r?.events.at(-1);
   if(report!==undefined||!row||row.source.path!==buddySuccessor.path||row.source.providerBlobId!==buddySuccessor.blobId||r.projectId!==p.projectId||r.track!==p.track||r.repositoryId!==p.repositoryId||r.reportRef!==p.reportRef||e.kind!=='completed'||e.result?.codeSha!==buddySuccessor.codeSha||e.result.handoff.path!=='README.md'||e.result.handoff.commitSha!==buddySuccessor.codeSha)continue;
  }
  return structuredClone(p);
 }
 return null;
}
