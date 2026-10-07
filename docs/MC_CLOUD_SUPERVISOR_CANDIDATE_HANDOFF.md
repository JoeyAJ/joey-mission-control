# MC cloud supervisor candidate handoff

Parent/source:`cfb3d7e20dae2e2ecc39e8efe1adb4bc1d8a6a00`;
tree:`f6d47d148552f46d513165ed8c86679c2f83c74a`.
Private isolated branch:`codex/mc-cloud-supervisor-candidate-20261007`.
Exact final source/tree, artifact hashes and completed verification are external
in `/workspace/mc-deliverables/cloud-supervisor-candidate-checkpoint.json`.
Checkpoint custody is local/private unless a later push receipt says otherwise.
Fixed preview remainscfb3d7e; production remains its prior8b4945b anchor.
No push, deployment/promotion or runtime activation is part of this stage.

The candidate implements a provider-neutral safe-event supervisor, process
observation v2, one Codex JSONL normalizer/framer, exact inactive command/workspace
plan, private bounded atomic journal with single-writer lease, typed recorded
provider/transport/turn/exit/cancellation facts, unknown/stale projections,
dedup/CAS/restart/conflict/integrity checks and redaction. Core accepts another
synthetic provider binding without importing its API; that is portability
evidence, not another provider integration. Every synthetic test is labelled.
Existing v1 imported history is retained and not upgraded.

Verification: focused35/35 synthetic tests and full portable521/521 PASS;
build, validate (five schemas/four projects) and static safety check PASS;
forbidden workstation reads0. Failure coverage includes pre-/post-rename
uncertainty, lost receipt replay, replaced/stale writer lease, capacity,
corruption, clock/serialization/UTF-8 errors and cancellation/exit races.
Existing tracked src/public/API/deployment/SDK/config/build inputs are byte
identical tocfb3d7e. Browser was not rerun: no app/UI/Auth/import graph changed.

Source is only new `docs/contracts/supervisor`, synthetic test/helper and private
handoff/phase metadata. Nothing is wired into app/server/public/API/Auth/SDK.
The existing disconnected UI remains truthful; an extra candidate panel would
not improve the real product until there is an actual source. Candidate current
agent/task/model are null, runtimeConnectedfalse, all execution capabilities
false, and activate always rejects. Cancellation sends no signal. No child,
new login/key/token/machine credential, new network grant, database write,
canonical change, public event publication or dispatch occurs.

## Cloud independence and real durability

“Local supervisor” means local to the selected **cloud runner/container**, next
to its task process. No Mac path, Mac API, running Mac or desktop Owner session
is required by these modules. This coding workspace can build/test candidate
files now. Its existence does not prove an always-on service, persistent volume,
post-task retention, restart lease ownership, process recovery or independent
web ingress. There is no purchase/free-tier assumption.

A durable cloud runner must have an identified existing deployment/container
owner, verified persistent private volume or reviewed remote journal, secure
runtime/auth custody, restart/reconciliation rules, a sole fenced task writer,
actual allowed network and capacity/lifetime limits. Changing conversation or
ending this ephemeral coding workspace must not erase the chosen event custody
or automatically replay a task. A Git checkpoint preserves safe source/handoff;
it is not the private runtime journal or proof of a running service. Supervisor
filesystem operations/fsync cannot prove the host's volume durability.

## Exact next activation approval boundary

Candidate preparation is already approved; no routine file-write permission is
missing. Current stage explicitly forbids activation. Before a first real run,
prepare a concrete packet with one **already-provisioned authorized cloud
executor** and data root; exact approved MC-only task/mission/baseline and
read-only workspace; verified Codex executable/version/schema/current auth
availability; reviewed managed sandbox/approval policy, inherited config/hooks
and restricted environment; supported model transport/host within actual
approved network; allowed safe metadata, limits, process binding and scoped
cancellation. Add/review a real child-pipe transport without weakening the
candidate qualification gates. The current modules cannot start one.

If that particular task/runtime is already authorized, do not ask Joey again;
parent's explicit activation instruction can apply the existing scope. Otherwise
obtain authorization only for that exact real invocation/capture packet.
Remaining quota/credit/host persistence is unverified; do not create a paid
runner, buy credits or fall back to a new key. First proof must record actual
child/session binding, typed source event, missing source time versus observer
time, safe receipt, disconnect/exit/replay/restart and public isolation. No
retroactive attachment to this conversation is claimed.

Cloud shared persistence is separate: architecture proposed a new MC execution
journal in the **existing** MC Supabase, constrained workload role and Owner-only
read RPC. It needs exact SQL/grants, workload credential custody/revocation,
single-writer/fence/budgets and approved DB host/TLS/network. Existing
`mc_continuity_executor` is NOLOGIN; existing management OAuth/publishable ID or
Owner JWT cannot be substituted. **Do not create a machine credential before
Joey approves that exact packet.** No SQL apply/network probe/new host occurred.
Four imported heads and the fixed-scope proposal/result/Owner journals remain
separate. Canonical authority cutover remains store-specific, unassigned and
inactive; no second canonical writer may start.

Owner usability/final acceptance is still explicitly deferred; `submit=false`.
Neither CLI fixture success nor local fsync is true Auth/AAL2, live integration,
cloud durability, Owner acceptance or production readiness.

Detailed contract and API entry points:
[PROCESS_OBSERVATION_V2.md](contracts/supervisor/PROCESS_OBSERVATION_V2.md).
Research/capability inventory from the preceding stage is private in
`/workspace/mc-deliverables/MC_AGENT_INTEGRATION_ARCHITECTURE_20261007.md` and
`MC_AGENT_INTEGRATION_CAPABILITIES_20261007.json`; its observations remain dated.
