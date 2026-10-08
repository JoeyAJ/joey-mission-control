# Native resolver repair and single read-only pilot preflight

## Result and release gate

**COORDINATED PRIVATE RELEASE PASS; ACTUAL VM PREFLIGHT PENDING.** Full portable/build/schema/static checks are 558/558 PASS. The actual 292,309,256-byte Codex 0.161.0 native binary matches the unchanged SHA-256 `9a820c17865fa825d04db416818679a9d63bd72e50835c396f496e5684626c9c`. Two real-byte package-layout tests, actual installer with synthetic pairing/service ports, 13 real interactive PTY scenarios and 9 native PostgreSQL configuration-transition cases PASS. OS permission/service queries in tests are synthetic; no real VM service or model was invoked. After Joey's action-time approval at 12:36:39 UTC, cleanup was read back at 12:41:02 UTC: all 8 workers revoked, worker/job guard blockers 0, events 0, existing enabled=true. The exact guarded CAS was submitted once at 12:42:09 UTC. Existing Edge is v7 ACTIVE; seven deployed files match the reviewed source exactly. Public bootstrap GET is 200 over verified TLS with the new pin. Fixed protected private preview is READY and served JS/config/CSS are byte-identical to the verified source. Production is unchanged. No Owner mutation, enable-state change, new pairing/job, model or service execution was performed.

## Confirmed cause and actual attempt

The official fixed-version CLI resolves `@openai/codex-linux-x64/package.json` relative to its own package, then uses `vendor/x86_64-unknown-linux-musl/bin/codex`, falling back to its own vendor tree only when that package is absent. Our installer instead searched `.../codex/codex`. Both fixture layouts reproduce the old path failure and qualify the real pinned native bytes with the corrected resolver. Primary source: https://raw.githubusercontent.com/openai/codex/rust-v0.161.0/codex-cli/bin/codex.js . Do not guess the VM's full native path; the preflight reports the actual resolved path/hash without invoking Codex or reading Auth cache.

Joey's latest worker is `ubuntu-1-e755ff4f-2c05-45f6-b805-eb1e946a158a`, fence 8 job `832d8d25-2432-4d10-881b-45f02171df1f`. Bootstrap authorization was committed at 11:52:02.437 UTC and Edge v6 returned archive HTTP200. The screenshot then reported `PINNED_CODEX_PATH_REQUIRED`. This occurs before key generation/pair commit/service start. At 11:53 the worker was unpaired/disabled/keyRegistered=false/revoked=false, the job unclaimed/unspawned/events0. At 12:22:31 UTC configuration still has the old artifact, all 8 workers are unpaired/unkeyed, 1 is unrevoked, 1 job nonterminal, claimed/spawned jobs 0, events 0, worker receipts 2. That historical baseline was ineligible. At 12:41:02 UTC the Owner cleanup was actually confirmed; after release, 12:46:55 UTC still has 8 revoked/unpaired/unkeyed workers, 8 terminal/unclaimed/unspawned jobs and events 0. Do not infer cleanup from approval text.

## Preflight before any pairing approval

The normal pinned bootstrap runs the aggregate read-only preflight before the masked code prompt. The existing UI's prepare-command step does not create a code/job; Owner approval remains after the terminal actually reaches the wait-for-code prompt. A local `--preflight <prepared-worker-id>` diagnostic prints all findings without accepting a code or contacting the broker.

Checks include Linux/x64/unprivileged identity; terminal/service Node versions; safe creation umask; existing proxy presence as a boolean only; fixed ancestor directory types/owners/modes/canonical paths; release/state/config/key/journal/lock presence as booleans only; official CLI shim and actual native path/size/SHA; trusted fixed service tools and systemd-run options; system-manager state; NTP synchronization; read-only `sudo -n -ll -- <exact service argv>` listing of the matching passwordless rule; and absence of the exact service unit. All independent failures are reported together. It never executes sudo's target, creates a service, changes permissions, installs packages, reads key/config/Auth contents, logs in or invokes Codex. Current ChatGPT Auth and actual service creation remain unproven by this metadata preflight.

The latest failed install may have written the public release tree and created empty state/workspace before resolving Codex. Existing installation/state remains a strict reconciliation gate; no overwrite, deletion, rekey or blind replay was added. Before another human attempt, obtain one aggregate VM preflight, reconcile only the actual verified leftovers under specific authorization if necessary, and confirm the expired worker's Owner revoke/job cancellation. Do not reinstall the known official CLI or request another login.

## Exact integrity transition and scope

Old worker artifact: `9bb363726a13bd96341c84b015354daaa454c6265b5bf0d2c5aff6eab1e3d647`.

Verified replacement artifact: `0de5fbd05a012fccabb23a4edf2ff7374b71d695b2505cfc4092ac8b85076613` (15,420 bytes).

New bootstrap: `ec4340b041dec7c4f7acb2f6b59f1d95451a8bbc67c36cf3c244db76061d3e8e`.

