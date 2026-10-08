# Edge runtime 403 repair

The actual 11:12 UTC attempt reached the correct public `mc-worker-link-v1` path on Edge v5 and returned JSON HTTP403. It was not a CONNECT/TLS failure. The screenshot worker matches approved fence 5, `ubuntu-1-e7181728-e99b-4392-b1f2-ce4e7f3ab44c`. At 11:13:59 UTC it was unpaired, disabled, unrevoked and had no registered key; its job was unclaimed, without spawn intent or events. Pairing expired at 11:20:33.575 UTC and the claim window ended at 11:25:33.575 UTC.

## Reproduced defect and limits

Deployed v5 utilities reference ambient `Buffer` without importing it. Deno does not provide that global to application ES modules; see the [official Deno Node compatibility documentation](https://docs.deno.com/runtime/fundamentals/node/). A real ES-module closure in isolated web globals reproduces `ReferenceError: Buffer is not defined`, generic HTTP403 and zero RPC calls for a valid synthetic bootstrap. Node's ambient global had hidden this defect from the previous tests.

This establishes a reproducible application defect consistent with the observed response. Old v5 logs do not record the internal denial stage, so they cannot uniquely prove the historical cause or independently exclude a submitted code/hash mismatch. No actual pairing code or hash was read, compared, replayed or logged.

## Repair and verification

The Edge handler initializes the trusted `node:buffer` compatibility global only when missing. Pinned protocol, vendor utilities, worker archive, policy, SQL, browser assets, Owner Auth and the ASCII bootstrap remain byte-identical. The existing custom Ed25519 checks and HTTP403 public denial remain unchanged.

Operator diagnostics contain only fixed stage and error enums, with no IDs, bodies, messages, secrets, keys, codes or digests. A failed diagnostic sink cannot change admission. Bootstrap RPC rejection remains denied; no expiry/hash/auth bypass was added.

`npm run verify:portable`: **552/552 PASS**, build/schema/static safety PASS, forbidden attempts 0. The new isolated-runtime regression verifies valid archive/hash, hash-only RPC, real synthetic Ed25519 proof, bad code/signature/route denial and bounded safe diagnostics. This is an isolated web-global simulation using real modules, not native Deno or actual Supabase pairing proof. Tests use synthetic local ports only.

Safe evidence: `docs/contracts/vm-link/receipts/edge-runtime-repair-20261008/`. This handoff supersedes the v5 readiness in the previous terminal repair handoff.

## Confirmed private release

Functional source `cd982ce631b381dca97c561be6cf34060dba267b` is on the established private checkpoint branch. Existing function `e6447aff-ed11-4ab1-8040-9ef1c7b33799` is **v6 ACTIVE**, with all seven deployed files byte-identical to that source. Existing `verify_jwt=false` and custom Ed25519 authentication are preserved. Anonymous standard HTTPS GET returned **200**, TLS verification result 0, exact 5822-byte bootstrap SHA-256 `eb053b359f139df44e20a7141a2cb5ead88f13dc013a53cabf3737229a76ad21`.

Private preview `dpl_CNng6vn3uyiEGRCT1Q2aFqW72VJ3` is **READY**, target=null, source `cd982ce631b381dca97c561be6cf34060dba267b`. Fixed alias `joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app` points to it. Served Owner bundle, CSS and config are HTTP200 and byte-identical to the verified build. Production remains `dpl_3quBFohZs1gYJK4PnwjNFZnDTefR`, source `8b4945b16a0b23f2e72033aa976fa34f94eabec0`. A following receipt-only commit preserves all runtime and public bytes; its latest alias metadata is recorded in the final external receipt.

At **11:30:22.662183 UTC**, fence 5 worker is still unpaired/disabled/keyRegistered=false/**revoked=false**, and pairingExpired=true. Fence 5 remains unclaimed, no spawn intent, events 0, terminal=false, cancel=false, outcome=null, claimWindowExpired=true. Expiry alone has not changed its stored outcome to a terminal cancellation. Workers 1–4 are revoked and jobs 1–4 CANCELLED. Total receipts 13; **worker receipts 0**. No actual `paired` or `serviceRequested` proof exists.

## Human attempt gate

Do not reuse the expired fence 5 code. Confirm the deployed repair and unchanged served bootstrap pin before any new attempt, revoke the expired current worker through the existing Owner UI, refresh its readback, and then let the parent guide one fresh finite approval. This task does not create an approval/job, run a VM command, send email or prove real Auth/AAL2 or VM success.
