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

The two-body source correction and real local PostgreSQL two-connection checks
now pass. See [correction handoff](MC_OWNER_DECISION_RPC_CORRECTION_HANDOFF.md).
The deployed definitions remain unchanged because the current management caller
lacks existing function-owner privileges. Keep preview submission disabled until
deployed definitions and applicable bounded integration checks are verified.
Temporary CREATE/SET grant expansion requires separate authorization. Preserve
the original migration and historical checkpoint; do not rerun the migration.
Exact candidate source/tree, deployment and file digests remain in the external
correction checkpoint rather than self-referencing this commit.
