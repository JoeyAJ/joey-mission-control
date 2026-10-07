# Data API exposure — actual readback remains inconclusive

Exact project `scmvedfqwlhkyvljymjj`; helper approval is pending and its SQL is not applied. Prepared candidate SHA-256 stays `5f5ccdbc132f5531f8be000d716e881d09718fc17ad412b95c022fcf46ffa554`, rollback `31149c39bd2ac220dd21d148a0cc59345fad5ec6b8d44d1d271c273590e21de6`.

## Read evidence and correct conclusion

Current Supabase connector inventory has no Management API PostgREST-config read action. `get_project` confirmed ACTIVE_HEALTHY but returned no exposed-schema configuration. No additional Management API credential/host was obtained or contacted.

Two read-only metadata GETs, zero retries/redirects, only the approved project HTTPS host and existing modern publishable identifier:

| UTC time | Root metadata profile request | HTTP | Proxy CONNECT | TLS verification | Result |
| --- | --- | --- | --- | --- | --- |
| 06:11:46.778 | GET /rest/v1/, Accept-Profile mc_private, Accept application/openapi+json, apikey only | 401 | 200 | 0 (pass) | Access denied; exposure unproven |
| 06:13:31.406 | Pinned SDK 2.117.2 getOpenApiSpec(), same path/profile, SDK standard API-key headers | 401 | 200 | 0 (pass) | Access denied; exposure unproven |

The SDK used its own modern-key Bearer fallback, consisting of the same existing public identifier, not a user JWT or legacy key. It had accessToken: async()=>null, no Auth client/session initialization, database retry=false and a strict one-call curl transport preserving normal proxy/TLS. No Auth API, table, RPC, login, user creation or email request ran. An initial local module-path resolution failure happened before any SDK network call and was fixed by Node's package resolver; it is not an HTTP attempt. Temporary raw response files were deleted; only safe status/time/config metadata remains.

Neither response supplied PGRST106 or an effective exposed-schema list. Thus **mc_private exposure is UNKNOWN**, and mc_api exposure is likewise not established. The 401s are not proxy blocks, schema-list denials, absent-function evidence, or proof of private-row disclosure. Do not report NOT EXPOSED/PASS.

[PostgREST schema selection](https://github.com/PostgREST/postgrest/blob/main/docs/references/api/schemas.rst) documents Accept-Profile and PGRST106 for schemas outside db-schemas. Its [OpenAPI reference](https://github.com/PostgREST/postgrest/blob/main/docs/references/api/openapi.rst) says the root specification is metadata filtered by caller privileges. Supabase's [PGRST106 troubleshooting guide](https://supabase.com/docs/guides/troubleshooting/pgrst106-the-schema-must-be-one-of-the-following-error-when-querying-an-exposed-schema) distinguishes effective authenticator settings from dashboard configuration. No schema is added or config reset based on that troubleshooting example.

## Actual current access boundary

Read-only catalog observation at **06:14:52.651312 UTC** found no db_schemas/db_pre_config/openapi_mode value in connector GUC, role GUC or database-role settings. These absent values do not reveal PostgREST's external runtime configuration.

Effective USAGE=false and CREATE=false for **anon, authenticated, service_role** on both **mc_private and mc_api**. All three roles have EXECUTE=false on current_actor, append_operation, read_events and read_context. The existing bounded public.mc_owner_session grants authenticated EXECUTE only; anon/service_role are denied. All listed functions remain owned by mc_continuity_executor. The proposed helper still does not exist.

Those ACL observations establish the present private caller boundary, independently of the unknown schema list. They do not certify provider Auth, positive identity RPC, real AAL2/revocation or future helper behavior. No private workflow data was fetched and no mutation was made.

## Next evidence and conditional configuration proposal

Parent/owner can read the existing exact project's Data API exposed-schema/OpenAPI settings through an authorized official Dashboard or Management API config-read capability. Record both configured and effective values; preserve existing settings. No OwnerJWT, password, secret/service key or new credential is needed for this administrative read.

If an actual configuration read finds mc_private in the exposed list, prepare a narrowly scoped proposal to remove **only mc_private**, preserving every other existing schema, then obtain approval before applying. mc_api remains outside writer activation; do not add it or grant visitors private usage to make metadata inspection work. No unconditional config patch is proposed because the current list has not been read. SQL's existing private ACLs remain the observed defense while configuration evidence is missing.

After exact helper approval, apply/verify its transaction and denial gates before opening fixed-preview login flags. Exposure acceptance should remain explicitly unresolved until the official read/effective profile evidence succeeds. Production promotion/private writer cutover is not part of this work.

## Owner login handoff usability

The confirmed Owner, existing publishable configuration, and actual closed-signup/anonymous/Email settings are already recorded. Do not ask Joey to recreate the account, resend credentials/key or repeat those setup actions. Current fixed preview intentionally shows the pending state because ownerSubject=null and sessionBridgeVerified=false; no live signin/TOTP form is available yet.

The post-approval activation path remains: exact helper migration and effective ACL/denial checks -> separately record exposure result -> bind frozen Owner/stage config and rebuild -> Joey enters app password herself -> identity-only current-session verification -> setup or challenge app TOTP -> record real AAL2/current-session result. Identity-only verification does not require private membership, seed data or enable a writer. Existing unverified MC TOTP restart and verified-factor challenge stay available; agent never captures password/code/QR/session token.

The prior 405/405 portable checks and synthetic browser matrix remain valid historical evidence for unchanged runtime code. They were not rerun during this read-only investigation. Real protected-preview HTTP/browser acceptance, Auth/AAL2/revocation, two-device continuation and private workflow acceptance remain NOT RUN. Safe detailed receipt: `docs/contracts/MC_DATA_API_EXPOSURE_READBACK.json`; external HTTP receipts under `/workspace/mc-deliverables/owner-auth-schema-exposure*.json`.
