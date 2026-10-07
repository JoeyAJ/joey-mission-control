// Offline SQL preparation only. Caller supplies privately reviewed fixed scope.
// No database access, provider configuration or ambient identifiers.
import {createHash} from 'node:crypto';
const projects=['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'];
export function prepareOwnerContextScopeSql({ownerSubject,epoch,contexts}={}){
 if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(ownerSubject||'')||!/^import_[a-f0-9]{32}$/.test(epoch||'')||!Array.isArray(contexts)||contexts.length!==4||new Set(contexts.map(c=>c.projectId)).size!==4||contexts.some(c=>!projects.includes(c.projectId)||!/^[a-f0-9]{64}$/.test(c.contextHash)))throw Error('OWNER_SCOPE_SQL_INVALID');
 const pins=JSON.stringify(contexts.map(c=>({project_id:c.projectId,context_hash:c.contextHash})).sort((a,b)=>a.project_id.localeCompare(b.project_id,'en')));
 const body=`
DECLARE actor record; pinned text; BEGIN
 SELECT * INTO STRICT actor FROM mc_private.owner_auth_verification();
 IF actor.subject IS DISTINCT FROM '${ownerSubject}'::uuid OR actor.aal IS DISTINCT FROM 'aal2'
 THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OWNER_SCOPE_ASSURANCE_DENIED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_to_recordset('${pins}'::jsonb) AS e(project_id text,context_hash text) WHERE e.project_id=project)
 THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OWNER_SCOPE_PROJECT_DENIED'; END IF;
 SELECT e.context_hash INTO STRICT pinned FROM pg_catalog.jsonb_to_recordset('${pins}'::jsonb) AS e(project_id text,context_hash text) WHERE e.project_id=project;
 IF NOT EXISTS(SELECT 1 FROM mc_private.members m WHERE m.subject=actor.subject AND m.project_id=project AND m.member_role='OWNER' AND m.active)
  OR NOT EXISTS(SELECT 1 FROM mc_private.heads h WHERE h.project_id=project AND h.epoch='${epoch}' AND h.revision=0 AND NOT h.writes_enabled)
  OR NOT EXISTS(SELECT 1 FROM mc_private.contexts c WHERE c.project_id=project AND c.context_hash=pinned AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(mc_private.canonical_json(c.filtered_claims),'UTF8')),'hex')=pinned)
 THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OWNER_SCOPE_MEMBERSHIP_OR_CONTEXT_DENIED'; END IF;
 RETURN pg_catalog.jsonb_build_object('projectId',project,'contextHash',pinned);
END;
`;
 return Object.freeze({bodyMd5:createHash('md5').update(body).digest('hex'),signature:'public.mc_owner_context_scope(text)',sql:`CREATE FUNCTION public.mc_owner_context_scope(project text) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $owner_scope_body$${body}$owner_scope_body$;
REVOKE ALL ON FUNCTION public.mc_owner_context_scope(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_context_scope(text) TO authenticated;
`});
}
