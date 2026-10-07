-- Management-only pause. Keep all receipts and Owner reading; no history deletion.
BEGIN;
REVOKE EXECUTE ON FUNCTION mc_private.append_coordinator_receipt(jsonb) FROM postgres;
COMMIT;
