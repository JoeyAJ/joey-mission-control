-- REVIEW ONLY; remove only the two read ports through their owning role.
-- Run before dynamic-project-scopes.rollback.sql. Retain all data/history.
BEGIN;
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
SET LOCAL ROLE mc_continuity_executor;
DROP FUNCTION public.mc_owner_project_connection_authorize(text);
DROP FUNCTION public.mc_owner_project_connection_catalog();
RESET ROLE;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
COMMIT;
