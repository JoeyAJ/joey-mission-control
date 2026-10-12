# Qualified Owner closure recovery
Status: LOCAL_VERIFIED_PENDING_PUBLICATION
Canonical baseline:8d0a4ab99d5ac46e72e864e9ceed465418c7356c
Reviewed product source:904d1a0d7f50379befa5168e2f0ef6c42e94e3b8

Selected cloud-backed development tasks now have a collapsed closure panel with task/requirements revision, exact code/PR, fresh observedCI, dated Owner decision and saved progress. All projects can export a qualified metadata-only Handoff draft. Durable cloud journal pilot remains MISSION_CONTROL/BASELINE and the exact authorized fixed Preview only. No dispatch, merge or deployment control executes an effect; executionAuthorized:false and productAccepted:false remain explicit.

“Save this closure progress” explicitly binds the latest current APPROVE, exact task/requirements/code/base/report/run/PR, and original Owner decision operationID. No journal is created automatically. One Owner operation is retained; unknown-outcome attempt markers cannot reset or roll back. Recovery loads that original operation without another row or revision reset.

“Read original Owner decisions for recovery” is a separate explicit, read-only, same-origin Owner history request with8-second abort bound, strict response/digest validation, liveOwner/AAL2/membership/session checks and generation fences. It avoids task/cloud refresh, preserving CI. Historical decisions survive same-task source/CI/current-review invalidation, but do not become current reviews. Changed task/request/scope, dirty input, cloud conflict/unavailability, source/report loss, conflicting newly observed decisions and denial/expiry purge private recovery state. The historical lease lasts at most60seconds.

After manual merge, currentOwner review remains historical because canonicalHEAD advanced. Recording manual-deploy handoff requires the freshly read original latest APPROVE operation/sequence/digest, unchanged task revision/requirements/code, exact original report run/head/blob/sequence, and fresh observed canonicalHEAD matching the supplied merge reference. The captured decision, lease and eligibility are rechecked synchronously immediately before journalCAS, after all awaited load/Owner checks. A lease expiring during load sends noCAS. These controls save metadata only; they do not authorize or perform deployment.

Operator references remain UNVERIFIED_PROVIDER_RECEIPT_REFERENCE. Import fills the private editor; Save is explicit. Owner-supplied PASS never becomes independent provider verification or product acceptance. Revocation prevents new steps while permitting results of already-attempted steps to settle. Handoff remains PRIVATE_OWNER_CLOSURE_DRAFT_NOT_INDEPENDENT_VERIFICATION and DRAFT_ONLY_VERIFICATION_PENDING.

Approved installed journalv2 SQL/RPC, monotonic CAS, roles/RLS and existingAuth/settings are unchanged. This release only wires the existing official Owner client to the approved journalRPC. Manual Magic Link stays user-triggered; numericOTP staysOFF; exactOwner/live-session/AAL2/TOTP/privacy/race protections remain. Saved-only task, report history/capacity and Production are untouched.

Validation: adjacentQA has18 closure/native-controller unit passes,6 synthetic browser passes, freshbundle pass and8 affected review interoperability flows across boundedruns. Independent source/race/pixel reviewGO. Broader full-matrix timeouts remain disclosed. Real OwnerHTTP is still pending.

## Next real user check

Open the fixedPreview/#joey?project=MISSION_CONTROL. Explicitly request the email login link and complete existingTOTP. Parent selects an authorized existing MC task; never select the saved-only task for testing. Inspect freshCI and currentOwner decision before saving the bound progress. After actual operator-supplied merge evidence/canonical advancement, read original decisions, refreshCI, select that original decision and recover the same journal. Confirm the currentOwner tuple is historical, the progress is retained, and any manual-deployment marker remains metadata only. ExportHandoff and confirm draft/unverified qualifications.

The real boundary requires actualOwner same-origin private review HTTP and approvedSupabase journal load/CAS/recovery with realOwner JWT/session. Synthetic fixtures and SQL-admin role-denial checks do not prove this boundary. Parent arranges controlled explicit writes/acceptance; no automatic email, fixture rows, credential capture or provider execution. A403/expired session must erase private closure state.
