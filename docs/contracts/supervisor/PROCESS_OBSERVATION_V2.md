# Inactive process-observation candidate v2

This is private candidate code, excluded from deployment with `docs`. It does
not start/attach an Agent, create a process host, signal a process, authenticate,
dispatch, call a database or publish events. All capabilities are false;
`activate()` always refuses. Neither the existing app nor server imports it.
Owner acceptance remains deferred and `submit=false`.

`supervisor.mjs` is the provider-neutral safe-event consumer. `candidate.mjs`
adds the first Codex-specific JSONL adapter and exact inactive launch plan.
Other providers can reuse the safe vocabulary with their own declared
provider/format/version binding; the synthetic other-provider test is not an
implemented integration with another provider. No provider API is invented.

## Contracts and provenance

| Contract | Purpose / exact validator |
|---|---|
| `mc.inactive-launch-policy.v1` | Exact executable and workspace allowlist, project/mission/baseline/scopeRef, read-only sandbox, freshness/capacity/cancellation scope. `launch-policy.mjs` |
| `mc.inactive-launch-plan.v1` | Immutable inactive argv plan and digests, actual file/realpath/executable-byte hash. Baseline, permission and effective runtime policy remain unverified |
| `mc.observer-binding.v2` | Run/attempt/project/mission/baseline, scope/workspace/launch/binary digests, provider/format/adapter/runtime version, qualification and budgets. `observation.mjs` |
| `mc.process-observation.v2` | Binding digest, event ID, contiguous observer sequence, expected revision, source/observation/recording times, safe payload and digest |
| `mc.supervisor-journal.v2` | Binding plus integrity-checked complete observation state; private atomic local custody |
| `mc.candidate-observation-view.v2` | Recorded provider/transport/turn/exit facts, separate freshness/unknowns and hard disconnected current state |

IDs are bounded ASCII; SHA/digests are exact lowercase40/64hex. JSON data with
getters, custom serialization/prototypes, hidden/symbol properties, sparse
arrays, cycles, oversized fields or deep nesting is rejected before copying.
Unknown contract fields are rejected. The actual executable hash is file
evidence, not proof that a model ran, that permission exists, or that the file
will still be identical at a later launch. Plans keep paths/argv/prompt in
memory for review; the journal stores only their digests and safe binding.

The only accepted qualifications are `SYNTHETIC_FIXTURE` and
`UNVERIFIED_IMPORTED_JSONL`. There is no verified/live value to promote. Source
session IDs are recorded data, not identity authentication. OS transport/exit
observations and cancellation requests are synthetic-only in this candidate.
`processBindingVerified`, `hostPersistenceVerified`, `taskPermissionVerified`
and `runtimeConnected` remain false; agent/task/model stay null. No owner
acceptance is inferred from tool/turn completion or a zero exit.

## Codex adapter and bounded input

Official `codex exec --json` lifecycle types normalize into session, turn,
item, completion/failure and provider-error observations. Known item categories
and optional status/command exit code are retained; an unknown item category
becomes `unknown`. Thread/item IDs are bounded. Commands, outputs, code,
paths, reasoning, messages, identity/model claims, usage and arbitrary extra
fields are discarded before persistence. Unsupported lifecycle types and
contradictory/invalid statuses fail closed. Provider error text/code is replaced
by a closed generic class.

`createCodexJsonlFramer()` accepts supplied chunks only; it does not open stdin
or attach a child. Limits:64KiB per line,256KiB per chunk,1000 safe records per
chunk,16 nesting levels. UTF-8 split across chunks is handled; invalid encoding,
malformed JSON, capacity/unknown types are sticky errors. Earlier accepted
lines are returned separately from a later error; raw lines are never returned.
The caller ingests normalized safe records with its stable delivery IDs,
sequence/CAS and observer time. Ending an imported file is not a process exit.

