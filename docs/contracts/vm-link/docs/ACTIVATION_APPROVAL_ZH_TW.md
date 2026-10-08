# 單次完整啟用批准包 — MC VM link 0.1.1

狀態：本機完成、default-off、尚未批准／套用／發布／安裝。
現行視覺基線：d0966da54b26aa1c420d148322dbe14614807cb5。原 writer 仍是唯一 publication writer；本候選只交付本機 commit／patch，不 push。

## 精確批准範圍

同一次批准須涵蓋下列完整且有界的 production 變更；「MC development 可以繼續」已授權本機實作與測試，但既有明確界線仍禁止擅自 SQL apply、新 credential／grant／deploy／VM 安裝。

1. 僅在 project `scmvedfqwlhkyvljymjj` 安装版本化 migration：新 `mc_vm_link` 私有 schema 的 configuration、workers、jobs、receipts、events，皆 ENABLE/FORCE RLS；沿用現有 NOLOGIN/NOBYPASSRLS/NOINHERIT executor。兩個新 public RPC：`mc_vm_link_owner(jsonb)` 只給 authenticated EXECUTE、再次核固定 Owner／AAL2／NEXAEON membership；`mc_vm_link_worker(jsonb)` 只給內部 service_role EXECUTE，VM 無法直接取得這個權限。既有 Auth helper／Auth grants／canonical writer 均不變。安裝 transaction 暫時給既有 executor 新 schema/public CREATE 與 postgres SET，於 commit 前復原。無 SQL seed、真 user/session、SQL apply 或新 grant 已發生。
2. 僅部署 `mc-worker-link-v1` Edge。唯一 machine URL：`https://scmvedfqwlhkyvljymjj.supabase.co/functions/v1/mc-worker-link-v1`；exact POST 只接受一次配對 code 的 bootstrap 或 Ed25519 signed closed actions。exact GET `/bootstrap.mjs` 只提供下列 hash 固定的非 secret bootstrap。自訂簽章驗證取代該 function 的平台 JWT 檢查（verify_jwt=false）；未啟用一律 503。Edge 只在已批准 runtime 內使用既有平台提供的 server credential，不新建、不讀出、不提供給 VM／chat。啟用 `MC_VM_LINK_ENABLED=true` 這一個明確旗標。
3. 在原 writer 管理的 fixed preview 發布 Owner UI 整合，僅新 `vm-link-config.enabled=true`。使用同一官方 SDK client／session verifier；既有讀取、Auth 設定、reference 視覺布局與 canonical submit=false 維持。只允許 Owner 明確 activate、批准一次 fixed pilot、取消、revoke、pause；worker/Agent 不得批准自己。
4. 僅在既有 AWS Ubuntu-1（Sydney ap-southeast-2a）安裝 hash 固定的 worker。Ed25519 key 由 VM 本機產生、0600、預設不授權，直到預批准 code 原子消耗及 key 綁定成功；私鑰不離開 VM。批准一個以實際登入 OS uid/gid 運作的 transient systemd service：RuntimeMaxSec=1000、Restart=no、UMask=0077、KillMode=control-group、TimeoutStopSec=10、stdout/stderr=null；不用 root 執行 Agent，不 enable boot service、不開 linger、不更改 sudoers／SSH。若 `sudo -n` 或 systemd 不可用則停，不要求密碼，也不擴權。
5. Owner 同一流程批准一個 `SMOKE_CONNECTION_V1`。VM worker 最多 15 分鐘、一個已批准 attempt，native Codex 0.161.0 hash 固定，empty private workspace、read-only、approval_policy=never、web search disabled、固定 prompt；偵測 tool event 即停止且不能算完成。每個 task 最多 60 秒、lease 15 秒；canonical submit=false，沒有 repo provisioning／push／SQL／deployment job。

## 此版 pins

- Policy SHA-256：`72f8c00bb21e91fe86720678d72b650eada8dc54ef1f3b5d3dca6395bb83c6f9`
- Worker gzip JSON SHA-256：`9bb363726a13bd96341c84b015354daaa454c6265b5bf0d2c5aff6eab1e3d647`
- 公開非 secret bootstrap SHA-256：`6db4da07651c73613eaf00decdcbda37293a2ae86f3bf2fcb0d7d12ea5aa45a4`
- Native Codex SHA-256：`9a820c17865fa825d04db416818679a9d63bd72e50835c396f496e5684626c9c`（292309256 bytes）
- 官方 SDK：`@supabase/supabase-js@2.117.2`；VM worker 零 npm dependencies。
- `integration/stage-deployment.mjs` 只組裝本機 `supabase/functions/mc-worker-link-v1/index.ts` 與完整 import graph/config.toml，沒有 deploy/secret/migration/network calls；正式部署仍依此一次批准。
- Migration source：`sql/mc-vm-link-0.1.1.pending.sql`；可直接審閱的 `sql/mc-vm-link-0.1.1.reviewed.sql` 已填妥 digest。正式檔名需用 `supabase migration new mc_vm_link_v011` 產生，填入上列固定 digest，檢查 source hash／precondition 後才依此一次批准安裝。此環境沒有 CLI，不捏造 timestamp 或已套用 status。

