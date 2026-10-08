-- Prepared only; NOT APPLIED. Existing scmvedfqwlhkyvljymjj configuration pin.
-- No schema, grants, Auth, host, policy, TTL, actions or executable changes.
-- Caller must review the verified replacement and confirm Owner cleanup first.
BEGIN;
-- Owner/worker RPCs take this same configuration lock before state changes.
-- Take it in a separate statement before checking the fresh state snapshot.
SELECT singleton AS configuration_row_locked
FROM mc_vm_link.configuration WHERE singleton FOR UPDATE;
DO $mc_worker_artifact_repair$
DECLARE changed_rows integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM mc_vm_link.configuration WHERE singleton AND enabled
  AND policy_digest='72f8c00bb21e91fe86720678d72b650eada8dc54ef1f3b5d3dca6395bb83c6f9'
  AND artifact_digest='9bb363726a13bd96341c84b015354daaa454c6265b5bf0d2c5aff6eab1e3d647')
 THEN RAISE EXCEPTION 'MC_WORKER_REPAIR_BASELINE_CHANGED'; END IF;
 IF EXISTS(SELECT 1 FROM mc_vm_link.workers WHERE NOT revoked OR enabled
  OR paired_at IS NOT NULL OR public_key IS NOT NULL OR key_digest IS NOT NULL)
 THEN RAISE EXCEPTION 'MC_WORKER_REPAIR_WORKER_CLEANUP_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM mc_vm_link.jobs WHERE NOT terminal OR claimed OR spawn_intent)
  OR EXISTS(SELECT 1 FROM mc_vm_link.events)
 THEN RAISE EXCEPTION 'MC_WORKER_REPAIR_JOB_OR_EXECUTION_STATE_CHANGED'; END IF;
 UPDATE mc_vm_link.configuration
 SET artifact_digest='0de5fbd05a012fccabb23a4edf2ff7374b71d695b2505cfc4092ac8b85076613'
 WHERE singleton AND enabled
  AND policy_digest='72f8c00bb21e91fe86720678d72b650eada8dc54ef1f3b5d3dca6395bb83c6f9'
  AND artifact_digest='9bb363726a13bd96341c84b015354daaa454c6265b5bf0d2c5aff6eab1e3d647';
 GET DIAGNOSTICS changed_rows=ROW_COUNT;
 IF changed_rows<>1 THEN RAISE EXCEPTION 'MC_WORKER_REPAIR_COMPARE_AND_SET_DENIED'; END IF;
END;
$mc_worker_artifact_repair$;
COMMIT;
SELECT clock_timestamp() AS observed_at,enabled,policy_digest,artifact_digest
FROM mc_vm_link.configuration WHERE singleton;
