# 功能開發實作指南 (Feature Implementation Guide)

本指南記錄了 `agreed-time` 專案中實作新功能的標準流程。遵循此順序能確保資料一致性、系統安全性，並大幅減少前後端對接時的錯誤。

## 開發黃金順序：後端優先 (Backend-First Workflow)

當開發涉及資料儲存的功能（例如：「允許參加者編輯回覆」）時，建議依照以下七個步驟進行：

### 1. 資料庫結構變更 (Migration)
**為什麼最先做？** 因為資料是系統的靈魂。如果底層結構沒定好，上層邏輯寫再多都是白費。
- **操作：** 使用 `sqlx migrate add <name>` 建立遷移檔案。
- **核心考量：**
    - **資安 (Security)：** 絕對不要在 URL 暴露資料庫的 `i64` 自增 ID。如果該功能需要透過網址存取，必須新增 `token` (UUID) 欄位。
    - **效能：** 是否需要為新欄位建立索引 (`INDEX`)？
- **驗證：** 執行 `sqlx migrate run` 確保 SQL 語法正確。

### 2. 後端模型定義 (Rust Models)
**為什麼第二做？** 模型定義了資料在系統內流動的「形狀」。
- **位置：** `backend/src/models/mod.rs`。
- **操作：** 新增或修改 Rust Structs。
- **核心考量：**
    - **命名一致性：** 變數名需與 DB 欄位對齊（為了 `sqlx::FromRow`）且符合 API 規範（為了 `serde` JSON 序列化）。
    - **職責分離：** 區分 `Request` (輸入) 與 `Response` (輸出) 模型。

### 3. 後端業務邏輯 (Handlers)
**為什麼第三做？** 這是系統真正幹活的地方。
- **位置：** `backend/src/handlers/`。
- **實作模式：**
    1. **驗證輸入：** 檢查欄位格式、長度、邏輯約束。
    2. **狀態檢查：** 資源是否存在？活動是否已關閉？
    3. **資料庫事務 (Transaction)：** 若涉及多張表（如：更新參加者同時更新時間格），務必使用 `pool.begin()` 確保原子性。
    4. **回傳結果：** 回傳定義好的 Response 模型。

### 4. 後端路由註冊 (Router)
**為什麼第四做？** 將開發好的邏輯暴露給外部世界。
- **位置：** `backend/src/routes/mod.rs`。
- **核心考量：** 遵循 RESTful 風格。例如：`PUT /events/:token/participants/:participant_token`。

### 5. 後端自我驗證 (Backend Verification)
**為什麼第五做？** 確保 API 合約穩固，不要把「壞掉的東西」丟給前端。
- **操作：**
    - `cargo check`：捕捉型別錯誤。
    - `cargo test`：驗證邏輯與邊界狀況。
    - **必做：** 針對新功能撰寫整合測試 (`backend/tests/`)。

### 6. 更新 SQLx 離線快取 (SQLx Prepare)
**為什麼第六做？** 如果你修改了 SQL 查詢，Docker Build (CI/CD) 需要最新的 `.sqlx` 快取才能通過編譯。
- **操作：** 在 `backend/` 目錄執行 `cargo sqlx prepare`。
- **核心考量：** 檢查 `.sqlx/` 目錄是否有新的 JSON 檔案產生，並將其 commit。這是為了支援 `SQLX_OFFLINE=true` 的編譯環境。

### 7. 前端服務層更新 (API Service)
**為什麼第七做？** 隔離 API 實作細節，讓 UI 元件專注於呈現。
- **位置：**
    - `frontend/src/types/index.ts`：更新 TypeScript 型別，與 Rust Structs 100% 對齊。
    - `frontend/src/services/eventService.ts`：新增 API 呼叫方法。

### 8. 前端 UI 元件開發 (UI/UX)
**為什麼最後做？** 資料管道打通後，最後才是處理使用者的互動。
- **位置：** `frontend/src/components/`。
- **核心考量：**
    - **狀態管理：** 處理 Loading、Error、Success 狀態。
    - **持久化 (Persistence)：** 是否需要 `localStorage` 紀錄身分？是否需要 `sessionStorage` 防止刷新遺失？
    - **設計語言：** 標籤、顏色、字體是否與現有頁面統一？

---

## 實戰案例：參加者編輯模式 (Participant Edit Mode)

我們在開發此功能時，實踐了上述流程：

1. **Migration:** 發現 `participant_id (i64)` 在 URL 中不安全，因此新增 `token (UUID)` 欄位。
2. **Models:** 統一名稱為 `participant_token`，避免與內部的 `id` 混淆。
3. **Handlers:** 實作 `GET` (讀取舊資料) 與 `PUT` (原地更新，避免重複名字)。
4. **Service:** 更新 TS 型別，確保前端知道後端回傳的是 `participant_token`。
5. **UI:** 
    - 提交成功後存入 `localStorage`。
    - 使用者回訪時，自動偵測 Token 並切換為「更新模式」。
    - 解決了 React State Loop Bug (分離 Initial vs Live State)。

## 常見陷阱 (Pitfalls)

- **跳過後端測試：** 修改了 API 格式卻沒跑 `cargo test`，會導致原本的自動化測試全掛。
- **命名不對稱：** 後端給 `participant_token`，前端卻在等 `id`。請務必隨時對照兩邊的 Struct 定義。
- **狀態死迴圈：** 把不斷變動的 State 當作 Prop 傳給子元件的「初始值」，會導致 UI 選項不斷被重設。