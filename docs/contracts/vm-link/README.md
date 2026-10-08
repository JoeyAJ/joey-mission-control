# MC outbound VM link 0.1.1 — inactive integration candidate

This version completes the bounded Owner → private database queue → signed Edge → outbound Ubuntu-1 worker → safe event → Owner view adapters. It extends the isolated 0.1.0 worker without changing that published artifact or the older supervisor candidate. The current public API remains GET-only; canonical submit remains false. No live SQL, grant, Edge deployment, credential registration, VM install, repo provisioning or Agent execution has happened in this task.

The immutable policy is generated from `src/policy.mjs`. Only `SMOKE_CONNECTION_V1` is admitted, in an empty private workspace, using the pinned native Codex 0.161.0 digest and fixed argv. No command, prompt, repo path, endpoint, environment or approval can be supplied by a job. The child uses read-only sandbox, approval policy never and disabled web search; a tool event causes termination and disqualifies completion. This is a fixed pilot and event containment; it is not a claim that read-only sandbox itself removes every tool.

## Components

- `sql/mc-vm-link-0.1.1.pending.sql`: complete transaction template. New private FORCE-RLS schema, bounded queue/receipts/events; two closed public RPCs with authenticated-Owner / internal-server execute grants. Existing postgres-owned Auth verifier is called unchanged; the existing executor remains NOLOGIN/NOBYPASSRLS/NOINHERIT. Temporary CREATE/SET permissions are restored before commit. This is not an applied or CLI-minted migration.
- `edge/index.ts`: pinned official SDK deployment entry, disabled unless the exact project URL and explicit enable flag match. It uses only the Edge-provided server credential internally. The VM never receives it.
- `edge/handler.mjs`: dependency-injected production handler. Exact-origin POST, Ed25519 proof/signatures, 30-second envelope window, body limits, no redirects, no raw logging. The exact GET `/bootstrap.mjs` serves a non-secret pinned client script only when enabled. Worker artifact retrieval still requires a live Owner-approved pairing code.
- `src/installation.mjs`, `deploy/bootstrap-0.1.1.mjs`: hash-verified fixed-file bundle installation, local private key, one masked TTY code entry, same-key identity recovery after uncertain pair ACK, and one bounded transient system service. No private SSH key, Owner JWT or API billing key is requested.
- Repository `src/continuity/owner-vm-link*.mjs`: protected Owner controls reuse the existing SDK client and live session/membership verifier. The separate `public/vm-link-config.js` is false. Default-off adds no UI or calls.

## Pairing and execution

1. After the consolidated deployment/installation approval, the existing verified Owner explicitly activates the reviewed digest pair and approves one worker/pilot in MC. The browser generates a 32-byte code, persists only its SHA-256 through the RPC, and keeps the code masked in memory for at most ten minutes. There is no auto approval or automatic retry.
2. The operator executes the reviewed non-secret bootstrap on the approved Ubuntu-1 VM, providing only the non-secret worker ID as argv. The pairing code is entered once through a masked secure TTY. It is never placed in argv, environment, URL, config file, chat or logs.
3. The bootstrap fetches only the exact MC Edge endpoint, validates the fixed archive SHA-256 before execution, and installs only the reviewed allowlisted files in a new private release. Native Codex is qualified by package version, real path, size and digest; no install/login/proof loop runs.
4. The VM creates its own Ed25519 key in a user-owned 0600 file. Edge verifies proof of possession; SQL consumes the short-lived code and binds that key to the preapproved worker. A lost ACK permits only same-key identity readback. Uncertainty stops rather than rekeying or running.
5. The system manager runs one unprivileged transient worker service, at most 1000 seconds, Restart=no and control-group kill. No boot enable or linger change. This needs explicit OS-service approval and available `sudo -n`; absence stops with a bounded error, never a password prompt. It can survive SSH logout after actual installation; that has not been tested on the live VM here.
6. The worker durably records local intent, claims one immutable attempt/fence, then requires committed server spawn intent. Lost claim/spawn ACK, journal/writer conflict or stale lease never causes another process. Lease is 15 seconds, task limit 60 seconds, pilot 15 minutes. Owner cancel/revoke can stop local work after delivery/lease expiry, not prove provider-wide cancellation.
7. Only neutral event fields are persisted. Raw messages, prompts, commands, output, errors, diffs and usage are dropped. Original observed times survive replay. Completion requires recorded process exit zero, turn completion and absence of cancel/failure/tool evidence. Display qualification is `SIGNED_BY_APPROVED_WORKER`, never proof of actual Owner Auth/AAL2 or canonical submission.

## Offline verification

From repository root:

```sh
node --test docs/contracts/vm-link/test/*.test.mjs
node docs/contracts/vm-link/integration/native-postgres.mjs /tmp/mc-native-pg
node docs/contracts/vm-link/integration/browser-ui.mjs
npm run verify:portable
```

Native test dependencies are outside product code and exactly pinned: `@embedded-postgres/linux-x64@17.10.0-beta.17`, `pg@8.16.3`. The fixture uses a private Unix socket with no TCP listener, actual transactions/two connections and unchanged SQL bodies. Local synthetic Auth metadata exercises the existing helper; no real Supabase user/session is created. Browser fixtures are also synthetic. Edge entry was syntax bundled in this environment; the actual Supabase Deno runtime and Node 18 on Ubuntu-1 still require the approved rollout verification. No fixture output is public app data.

`integration/build-artifact.mjs` generates deterministic gzip JSON, fixed manifest, Edge assets, bootstrap and release digests. Rebuild after any worker source change, then re-review the resulting pins. `integration/release.json` is the artifact pin source. See `docs/ACTIVATION_APPROVAL_ZH_TW.md` for the single activation bundle and actual blockers.
