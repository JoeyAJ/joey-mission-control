# Owner decision correction hold

The fixed preview submit setup flag is false. Existing Auth/Owner/session/SSO,
private context, coordinator journal and saved final-decision reading remain.
The transport separately refuses prepare/confirm write routes when submit is
disabled, while bounded authenticated decision reads still work. The normal SDK
and session key are unchanged. Old already-loaded pages need a reload to consume
the guarded assets; this client flag does not revoke database EXECUTE authority.

This guard follows the premature3814c61 publication. Its deployed SQL still has
two unresolved correctness defects: separate metadata/page SELECT snapshots,
and missing JSON string/ID-format checks on proposalId/proposalOperationId/
resultOperationId. The guard makes no SQL, grant, role, account or factor change.
No real Owner decision is submitted by the agent. Production is unchanged.

Guard validation: decision transport7, guarded synthetic browser9 (three locales,
1440/390/320; existing saved decision read preserved and zero decision writes),
existing SDK lifecycle9, build and static safety checks PASS. The browser endpoints
are synthetic only, with zero live Auth/DB requests. This is submit protection,
not acceptance of the unchanged SQL or actual Owner decision flow.

Next: correct only the two RPC bodies in this isolated candidate. Verify real
local PostgreSQL with two distinct connections, including read snapshot integrity,
concurrent CAS and exact idempotent replay. Keep the preview submit flag false
until deployed definitions and applicable bounded integration checks are verified.
No temporary CREATE/SET grant expansion is authorized. Preserve the original
migration; do not rerun it. Exact source/deployment/manifest and subsequent
correction results belong in the external guarded checkpoint.
