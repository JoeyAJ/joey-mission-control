# Owner decision correction hold

The fixed preview submit setup flag is false. Existing Auth/Owner/session/SSO,
private context, coordinator journal and saved final-decision reading remain.
The transport separately refuses prepare/confirm write routes when submit is
disabled, while bounded authenticated decision reads still work. The normal SDK
and session key are unchanged. Old already-loaded pages need a reload to consume
the guarded assets; this client flag does not revoke database EXECUTE authority.

This guard followed the premature3814c61 publication, which had separate
metadata/page SELECT snapshots and missing string/ID-format checks on three IDs.
Both deployed RPC bodies are now corrected by the specifically approved bounded
transaction. Its temporary INHERIT change was restored before commit; owners,
ACLs, settings, CREATE/SET and other grantor membership are unchanged.
No real Owner decision was submitted by the agent. Production is unchanged.

Guard validation: decision transport7, guarded synthetic browser9 (three locales,
1440/390/320; existing saved decision read preserved and zero decision writes),
existing SDK lifecycle9, build and static safety checks PASS. The browser endpoints
are synthetic only, with zero live Auth/DB requests. This is submit protection,
not acceptance of the unchanged SQL or actual Owner decision flow.

The two-body source, real native PostgreSQL two-connection verification, deployed
exact-definition/permission/count readback and bounded management/anonymous
denials pass. See [correction handoff](MC_OWNER_DECISION_RPC_CORRECTION_HANDOFF.md).
Keep submission disabled pending the fresh existing Owner-session read-only
smoke of the corrected projection. Real Joey AAL2 final decision and cross-device
acceptance remain separate. No additional permission expansion is authorized.
Preserve the original migration and historical checkpoints; do not rerun them.
Exact source/tree, deployment and file digests remain in the external applied
correction checkpoint rather than self-referencing this commit.
