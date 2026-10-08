# 完整接手交付：0.1.1 停用整合候選

0.1.0 的 production adapter 缺口已在此候選補齊：私有 SQL queue／lease／receipts／safe events、簽章 Edge、既有 Owner session 的 UI adapter、一次性配對與 VM 本機安裝流程。現行 fixed preview 仍是 d0966da；此候選沒有 push、部署、SQL apply 或實際 VM 啟用。

Owner request → PostgreSQL queue → Ed25519 Edge → outbound worker → events → Owner adapter readback 已以真正本機 PostgreSQL + 合成程序跑通。瀏覽器另外核對配對遮罩、hash-only RPC、失效清除、按鈕與 default-off。這些不是 live Supabase Auth/AAL2 或真正 VM bridge 成功的證據。

Joey 已完成官方 CLI 安裝、ChatGPT device 授權與兩次真正 MC_CONNECTION_OK／turn.completed／EXIT 0；不要要求重裝、重新登入或再次提供 CLI proof。現有憑證留在 VM 的官方 CLI 使用方式內，本任務沒有讀出它。新 worker 私鑰也只會在批准後於 VM 產生並保留。

以短期配對碼保護 Edge 的固定 worker artifact 下載，省去 private Git checkout/PAT。這個 pilot 不需要任何 repository provisioning 或 Git credential。將來若任務需要讀寫 repo，必須另有具體授權與 scoped provisioning；不要把這個 fixed smoke approval 當成新 writer。

尚缺的是明確批准新 production 權限與 live 操作，以及一條實際可用的 VM 控制路徑。本環境沒有註冊 Ubuntu-1 SSH/Remote tools；不能把 AWS VM 自動當作 Codex registered Remote。官方 desktop Remote 仍依賴 Mac/App 存活，不是 Mac 關機後可用的 cloud handoff。VM 的暫時 system service 是此候選準備的解法，現時未安裝、未確認 sudo 或 systemd 行為。

只提交一次完整批准包：`ACTIVATION_APPROVAL_ZH_TW.md`。不要拆成 secret、grant、deploy、VM pairing 的多輪模糊批准；也不要要求 SSH private key、Owner JWT、密碼、TOTP、service-role 或 legacy anon 貼入聊天。
