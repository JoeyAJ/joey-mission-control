-- Only before any committed receipt; never delete committed coordination history.
BEGIN;
DO $empty$ BEGIN IF EXISTS(SELECT 1 FROM mc_private.coordinator_receipts) THEN RAISE EXCEPTION 'P3_NONEMPTY_PAUSE_EXPORT_REQUIRED'; END IF; END; $empty$;
DROP FUNCTION public.mc_owner_coordinator_receipts(text,bigint,integer);
DROP FUNCTION mc_private.append_coordinator_receipt(jsonb);
DROP TABLE mc_private.coordinator_receipts;
COMMIT;
