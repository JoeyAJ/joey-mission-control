Current correction hold: preview submission is disabled; read views remain.
See [guarded handoff](MC_OWNER_DECISION_GUARDED_HANDOFF.md). The3814c61 receipt
below does not establish the two deployed RPC correctness fixes. The isolated
[correction checkpoint](MC_OWNER_DECISION_RPC_CORRECTION_HANDOFF.md) passes native
two-connection checks; both deployed bodies now match their predicted definitions
and the specifically approved temporary INHERIT option is fully restored.

# Owner coordinator final-decision persistence

This stage implements Joey's13:24:03 approved private ACCEPT/REJECT persistence
on top of fixed917d and prepared0d44. Existing P5 panes, P3 proposal/result journal,
Auth origin, Owner mapping, session storage and recovery are retained. Exact
source/parent/tree/manifest and READY fixed-preview receipt are outside Git in
`owner-decision-persistence-checkpoint.json`; this file cannot self-claim its commit.
Production remains at8b4945b; protection and Owner identity are unchanged.

Joey first reads the private coordinator journal, prepares ACCEPT or REJECT for
one exact proposal/result, reviews its content/version, then separately confirms
saving. The UI shows success only after a validated server acknowledgement and
fresh current Owner check. A lost response shows unconfirmed; an explicit retry
reuses the identical operation ID/content. Saved decisions read back through the
separate bounded Owner projection with50-row paging. They do not execute work.

The server stores append-only Owner/session/AAL2 audit and server time, using
shared budget/project locks, distinct decision CAS, exact immutable evidence,
expiry and one final outcome per proposal. It refuses management callers.
See [applied grant scope](MC_OWNER_DECISION_GRANT_SCOPE.md) for exact migration,
SQL digest, ACL and remaining actual acceptance. Do not reapply the migration.

Readback: decision rows0, coordinator rows2, native events0, frozen heads4,
active machine writers0, temporary schema CREATE/role SET=false. The agent made
no real ACCEPT/REJECT. Existing SQL functions and machine authority are preserved.

Validation: full482/482 tests, build/schema/static safety PASS and forbidden
workstation attempts0. Nine synthetic browser cases cover1440/390/320, three
locales, explicit preparation/confirmation, ACCEPT/REJECT, immutable saved
readback,50-row paging, response-loss exact retry, conflict refusal, clearing,
locale/project/logout/member/pagehide isolation and no overflow. Existing SDK
lifecycle9, fresh-touch official pinned SDK5 and Recovery integration9 PASS;
all synthetic, zero live Auth requests. Local isolated PostgreSQL checks pass
four-project algorithm/denial/replay/CAS/expiry/quota/readback/rollback cases.

Large actual Supabase rollback fixture calls ended without completion receipts.
Their runtime result is UNCONFIRMED. Local PostgreSQL success does not replace
actual provider AAL2, revocation, parallel two-device or lost-response acceptance.
Joey13:10 reported phone login working; this remains a user report and is not a
new phone RPC/decision proof. Real Safari/WebKit was not run. A real final decision
is pending Joey's own explicit click; the agent must never generate one for QA.

Continuation: verify the external exact SHA/deployment receipt, applied migration
and zero-or-existing decision state before further work. Do not seed or overwrite
the genuine proposal/result, install again, reset Auth/factors, collect credentials,
change production/protection, grant canonical writers or enable agent dispatch.
Unsupported current-task telemetry and canonical synchronization remain separate.
