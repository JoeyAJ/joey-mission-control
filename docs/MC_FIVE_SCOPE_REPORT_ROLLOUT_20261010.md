# Four private repositories / five scope reporting rollout

Joey approved source profiles and independent guarded report branches on 2026-10-10T07:10:24Z. Actual Mac UI preflight confirmed empty effective Root Directory (repository root), production branch main and Automatic ignored build step with no custom ignore for the three Nex projects, Buddy and Namyoung. No Vercel settings, secrets, permissions, URLs, application/workflow files or product acceptance status were changed. Source profile commits can trigger existing CI/production rebuilds; no zero-credit claim.

## Source and actual Codex reports

Each source commit changes only the regular `.mission-control/source-profile.json` file. Project, track, repo, ref, entry path and ordered context paths match the MC fixed allowlist exactly. Each actual Codex verification run has independent task/run, predecessor null, provider/model null, and three published events. These runs complete configuration/reporting verification, not product feature development or product acceptance.

| Project / track | Source profile commit | Report completed commit | Run ID |
|---|---|---|---|
| NEXAEON / BASELINE | `62dd99b5e190163a1e4bc6ad410155336934f935` | `5082e7b297614f6e64f9c26907319e3f6898db4f` | `codex-mc-scope-nexaeon-base-20261010T071857Z` |
| WOOSONG_BUDDY / BASELINE | `f9952c5494fc047cb4f7046a93b4098755281a0f` | `0e580a0d6154e8e5ce8a75ee445e78a37c2e0d40` | `codex-mc-scope-woosong_buddy-base-20261010T072004Z` |
| NAMYOUNG_WEB3D / BASELINE | `81a8d099d674d6c47dfa399bae6b8f8eaa14801a` | `568d66b0acf846c493f337cd2c4e0753f36dce41` | `codex-mc-scope-namyoung_web3d-base-20261010T072030Z` |
| JOEY_ASSET_SYSTEM / BASELINE | `97b8ed5e0e555f95a01bb2507144b5058b95ee92` | `d9d38118732a818f05713bcd62b938e656c24d97` | `codex-mc-scope-joey_asset_system-base-20261010T072046Z` |
| JOEY_ASSET_SYSTEM / UNIVERSITY_CANDIDATE | `a0cfc6c6374120353bbf3c6f7ebc5d625624cc44` | `b65b9aab04b62e891accf3776d6fed0af4fc09d2` | `codex-mc-scope-joey_asset_system-university-20261010T072058Z` |

Asset baseline and University share one report branch but remain independent scopes and tasks. The shared latest report HEAD is the University completed commit in the table; the baseline report blob and immutable prefix remain retained. University qualification stays `SEPARATE_CANDIDATE_JOEY_ACCEPTANCE_PENDING`, with no merge or promotion. Buddy observed main is not promoted to historical accepted baseline; original fixed expected baselines are unchanged.

## Initial orphan guards

The first commit has no parent and exactly one regular root `vercel.json` file containing `git.deploymentEnabled:false`. No application or workflow exists on any report branch; subsequent files are bounded regular `.mission-control/runs/<runId>.json` only. All pushes used normal non-force behavior and fresh expected HEAD checks; no unrelated writer change was overwritten.

- JoeyAJ/nexaeon-web: `5fcd677253116432a131d5c7451c4780de76c64e`
- JoeyAJ/woosongbuddy: `80e455d6544a9269a2a9f041c617aad1eb9e3028`
- JoeyAJ/namyoung-web3d: `8dbb53d4b7e33148d30a0cc5ea2d33bf3eff3294`
- JoeyAJ/joey-asset-system: `db6de3dd3f207128de28e2ff0a82a8bbd436a5c3`

## Verification and boundaries

Ten new five-scope parity tests verify literal fixed allowlists, wrong-scope rejection, candidate qualification and the exact latest copied helper through synthetic Git start/progress/completed. Actual helper SHA256: `c6e9f9e485eeba755e9fcd2a1a526212b9197df55c01c5393d7195c90dabd928`. The latest helper was extracted from the current MC artifact, not copied from an older release.

Actual private Git report bytes were read through fixed schema/scope/integrity readers: all five scopes return FOUND with the corresponding Codex completed sequence 3. Source profiles, fresh packets and entry digests pin the new source SHAs. Private report continuation validation uses an explicitly synthetic Owner boundary; this does not establish served Owner acceptance. No Claude or Hermes execution was claimed or launched.

Connected Vercel checks show empty `mc/progress` deployment lists for all five linked projects after the initial guard and report pushes. Source profile production redeploys for the three Nex projects, Buddy and Namyoung are READY at the exact corresponding source profile SHA. Original deployment IDs/status/URLs and new IDs/status/URLs are preserved in the external rollout receipt. Asset has no linked project in this team; other teams were not checked. Do not infer global absence or zero cost. Direct cloud HTTPS CONNECT403 remains unbypassed. Source/history/integrity/expiry/Owner gating and the MC single-invalid-pilot maintenance receipt remain unchanged.

Per-scope private receipts are in `/tmp/mc-four-repo-live/<PROJECT>-<TRACK>/run-receipt.json`; complete source/guard preparation evidence is in `/workspace/mc-four-repo-rollout/preparation-receipt.json`. Final MC release evidence and latest deployment/branch readbacks are recorded externally to avoid self-referencing this document. Remaining acceptance: existing real Owner source/report visibility, full background/copy and exact clipboard bytes on the new five source SHAs. Product runtime and product feature acceptance remain independent.
