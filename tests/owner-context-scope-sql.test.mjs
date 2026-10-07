import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareOwnerContextScopeSql} from '../src/continuity/owner-context-scope-sql.mjs';
const args=()=>({ownerSubject:'11111111-1111-4111-8111-111111111111',epoch:'import_'+'a'.repeat(32),contexts:['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'].map((projectId,i)=>({projectId,contextHash:String(i+1).repeat(64)}))});
test('lookup SQL exposes only one authenticated fixed Owner/AAL2 project/hash pair',()=>{
 const {sql,bodyMd5}=prepareOwnerContextScopeSql(args());assert.match(bodyMd5,/^[a-f0-9]{32}$/);assert.match(sql,/SECURITY DEFINER SET search_path=''/);assert.match(sql,/mc_private.owner_auth_verification\(\)/);assert.match(sql,/actor.aal IS DISTINCT FROM 'aal2'/);assert.match(sql,/m.member_role='OWNER' AND m.active/);assert.match(sql,/h.revision=0 AND NOT h.writes_enabled/);assert.match(sql,/RETURN pg_catalog.jsonb_build_object\('projectId',project,'contextHash',pinned\)/);assert.match(sql,/REVOKE ALL.*FROM PUBLIC,anon,authenticated,service_role/);assert.match(sql,/GRANT EXECUTE.*TO authenticated/);assert.doesNotMatch(sql,/INSERT |UPDATE |DELETE |CREATE ROLE|GRANT CREATE|GRANT .* ON SCHEMA|read_events|append_operation/);
});
test('invalid owner, epoch, incomplete or broadened project/hash scope cannot produce SQL',()=>{
 for(const patch of [{ownerSubject:'invalid'},{epoch:'arbitrary'},{contexts:args().contexts.slice(1)},{contexts:[...args().contexts.slice(1),{projectId:'UNKNOWN',contextHash:'a'.repeat(64)}]},{contexts:args().contexts.map(c=>({...c,contextHash:'bad'}))}])assert.throws(()=>prepareOwnerContextScopeSql({...args(),...patch}),/OWNER_SCOPE_SQL_INVALID/);
});
