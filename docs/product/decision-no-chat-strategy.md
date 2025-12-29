# 產品決策：不開發聊天系統 (No Chat Strategy)

**日期:** 2025-12-28
**狀態:** 已採納 (Accepted)
**背景:** 討論 AgreedTime 是否應包含會員間的即時通訊 (Chat) 功能。

## 1. 決策 (Decision)
**我們決定「不」開發會員間的直接對話系統。**
取而代之的是，我們將採用結構化的溝通管道，如 **「候補請求 (Request a Slot)」** 與 **「情境備註 (Contextual Comments)」**。

## 2. 核心理由 (Rationale)

### A. 產品定位衝突 (Identity Conflict)
*   **工具 vs. 社交:** AgreedTime 的核心價值是「效率 (Get shit done)」，而非社交。
*   **用戶期望:** 目標客群 (Freelancers/Solopreneurs) 需要的是一道能過濾雜訊的「防火牆」，而不是另一個需要隨時回覆的收件匣。
*   **戰場選擇:** 在亞洲，溝通已被 LINE/Messenger/WeChat 壟斷。用戶若需深入溝通，最終勢必回到習慣的通訊軟體，平台內建聊天將淪為雞肋。

### B. 安全與法律風險 (Safety & Liability)
*   **內容審查:** 自由輸入文字 (Free-text) 的聊天室需要高昂的審查成本，以防範騷擾、詐騙或非法交易（如毒品、色情）。
*   **法律責任:** 若平台提供自由對話管道，需對內容負擔較大責任。若僅傳遞結構化的「時間數據」，平台僅為工具，風險大幅降低。

### C. 資源配置 (Resource Allocation)
*   **技術成本:** 建立穩定的聊天系統 (WebSocket, 已讀狀態, 多媒體儲存) 開發成本極高，會排擠核心預約功能的開發資源。

## 3. 替代方案 (Alternative Solutions)

### 「候補請求」機制 (Request a Slot / Waitlist)
解決「找不到空檔但想預約」的需求：
*   **機制:** 發送「訊號 (Signal)」而非「訊息 (Message)」。
*   **輸入內容:** 期望時段 (資料選項)、急迫程度 (選單)、聯絡方式 (系統帶入)。
*   **結果:** Organizer 收到通知，僅需選擇「釋出時段」或「拒絕」，無需進行對話。

### 外部導流策略 (The Bridge Strategy)
*   **個人頁面整合:** 允許 Pro 用戶在預約頁面綁定 Instagram/LINE 連結。
*   **責任轉移:** 若需複雜溝通，引導用戶至外部平台，將溝通與審查的責任「甩鍋」給大型社交平台。

## 4. 結論
AgreedTime 專注於 **「交易清晰度 (Transactional Clarity)」**。我們建立連結人們的「橋樑」(預約)，但將「對話」交還給專門的通訊軟體。