## 一次配對的實際流程

批准後先由唯一 writer 依 pins 套用 migration／Edge／UI，再由 Joey 在既有受保護 Owner 瀏覽器批准一次 worker 與 pilot。瀏覽器產生 32-byte code，RPC 只存 SHA-256；明碼只在頁面記憶體、遮罩、最多 10 分鐘，切換專案／登出立即清除。VM 只需要一次 secure TTY 輸入該 code，不需 private Git PAT、Owner JWT、password/TOTP、API billing key、service-role/legacy anon 或 SSH private key。

以下是批准後在 Ubuntu-1 執行的單一非 secret 安裝區塊；先把末行 workerId 換成 Owner 畫面產生的實際 ID。**現時沒有執行。**

```bash
mc_bootstrap_path=$(mktemp /tmp/mc-vm-link-bootstrap.XXXXXX.mjs)
curl --fail --silent --show-error --proto '=https' --tlsv1.2 --max-time 15 'https://scmvedfqwlhkyvljymjj.supabase.co/functions/v1/mc-worker-link-v1/bootstrap.mjs' --output "$mc_bootstrap_path" &&
printf '%s  %s\n' '6db4da07651c73613eaf00decdcbda37293a2ae86f3bf2fcb0d7d12ea5aa45a4' "$mc_bootstrap_path" | sha256sum --check --status &&
node "$mc_bootstrap_path" 'OWNER_UI_GENERATED_WORKER_ID'
```

Bootstrap 只連 exact 同一 host，code 不進 URL／argv／environment／file／log。下載 worker archive 後先驗 digest 與固定 manifest 再執行，拒絕重裝已有 release。VM 自己生成 key 並以 signature 證明 possession；code 只消耗一次。pair ACK 遺失只允許同一 key 的 identity readback，不自動 rekey／再次輸入 code／啟動 task。HTTP 403、未知 network、TLS 或 proxy 問題立即停，不改域名或關 TLS。

## 關閉與復原

Owner 可 cancel/revoke/pause；取消回覆始終標示 providerCancellationConfirmed=false。取消／revoke 收到後或 lease 到期後停止本機 process group，無法宣稱 provider 端全域取消。未知 claimed attempt 不自動 retry；只有未 claim、未 spawn 的 CANCELLED job 才能重新 Owner 批准 fresh job／attempt／fence。機器或 ACK 不確定時 journal 保留，禁止 steal writer lock／自動重新 spawn。若要停用部署，先 Owner pause，確認 server 私有狀態關閉／worker revoke，再將 Edge flag 與 UI flag 關回 false；保留 receipts/events 供查核，不刪除資料或改 Auth ACL。OS service 最遲 1000 秒退出、無自動重啟。

## 已完成的驗證與仍未發生的驗證

真正本機 PostgreSQL 17.10、private Unix socket、原 SQL bodies、兩個連線與可觀察 row lock：一次配對、role/RLS、原始 receipts、原子 event batch、cancel/spawn 競爭、duplicate／stale lease、fresh retry、fence、revocation、完整 Owner adapter→queue→signed Edge→合成 worker→events→Owner readback 全通過。比較既有 Auth helper definition/ACL、managed Auth table owner/ACL、schema ACL、role membership graph，前後相同。另有 worker/Edge/Owner failure tests 與瀏覽器 UI／既有 portable、Auth lifecycle、reading/diff／reference 布局回歸。

上述皆為 local/synthetic，不是 live Auth/AAL2、live Supabase Deno、Node18 VM worker、registered Remote 或真 bridge 啟用的證据。Joey 已經兩次真正 CLI proof 不需重做。此 cloud workspace 沒有 callable／已註冊 Ubuntu-1 SSH Remote；批准本身不會創造控制路徑。實際 live rollout 還需使用既有可用 VM terminal／已批准的 SSH 工具，由操作者安全輸入一次 code；不將 SSH 私鑰或 token 貼入聊天。

官方 [Supabase function authentication](https://supabase.com/docs/guides/functions/auth) 說明自行驗證簽章的模式；[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) 支援此 private table 邊界。[Codex Remote connections](https://learn.chatgpt.com/docs/remote-connections) 的 desktop 連線依賴桌面存活，不能假定目前 cloud task 已接上 AWS VM。systemd 選項已讀取本機 `systemd-run --help`；官方 man 網站回 403，沒有繞過。live Ubuntu system service 尚未測試。

給父 thread 的唯一批准問句：**是否一次批准上述精確 migration／兩個 RPC 權限、簽章 Edge 與其單一旗標、fixed-preview Owner UI 旗標，以及 Ubuntu-1 本機 key／最多 1000 秒的暫時服務，僅供一次已批准的 fixed pilot？** 本次需要批准源自既有「禁止 live SQL／新 credential／grant／deploy／VM 安裝」明確界線；程式與驗證已先完成，沒有以批准取代尚未實作的 adapter。
