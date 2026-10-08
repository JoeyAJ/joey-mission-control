# Native resolver repair and single read-only pilot preflight

## Result and release gate

**LOCALLY VERIFIED REPLACEMENT PREPARED; NOT RELEASED.** Full portable/build/schema/static checks are 558/558 PASS. The actual 292,309,256-byte Codex 0.161.0 native binary matches the unchanged SHA-256 `9a820c17865fa825d04db416818679a9d63bd72e50835c396f496e5684626c9c`. Two real-byte package-layout tests, actual installer with synthetic pairing/service ports, 13 real interactive PTY scenarios and 9 native PostgreSQL configuration-transition cases PASS. OS permission/service queries in tests are synthetic; no real VM service or model was invoked. No remote configuration write, push or deployment was performed for this replacement.

## Confirmed cause and actual attempt

The official fixed-version CLI resolves `@openai/codex-linux-x64/package.json` relative to its own package, then uses `vendor/x86_64-unknown-linux-musl/bin/codex`, falling back to its own vendor tree only when that package is absent. Our installer instead searched `.../codex/codex`. Both fixture layouts reproduce the old path failure and qualify the real pinned native bytes with the corrected resolver. Primary source: https://raw.githubusercontent.com/openai/codex/rust-v0.161.0/codex-cli/bin/codex.js . Do not guess the VM's full native path; the preflight reports the actual resolved path/hash without invoking Codex or reading Auth cache.

Joey's latest worker is `ubuntu-1-e755ff4f-2c05-45f6-b805-eb1e946a158a`, fence 8 job `832d8d25-2432-4d10-881b-45f02171df1f`. Bootstrap authorization was committed at 11:52:02.437 UTC and Edge v6 returned archive HTTP200. The screenshot then reported `PINNED_CODEX_PATH_REQUIRED`. This occurs before key generation/pair commit/service start. At 11:53 the worker was unpaired/disabled/keyRegistered=false/revoked=false, the job unclaimed/unspawned/events0. At 12:22:31 UTC configuration still has the old artifact, all 8 workers are unpaired/unkeyed, 1 is unrevoked, 1 job nonterminal, claimed/spawned jobs 0, events 0, worker receipts 2. Current guarded configuration eligibility is therefore **false**.

## Preflight before any pairing approval

The normal pinned bootstrap runs the aggregate read-only preflight before the masked code prompt. The existing UI's prepare-command step does not create a code/job; Owner approval remains after the terminal actually reaches the wait-for-code prompt. A local `--preflight <prepared-worker-id>` diagnostic prints all findings without accepting a code or contacting the broker.

Checks include Linux/x64/unprivileged identity; terminal/service Node versions; safe creation umask; existing proxy presence as a boolean only; fixed ancestor directory types/owners/modes/canonical paths; release/state/config/key/journal/lock presence as booleans only; official CLI shim and actual native path/size/SHA; trusted fixed service tools and systemd-run options; system-manager state; NTP synchronization; read-only `sudo -n -ll -- <exact service argv>` listing of the matching passwordless rule; and absence of the exact service unit. All independent failures are reported together. It never executes sudo's target, creates a service, changes permissions, installs packages, reads key/config/Auth contents, logs in or invokes Codex. Current ChatGPT Auth and actual service creation remain unproven by this metadata preflight.

The latest failed install may have written the public release tree and created empty state/workspace before resolving Codex. Existing installation/state remains a strict reconciliation gate; no overwrite, deletion, rekey or blind replay was added. Before another human attempt, obtain one aggregate VM preflight, reconcile only the actual verified leftovers under specific authorization if necessary, and confirm the expired worker's Owner revoke/job cancellation. Do not reinstall the known official CLI or request another login.

## Exact integrity transition and scope

Old worker artifact: `9bb363726a13bd96341c84b015354daaa454c6265b5bf0d2c5aff6eab1e3d647`.

Verified replacement artifact: `0de5fbd05a012fccabb23a4edf2ff7374b71d695b2505cfc4092ac8b85076613` (15,420 bytes).

New bootstrap: `ec4340b041dec7c4f7acb2f6b59f1d95451a8bbc67c36cf3c244db76061d3e8e`.

Policy stays `72f8c00bb21e91fe86720678d72b650eada8dc54ef1f3b5d3dca6395bb83c6f9`; native pin/version/size, Owner Auth, key protections, Ed25519 admission, host/project, job/actions/prompt, grants/schema, lease/deadlines, maximum service/pilot duration, child environment and service argv are unchanged. The compiled Owner bundle differs only in the reviewed artifact/bootstrap hashes. Initial approved SQL remains byte-identical, SHA-256 `bba24c9b6154daaee4fd73a22851e24c08337325cc3db3e20f96a18de49aff76`; the builder no longer overwrites that approved baseline on repairs.

Changing the artifact digest selects this verified replacement within the same existing permission and executable boundary. It changes the trusted code integrity binding, so use an exact guarded transition; it does not grant a new role, action, host, lifetime or model capability. Per the parent's instruction the consequential submission remains pending scope review; no automatic approval review has rejected it and no new tool authority was requested.

Prepared script: `docs/contracts/vm-link/deploy/worker-artifact-repair-20261008.pending.sql`. It locks the same configuration row used by Owner/worker RPCs, requires old enabled configuration/policy/artifact exactly, all workers revoked and unpaired/unkeyed, no nonterminal/claimed/spawned jobs or events, and updates only one `artifact_digest` row. Changed baseline, active worker/job, bound key, execution evidence and repeat submission all fail atomically. It does not apply the full schema or change grants. Native PostgreSQL tested 9 allowed/denied/atomic cases.

## Coordinated publication after review

Keep fresh Owner approvals stopped. First read the cleanup and baseline guards. Submit the exact reviewed guarded configuration transition once; stop on any failure. Deploy the existing function with the seven-file committed payload, preserving current custom authentication. Standard anonymous HTTPS GET must return the exact new bootstrap checksum. Then non-force push the same private checkpoint branch only if its remote head still matches the recorded baseline, await the fixed private alias READY, verify served JS/config/bootstrap pins, and confirm production unchanged. Before any new pairing, the VM aggregate preflight must pass and partial installation reconciliation must be complete. This package is not actual Auth/AAL2, pairing or VM execution proof.

Safe receipts: `docs/contracts/vm-link/receipts/native-preflight-20261008/`. External complete command, staged payload, checkpoint and source bundle: `/workspace/mc-deliverables/mc-runtime-preflight-20261008/`.
