# Owner short test — existing authenticated MC endpoints

Use the fixed [Preview](https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app/), zh-TW, and the existing Owner login. This flow verifies cloud task persistence separately from GitHub read capability; no new account, installation, credential or grant is needed to diagnose.

1. Select **Mission Control** under **選擇專案**. Finish the normal existing login/verification and wait for **已確認來源。複製後貼給接手 Agent 即可。**
2. Click **新增開發任務**. In **開發需求**, enter a harmless marker such as `Owner 保存驗收 20261011（只保存，不執行）`. Click **保留本次任務**, then **保存雲端任務**. Expect **雲端任務已確認保存。複製交接後仍要等實際 Agent 開工回報。**, and **任務需求 → 雲端版本已確認**. Reload the same project, open **新增開發任務**, and select that marker. The same text and cloud-confirmed state must return. This uses the real existing GET/POST `/api/private/development-tasks`; it does not prove Agent startup or GitHub permissions. If the Owner's existing 12-task capacity is full, use an existing harmless task instead of adding another.
3. For PR/CI, select an existing saved task with its own **completed, commit-bearing Agent report**, then select the desired date/commit in the dropdown (accessible label **選擇已完成回報核對**) and click **重新核對 PR／CI**. This invokes MC's existing authenticated POST `/api/private/task-reconciliation`. Expect **GitHub 獨立觀察** and four separately qualified headings: **PR**, **Checks**, **Commit statuses**, **Actions**. Keep the latest source confirmed during the read; a source/track/HEAD change, expiry or task edit intentionally clears the result.

If there is no eligible completed report, expect **此任務目前沒有含 commit 的已完成回報。** and a disabled PR/CI button. A newly saved empty task cannot diagnose GitHub read permissions. At `mc/progress@c0b18069ccb64ba714c9b8df52eb42f17bbbade6`, MC has 21 report files, 20 completed reports and **zero reports with a development-task-compatible taskId (`task_` plus 24 hex characters)**. Those legacy/manual report IDs remain intact and cannot be reassigned to the new task. This is a target/linkage prerequisite, not evidence of missing GitHub permissions. Actual Owner cloud-task contents and other projects' eligible task/report linkage have not been read in this diagnostic. To complete the normal-button PR/CI test, use an already eligible task in another existing project, or have an actually authorized Agent complete a real task under its copied taskId; do not fabricate/rewrite a completion or import a historical run as a new task.

Interpret only the observed heading states:

| Heading state | Meaning |
|---|---|
| 已讀取 | That channel returned metadata for the inspected repo/commit. A failing CI conclusion can still be correctly observed. |
| 無資料 · 不能判定通過 | Read completed with no matching metadata; no passing verdict. |
| 讀取權限未確認 | Provider returned 401/403/404. Missing scope, expired access, visibility or provider limiting remain possible; do not grant access automatically. |
| 讀取失敗 / 超出完整讀取範圍 / 資料不吻合 | Outage, incomplete bounded scan or correlation conflict; no permission conclusion. |

If the overall action fails, optionally inspect **only** the Network request status for `task-reconciliation`. A 401/403 application result can be Owner/origin/scope denial; 409 is source movement; 503 can be source/report/configuration/provider unavailable. Those overall statuses do not prove a GitHub channel permission defect. If an `error` category is visible, share that category alone. Do not export a HAR, copy a request as curl, inspect/share Authorization, JWT/session storage, request bodies, full JSON responses, private source URLs or identifiers.

Safe reply in one line: `保存後重整：有/沒有恢復；PR/CI：按鈕停用/已按；PR：…；Checks：…；Commit statuses：…；Actions：…；若失敗 HTTP：…／error 類別：…`.

Read-only Vercel diagnostic on the exact READY `95d850f` deployment: the scoped 30-minute runtime-log **counts grouped by requestPath** returned an empty bounded table (not proof that no requests ran); the observability schema returned 404 `Observability Data not found`, and deployment source-file tree returned 404 `File tree not found`. No individual log lines, request/response bodies, sessions, credentials, protection bypass or environment secrets were read. These supported tools cannot verify an exact authenticated endpoint response or its four channel states here. UI labels and request wiring were inspected from the exact Git source identified by READY deployment metadata; served source bytes remain unverified. Cloud CONNECT403 is unrelated to diagnosing the deployed GitHub credential's scopes.

The two reviewer defects are addressed before this flow: provider quoted-credential labels are redacted/rejected with the established task privacy guard, and delayed reconciliation is accepted only while the current connected FOUND project/track/repo/ref/HEAD remains identical to its captured and returned binding. Synthetic browser/source races and cloud persistence are supporting tests; actual Owner signed HTTP/device acceptance remains pending.
