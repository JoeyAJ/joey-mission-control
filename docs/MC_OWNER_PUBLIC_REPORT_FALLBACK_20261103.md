# Owner report failure and public display fallback — 2026-11-03

Joey's new screenshot after PR #27 shows an authenticated Owner view with Buddy still at its old snapshot and `REGISTRATION_CATALOG_UNAVAILABLE · HTTP 503 · GitHub HTTP 403`. The parent independently observed the latest Buddy record in the live guest view. This is an unresolved Owner acceptance failure; prior guest checks do not establish Owner success.

## Source-based cause

Fresh `main` is `1f62df7925edc8327e1777749704b8bb8f330cc1`. `readOwnerTowerRuns` verifies the session, catches each failed private report request and returns an object. If every request fails, the result is `{}`; an HTTP 200 report observation that is denied, unavailable or partial becomes an `unconfirmed` empty summary. `readTower` treated either object as a successful complete Owner result and skipped public summaries for all fixed projects. Thus Owner sign-in could hide a record that the existing guest endpoint displays.

Catalog status is independently computed. A catalog error does not directly clear fixed-project reports when those private reports are valid. Empty Owner runs can nevertheless establish the existing Owner-ready UI branch, which explains the screenshot without assuming the catalog 403 itself is Buddy's report error. The refresh loop serializes polling; there is no evidence that browser cache caused this failure.

## Narrow correction

Select display sources per fixed public project. Preserve a valid Owner summary, including authoritative `missing` and dated `stale` results. If an Owner key is absent or its summary is unconfirmed, read only that fixed project's existing sanitized public endpoint. Catalog-only private project IDs are never sent to the public fallback, and logout excludes all private summaries. Failed or incorrectly qualified public responses grant no new access.

This changes the daily display, not private source, handoff, copy, review or catalog authorization. A public summary cannot make a private continuation valid. The catalog error remains explicit, while the latest publicly available work history can still be shown. No credentials, permissions, repository visibility, private registration writes or Buddy source changes are involved. The exact-blob report-maintenance exception from PR #27 is preserved unchanged.

## GitHub 403 evidence and diagnostics

The existing transport cancels error bodies and retains only status; the screenshot proves a GitHub 403 but does not distinguish permission denial from rate limiting. Read-only Vercel error/log queries for the current deployment returned no application entries; caught HTTP errors are not proof of successful requests. Credential presence metadata does not establish token validity or scope. No secret was read or replaced and no denied call was retried using another credential.

Two server read ports now emit only `MC_GITHUB_READ_DIAGNOSTIC` plus a fixed operation, numeric status and bounded classification: `PRIMARY_RATE_LIMIT` only for remaining=0, `SECONDARY_RATE_LIMIT` for numeric Retry-After, `RATE_LIMIT` for 429, `SSO_REQUIRED` for the required SSO header, otherwise `FORBIDDEN_UNCLASSIFIED`. The absence of a rate-limit header is not called a permission failure. No body, URL, repository, account, credential, request header or provider message is logged. Responses and authorization behavior remain unchanged; there is no automatic retry or access expansion. Future real requests are needed to classify the live 403.

## Validation and remaining acceptance

Regression tests cover empty and mixed Owner maps, unconfirmed observations, catalog503/upstream403 independence, valid Owner priority, catalog-only scope exclusion, logout and public failure. The actual app and real report/registration HTTP clients are exercised with synthetic Owner/session and API responses at 390/1440px in zh-TW/ko/en: Owner503, Owner200/unconfirmed and guest. Each case checks Buddy's Agent, historical summary, timeline, paused state and explicit Owner catalog error; no remote writes or external requests are allowed. This is synthetic Owner evidence, not Joey's browser acceptance.

A full-suite replay exposed an existing test-fixture scheduling assumption: the rework revocation test polled only 50 event-loop turns and sometimes asserted before reaching its asynchronous Owner check. The fixture now awaits that actual entry event with a bounded test timeout; all revocation, source-change, dirty-form and no-mutation assertions remain. Product task/review controllers are unchanged. Earlier failure logs are retained with the verification evidence.

Exact test/release results belong to the official `mc-owner-tower-fallback-20261103` report. After publication, verify the affected Owner session, not only the guest card. The catalog403 and Engine visibility remain independently unconfirmed until a real classified read succeeds or identifies a specific access blocker. If both private and public current reads fail, the correction does not invent missing source data.
