# Simple Joey website and project-list navigation

Base: `facbb4cfb3660637003918baa61d585d007dc303`. Isolated branch: `codex/mc-joey-public-site-20261011`.

Simple Joey View now has two visible actions near the top: open the selected project's confirmed website, and “專案列表” to the existing `#dashboard` cards. Browser Back restores the selected project/track and its correct link. Both actions are reachable without private-source sign-in and have at least 44px touch targets. The compact two-action row does not restore the full navigation menus.

The four baseline URLs are checked against `metadata/project-urls.v1.json`, the existing validated public project metadata, and (for canonical production) the Registry production value. JoeyAsset's `current_application` remains distinct from Namyoung Web3D and the University child. `JOEY_ASSET_SYSTEM / UNIVERSITY_CANDIDATE` alone may use `https://joey-woosong-admissions-demo.vercel.app/`, and only with its existing verified record in `deployment/public-cases.v03e.json`. The action explicitly says public test; candidate/Joey acceptance pending stays visible. A confirmed URL is not a new deployment, build verification or product acceptance.

Missing, unverified, conflicting, unsafe or malformed records produce a disabled website action with a short explanation. No hostname is inferred. Exact allowed URLs exclude credentials, extra query/fragment data and mixed scopes. External links use `_blank` and `noopener noreferrer`. The project-list action remains available when the website is unavailable. No Auth, SQL, task/report contracts, execution, deployment or motion/final-RAF changes.

Four production source files changed: `public/app.js`, `public/joey-takeover.js`, `public/project-links.js`, `public/styles.css`. Two tests and this handoff document accompany them. There is no generated Owner bundle change. The broader shared workspace focus header is separately checkpointed at `8049af6372ea8c155558e1d139b126fda7ac5175`; it is not included in this priority patch.

Verification:

- `npm run verify:portable`: 914 passed, 0 failed; build/schema/static safety passed, forbidden attempts 0. Final targeted mapping tests (5) also pass after a defensive null-case guard.
- `tests/browser/joey-site-navigation-qa.mjs`: actual unbundled app at 1440, 390 and 320px in zh-TW/en/ko; 9 cases / 54 scope checks. Covers all four baselines, University candidate, MC unavailable, switching, keyboard focus, new-tab isolation, unavailable unverified metadata, visible project cards and Back.
- Existing `tests/browser/joey-simple-takeover-qa.mjs`: 4 cases passed; copy, source freshness and candidate qualifications retained.
- Before and after captures replay the same canonical snapshots. Public website clicks are intercepted locally: 0 external requests sent, 0 private requests, 0 writes. These checks are not a real Owner session, Safari/iPhone acceptance or live destination verification.

Canonical writer: fetch this branch and cherry-pick its final source commit. If finalization work touches the same Simple Joey renderer, preserve that work and apply these small additions around it. Run `npm run build`, `npm run verify:portable`, and `node tests/browser/joey-site-navigation-qa.mjs`. No canonical push or deployment was performed here; live integration and Joey's iPhone acceptance remain with the sole writer and Joey.
