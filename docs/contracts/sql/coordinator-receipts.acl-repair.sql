-- Existing function owner closes default ACLs; no table/source/Auth mutation.
BEGIN;
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
SET LOCAL ROLE mc_continuity_executor;
REVOKE ALL ON FUNCTION mc_private.append_coordinator_receipt(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION mc_private.append_coordinator_receipt(jsonb) TO postgres;
REVOKE ALL ON FUNCTION public.mc_owner_coordinator_receipts(text,bigint,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_coordinator_receipts(text,bigint,integer) TO authenticated;
RESET ROLE;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
COMMIT;
