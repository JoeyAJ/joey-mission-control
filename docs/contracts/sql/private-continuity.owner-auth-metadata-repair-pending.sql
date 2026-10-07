-- REVIEWABLE / NOT APPLIED: requires managed auth schema/table owner authority.
-- RETIRED 2026-10-07: parent explicitly rejected the managed-owner repair path.
-- Historical proposal only. Do not execute; review owner-auth-helper-pending.sql.
-- Exact MC project only. Existing official connector role postgres lacks this authority.
-- No owner transfer, superuser/bypass-RLS, role membership, secret columns or Auth writes.
BEGIN;
GRANT USAGE ON SCHEMA auth TO mc_continuity_executor;
CREATE POLICY mc_owner_executor_user_metadata ON auth.users
 FOR SELECT TO mc_continuity_executor
 USING (id='6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid);
CREATE POLICY mc_owner_executor_session_metadata ON auth.sessions
 FOR SELECT TO mc_continuity_executor
 USING (user_id='6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid);
CREATE POLICY mc_owner_executor_totp_metadata ON auth.mfa_factors
 FOR SELECT TO mc_continuity_executor
 USING (user_id='6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid AND status::text='verified' AND factor_type::text='totp');
-- Already applied column-only SELECT grants stay unchanged; policies grant no columns.
DO $$ BEGIN
 IF NOT has_schema_privilege('mc_continuity_executor','auth','USAGE')
 THEN RAISE EXCEPTION 'EFFECTIVE_AUTH_USAGE_NOT_GRANTED'; END IF;
END; $$;
COMMIT;
