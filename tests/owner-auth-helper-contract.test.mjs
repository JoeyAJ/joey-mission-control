import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const base='docs/contracts/sql/';
const source=fs.readFileSync(base+'private-continuity.owner-auth-helper-pending.sql','utf8');
const sql=source.replace(/^\s*--.*$/gm,'');
const helper=sql.slice(sql.indexOf('CREATE FUNCTION mc_private.owner_auth_verification()'),sql.indexOf('REVOKE ALL ON FUNCTION mc_private.owner_auth_verification()'));
const actor=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION mc_private.current_actor()'),sql.indexOf('REVOKE ALL ON FUNCTION mc_private.current_actor()'));
const rpc=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.mc_owner_session'),sql.indexOf('REVOKE ALL ON FUNCTION public.mc_owner_session'));
test('helper is a private parameterless verifier, never a general Auth reader',()=>{
 assert.match(helper,/owner_auth_verification\(\)\s*RETURNS TABLE\(subject uuid,session_id uuid,aal text,expires_at bigint\)/);
 assert.match(helper,/VOLATILE SECURITY DEFINER SET search_path=''/);
 assert.match(helper,/sub IS DISTINCT FROM '6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid/);
 assert.doesNotMatch(helper,/SELECT\s+\*|EXECUTE\s|encrypted_password|refresh_token|secret|phone|email\s*[,=]|RAISE[^;]*(claims|sub|sid)/i);
 assert.equal((sql.match(/SECURITY DEFINER/g)||[]).length,2);
});
test('every original current-session predicate and clipped expiry survives',()=>{
 for(const boundary of ["claims->>'role' IS DISTINCT FROM 'authenticated'","https://scmvedfqwlhkyvljymjj.supabase.co/auth/v1","claims->'aud'",'expires<=extract(epoch FROM now_at)',"level NOT IN ('aal1','aal2')",'s.id=sid AND s.user_id=sub AND s.aal::text=level','s.not_after>now_at','u.is_anonymous IS FALSE','u.deleted_at IS NULL','u.email_confirmed_at IS NOT NULL','u.banned_until<=now_at',"f.status::text='verified' AND f.factor_type::text='totp'",'least(expires,coalesce(extract(epoch FROM s.not_after),expires))'])assert.ok(helper.includes(boundary),boundary);
 assert.match(helper,/ERRCODE='28000',MESSAGE='OWNER_SESSION_DENIED'/);
});
test('both callers remove direct Auth reads; workflow remains executor invoker',()=>{
 assert.match(actor,/SECURITY INVOKER SET search_path=''/);
 assert.match(actor,/FROM mc_private\.owner_auth_verification\(\) v/);
 assert.match(rpc,/FROM mc_private\.owner_auth_verification\(\)/);
 assert.match(rpc,/'expiresAt',actor\.expires_at/);
 assert.match(rpc,/FROM mc_private\.members m/);
 assert.match(rpc,/m\.member_role='OWNER' AND m\.active/);
 for(const caller of [actor,rpc])assert.doesNotMatch(caller,/\bauth\./);
 assert.doesNotMatch(helper,/mc_private\.(members|heads|storage_budget|contexts|events|checkpoints)/);
});
test('helper execution is executor only and public identity ACL stays bounded',()=>{
 assert.match(sql,/REVOKE ALL ON FUNCTION mc_private\.owner_auth_verification\(\) FROM PUBLIC,anon,authenticated,service_role;/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION mc_private\.owner_auth_verification\(\) TO mc_continuity_executor;/);
 assert.doesNotMatch(sql,/GRANT[^;]*owner_auth_verification\(\)[^;]*TO (anon|authenticated|service_role|PUBLIC)/i);
 assert.match(rpc,/project NOT IN \('NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'\)/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.mc_owner_session\(text\) TO authenticated;/);
 assert.ok(sql.indexOf('REVOKE ALL ON FUNCTION mc_private.owner_auth_verification()')<sql.indexOf('COMMIT;'));
});
test('candidate has no managed Auth mutation, new roles, seed or workflow permission expansion',()=>{
 assert.match(sql,/BEGIN;/);assert.match(sql,/COMMIT;/);
 assert.doesNotMatch(sql,/GRANT[^;]*\bauth\.|CREATE POLICY|ALTER[^;]*\bauth\.|INSERT\s|UPDATE\s|DELETE\s|CREATE ROLE|ALTER ROLE|TO supabase_(admin|auth_admin)|mc_api\./i);
 assert.match(sql,/REVOKE CREATE ON SCHEMA mc_private,public FROM mc_continuity_executor;/);
 assert.match(sql,/GRANT mc_continuity_executor TO postgres WITH SET FALSE;/);
});
test('rollback restores frozen original functions and removes only the new helper',()=>{
 const original=fs.readFileSync(base+'private-continuity.owner-bridge-pending.sql','utf8');
 assert.equal(createHash('sha256').update(original).digest('hex'),'37aca08d8c601a6af0b695f14da0e0a2ebd796dffd6b1ed29ef450bd9b2a284e');
 const rollback=fs.readFileSync(base+'private-continuity.owner-auth-helper-rollback.sql','utf8');
 const originalActor=original.slice(original.indexOf('CREATE OR REPLACE FUNCTION mc_private.current_actor()'),original.indexOf('RESET ROLE;'));
 const originalRpc=original.slice(original.indexOf('CREATE FUNCTION public.mc_owner_session(project text)'),original.indexOf('RESET ROLE;',original.indexOf('CREATE FUNCTION public.mc_owner_session(project text)'))).replace('CREATE FUNCTION public.mc_owner_session','CREATE OR REPLACE FUNCTION public.mc_owner_session');
 assert.ok(rollback.includes(originalActor));assert.ok(rollback.includes(originalRpc));
 assert.match(rollback,/DROP FUNCTION mc_private\.owner_auth_verification\(\);/);
 assert.doesNotMatch(rollback.replace(/^--.*$/gm,''),/CASCADE|GRANT[^;]*\bauth\.|CREATE POLICY|INSERT\s|UPDATE\s|DELETE\s/i);
});
test('future direct-call denial fixture requires an installed helper and rolls back',()=>{
 const fixture=fs.readFileSync(base+'private-continuity.owner-auth-helper-denial-validation.sql','utf8').replace(/^\s*--.*$/gm,'');
 assert.match(fixture,/to_regprocedure\('mc_private\.owner_auth_verification\(\)'\) IS NULL/);
 assert.match(fixture,/OWNER_HELPER_EFFECTIVE_BOUNDARY_NOT_READY/);
 for(const role of ['anon','authenticated','service_role'])assert.ok(fixture.includes('SET LOCAL ROLE '+role+';'));
 assert.equal((fixture.match(/PERFORM \* FROM mc_private\.owner_auth_verification\(\)/g)||[]).length,3);
 assert.match(fixture,/ROLLBACK;/);assert.doesNotMatch(fixture,/COMMIT;|GRANT\s|CREATE FUNCTION|INSERT\s|UPDATE\s|DELETE\s/);
});