The allowlisted inactive command has exactly
`exec --json --sandbox read-only --ignore-user-config --cd <exact-root> -- <prompt>`.
No shell, arbitrary argv/options, environment injection, login, bypass flag or
extra workspace is accepted. Realpath/symlink/executable checks are local
metadata/file reads only. Actual task permission, Git baseline, inherited
environment/project hooks/config, provider network and managed approval policy
must be verified before any future activation; the plan cannot grant them.

## Time, lifecycle and recovery

`sourceEventAt` stays null: the qualified Codex JSONL example does not supply
native event time, and arbitrary caller timestamps are discarded. `observedAt`
and `recordedAt` are separate valid UTC times. New observations cannot regress
or postdate their receipt. `readAt` is projection-only. Inspection compares
read time to last provider observation: `unknown`, `observed_recently`, `stale`.
Silent time, a redraw/read, transport-open fixture or cancel request never
fabricates progress/heartbeats or renews provider freshness. A later accepted
source event can restore recent observation without inventing a new session.

A completed turn is separate from process exit; another turn may start on the
same recorded session. Item/turn/session ordering is checked. EOF means output
ended with process/outcome still unknown until an exit observation arrives.
Nonzero exit is an observed failed exit; zero exit needs a recorded completed
turn for a completed-turn/zero-exit outcome. Spawn failure records missing
identity/start failure. Cancellation persists intent with `signalSent=false`;
only a later typed signal observation can record termination after the request.
Success racing cancellation retains the observed success. These are synthetic
or imported observations, never current Agent/task claims.

The future process host must drain stdout before its final process-exit receipt
(for Node, use the child's close boundary). An earlier native exit callback is
not permission to discard buffered source events. Unexpected standard signals
remain typed signal exits; they are not turned into a cancel acknowledgement.

Same event ID/sequence/normalized-safe-payload digest replays the original
receipt without rewriting/freshening its times, including at capacity or after
restart. Different safe bytes conflict. Observer sequence and store revision
are contiguous; no provider-global cursor is invented. Old history is not
pruned; capacity refuses new events. Restoring validates full safe history,
digests, binding, chronology and lifecycle. A new run/attempt/baseline/codec
cannot silently reuse that journal.

The explicit root must be `/workspace` or `/tmp` plus
`mc-supervisor-candidate-data-<id>`, outside the product repo. Existing foreign
files, symlink/hardlinked custody and insecure modes are rejected. Root0700,
files0600; writes use private temporary file, fsync, rename and directory fsync.
One exclusive lifetime writer lease serializes ingestion; no timeout/old mtime
steals a live or stale lease. A crashed lease requires operator reconciliation
before removal; no runtime is resumed/launched as a recovery side effect.
Corrupt state is neither reset nor quarantined automatically.

Persistence failure returns `PERSISTENCE_UNCERTAIN`: rename might already have
committed. Re-read/retry the same original ID and safe bytes, preserving the
first receipt, rather than assuming success or dispatching a duplicate task.
The same private journal is not a canonical/Owner store or a cloud sync source
until a separately approved authority cutover and custody check.

## Verification and activation boundary

Run `node --import ./tests/test-environment.mjs --test tests/supervisor-candidate.test.mjs`.
Every event/binary/scope in those tests is explicitly synthetic. Tests create
candidate files, never execute the dummy binary/Codex or use network/credentials.
The portable full suite/build/schema checks are reported in the stage handoff.
No real producer end-to-end, protected Owner session, AAL2, two-device, cloud
writer or deployment verification follows from these tests.

Next activation packet is in `../../MC_CLOUD_SUPERVISOR_CANDIDATE_HANDOFF.md`:
one selected already-provisioned cloud runner/container and real durable root,
one already-authorized MC-only task and read-only working scope, exact CLI
version/binary/config/environment/network, direct child-pipe binding, safe
capture/cancellation and budget boundaries. The missing live transport must be
implemented/reviewed in that packet. No new machine credential is created until
Joey separately approves its exact credential/grant/custody scope.
