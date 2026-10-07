-- Pending operator rollback/pause; NOT EXECUTED. No deletion or automatic authority transfer.
BEGIN;
UPDATE mc_private.heads SET writes_enabled=false;
UPDATE mc_private.members SET active=false WHERE member_role='WRITER';
-- Operator must additionally revoke provider worker sessions, export+hash checkpoint,
-- and get owner-approved new authority epoch before restoring another writer.
COMMIT;