Policy stays `72f8c00bb21e91fe86720678d72b650eada8dc54ef1f3b5d3dca6395bb83c6f9`; native pin/version/size, Owner Auth, key protections, Ed25519 admission, host/project, job/actions/prompt, grants/schema, lease/deadlines, maximum service/pilot duration, child environment and service argv are unchanged. The compiled Owner bundle differs only in the reviewed artifact/bootstrap hashes. Initial approved SQL remains byte-identical, SHA-256 `bba24c9b6154daaee4fd73a22851e24c08337325cc3db3e20f96a18de49aff76`; the builder no longer overwrites that approved baseline on repairs.

Changing the artifact digest selects this verified replacement within the same existing permission and executable boundary. It changes the trusted code integrity binding, so use an exact guarded transition; it does not grant a new role, action, host, lifetime or model capability. Joey explicitly approved this reviewed replacement at 12:36:39 UTC (`Sentinel_095750ea660c8191ad53620083dbf2f9`). The exact CAS was applied only after the live guards passed. No automatic approval review rejected an action and no new tool authority was requested.

Prepared script: `docs/contracts/vm-link/deploy/worker-artifact-repair-20261008.pending.sql`. It locks the same configuration row used by Owner/worker RPCs, requires old enabled configuration/policy/artifact exactly, all workers revoked and unpaired/unkeyed, no nonterminal/claimed/spawned jobs or events, and updates only one `artifact_digest` row. Changed baseline, active worker/job, bound key, execution evidence and repeat submission all fail atomically. It does not apply the full schema or change grants. Native PostgreSQL tested 9 allowed/denied/atomic cases.

## Coordinated publication receipt

The guarded CAS changed only the approved artifact digest. Existing Edge function `e6447aff-ed11-4ab1-8040-9ef1c7b33799` is v7 ACTIVE with unchanged custom authentication. Standard public GET returned 15,285 bootstrap bytes, HTTP200, verified TLS and exact new checksum. Private preview `dpl_7qYm5zFQQeEJYByY9Gys2XccMuMH` is READY, target=null, on functional remote commit `1891ffdb82174b5ca1e11ef26c42a85a8a583ae9`. That remote commit has exactly the same tree `c624c164a2ae7317e225e2edb8b6849270dfab37` as approved local candidate `5481bc6ec5813f74443fd7de650b2af5f9d8bb2f`; the connected GitHub tool created a new commit identity and moved only the established branch with expected baseline and force=false.

The fixed private alias is https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app/#workspace?project=NEXAEON&panel=entries . Authorized Vercel connector reads of Owner bundle/config/CSS returned 200 and exact bytes. Project SSO protection remains enabled, `all_except_custom_domains`. Direct anonymous transport to the private alias hit CONNECT403 in this execution environment and was stopped without retry or proxy/TLS bypass; it is not an application denial or a deployment failure. Production remains `dpl_3quBFohZs1gYJK4PnwjNFZnDTefR`, SHA `8b4945b16a0b23f2e72033aa976fa34f94eabec0`.

Do not approve another pairing yet. One short verified loader can perform GET/hash verification and run this exact published bootstrap with `--preflight` entirely from stdin; it writes no file, accepts no code, contacts no broker after the GET, and starts no service. Existing release/state remains a reconciliation blocker. Its old revoked worker ID is used only for the exact unit-name inspection; this does not replay pairing. Current Auth/AAL2 and actual service execution remain unproven.

Short command:

```bash
node --input-type=module <<'MC_READ_ONLY_PREFLIGHT'
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const r=await fetch('https://scmvedfqwlhkyvljymjj.supabase.co/functions/v1/mc-worker-link-v1/bootstrap.mjs',{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000)});
if(!r.ok)throw Error('BOOTSTRAP_HTTP_'+r.status);
const b=Buffer.from(await r.arrayBuffer());
if(createHash('sha256').update(b).digest('hex')!=='ec4340b041dec7c4f7acb2f6b59f1d95451a8bbc67c36cf3c244db76061d3e8e')throw Error('BOOTSTRAP_PIN_MISMATCH');
const p=spawnSync(process.execPath,['--input-type=module','-','--preflight','ubuntu-1-e755ff4f-2c05-45f6-b805-eb1e946a158a'],{input:b,stdio:['pipe','inherit','inherit']});
process.exitCode=p.status??1;
MC_READ_ONLY_PREFLIGHT
```

Safe release receipt: `docs/contracts/vm-link/receipts/native-preflight-20261008/coordinated-release-receipt.json`. The exact applied SQL bytes remain preserved in the original `.pending.sql` audit file; its filename does not indicate current application status.

Safe receipts: `docs/contracts/vm-link/receipts/native-preflight-20261008/`. External complete command, staged payload, checkpoint and source bundle: `/workspace/mc-deliverables/mc-runtime-preflight-20261008/`.
