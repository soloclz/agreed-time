# AgreedTime Frontend - 實作總結

> 更新日期：2025-12-03
> 狀態：✅ Create Event Page MVP 完成

---

## 📋 已完成功能

### 1. Create Event Page (`/new`)

完整的投票建立頁面，包含：

#### 基本資訊表單
- 標題輸入（必填）
- 描述輸入（選填）
- 表單驗證

#### 時間槽選擇器

**日期範圍控制**
- 開始日期選擇器
- 結束日期選擇器
- 驗證邏輯：
  - 結束日期不能早於開始日期
  - 最多 8 週範圍（超過顯示錯誤訊息）
- 預設值：今天起算 4 週

**時間範圍控制**
- 開始時間選擇（0-23 小時）
- 結束時間選擇（0-23 小時）
- 預設值：9 AM - 6 PM

**多週橫向滾動表格**
- 自動生成完整週（週日至週六）
- 多週並排顯示，水平滾動查看
- 週與週之間有明顯分隔線
- 時間欄固定在左側（scroll 時不移動）
- 超出日期範圍的格子顯示為灰色不可選

**互動功能**
- **點擊選擇**：單擊格子切換選中/未選中
- **拖拽選擇**：
  - 按住滑鼠拖動可快速選擇多個格子
  - 支持跨週選擇
  - 拖動時自動判斷為選中或取消選中模式
  - 防止文字被選取（`select-none`）

**視覺回饋**
- 已選擇：綠色 (`bg-green-400`)
- 未選擇：白色
- 不可選：灰色（超出範圍）
- Hover：顏色變化
- 平滑過渡動畫

**導航控制**
- Scroll Left / Scroll Right 按鈕
- 支援滑鼠滾輪、觸控板、觸控滑動
- 顯示總週數提示

#### 已選時間槽顯示（底部固定條）

**設計模式**：購物車 / Bottom Sheet

**底部固定條**（選擇時間後出現）
- 固定在頁面底部
- 綠色背景
- 左側：數量徽章 + "Selected Time Slots" 文字
- 右側："View Details" / "Hide Details" + 箭頭圖示
- 點擊展開/收合詳細面板

**展開面板**（向上滑出）
- 最大高度 60vh
- 平滑動畫（300ms）
- 內容可滾動
- 按日期分組顯示
- 每個時間槽顯示時間範圍 + ✕ 刪除按鈕
- 頂部有 "Clear All" 按鈕

**半透明遮罩**（展開時）
- 30% 黑色半透明
- 點擊遮罩關閉面板

**自動留白**
- 選擇時間後頁面底部自動增加留白
- 避免內容被固定條遮擋

---

## 🏗️ 技術架構

### 技術棧
- **框架**：Astro 5.16.3
- **UI 組件**：React 18 (作為 Astro Islands)
- **語言**：TypeScript
- **樣式**：Tailwind CSS 3
- **開發伺服器**：Vite

### 專案結構

```
frontend/
├── src/
│   ├── pages/
│   │   ├── index.astro          # 首頁（尚未實作）
│   │   └── new.astro            # ✅ Create Event 頁面
│   │
│   ├── components/
│   │   ├── CreateEventForm.tsx   # ✅ 表單容器組件
│   │   ├── TimeSlotSelector.tsx # ✅ 時間選擇器主組件
│   │   └── Layout.astro         # ✅ 頁面佈局
│   │
│   ├── types/
│   │   └── index.ts             # ✅ TypeScript 類型定義
│   │
│   └── layouts/
│       └── Layout.astro         # ✅ HTML 外框
│
├── docs/
│   ├── agreed-time-frontend-spec.md  # ✅ 前端規格書
│   ├── frontend-code-guide.md        # ✅ 程式碼教學文件
│   └── implementation-summary.md     # ✅ 本文件
│
├── astro.config.mjs              # ✅ Astro 設定
├── tailwind.config.mjs           # ✅ Tailwind 設定
├── tsconfig.json                 # ✅ TypeScript 設定
└── package.json                  # ✅ 相依套件
```

### 核心組件說明

#### `CreateEventForm.tsx`
- 父組件，整合表單和時間選擇器
- 管理標題、描述、已選時間槽的狀態
- 處理表單提交（目前為 mock）
- 使用 `useCallback` 避免不必要的重新渲染

#### `TimeSlotSelector.tsx`
- 複雜的互動組件（~550 行）
- 狀態管理：
  - 日期/時間範圍
  - 已選格子（使用 Set）
  - 拖拽狀態
  - 面板展開狀態
- 週數生成邏輯（`useMemo`）
- 拖拽互動實作
- 底部固定條 + 展開面板

#### `types/index.ts`
```typescript
export interface TimeSlot {
  id: string;
  date: string;       // "YYYY-MM-DD"
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
}
```

---

## 🎨 UX 設計決策

### 為什麼用底部固定條？

**考慮過的方案**：
1. 右下角浮動按鈕 + 右側抽屜 ❌
2. 頂部摺疊面板 ❌（會造成畫面跳動）
3. ✅ **底部固定條**（最終採用）

**選擇原因**：
- 購物車模式，使用者熟悉
- 始終可見，不需要找按鈕
- 不遮擋主要內容（週曆）
- 向上展開，不壓縮其他元素
- 手機友善（拇指容易觸及）

### 為什麼用橫向滾動？

**對比縱向堆疊**：
- 更接近真實日曆的視覺感受
- 週與週的界線更清楚
- 可以快速比較同一時間的不同日期
- 滾動方向直覺（左右＝時間前後）

---

## 🐛 已解決的問題

### React Hooks 相關

1. **無限循環錯誤** (`Maximum update depth exceeded`)
   - 問題：`useEffect` 依賴 `onSlotsChange` 函數，每次渲染都重新創建
   - 解決：使用 `useRef` 保存回調函數 + 父組件用 `useCallback`

2. **渲染中更新狀態警告**
   - 問題：在 state 更新函數中直接調用 `onSlotsChange`
   - 解決：移到 `useEffect` 中，只依賴 `selectedCells`

### 表單互動

3. **按鈕觸發表單提交**
   - 問題：表單內的按鈕預設 `type="submit"`
   - 解決：所有非提交按鈕加上 `type="button"`

### 樣式問題

4. **畫面跳動** (0→1 選擇時)
   - 問題：頂部摺疊面板展開時推擠內容
   - 解決：改用底部固定條 + `position: fixed`

5. **Inline styles 警告**
   - 問題：使用 `style={{ ... }}`
   - 解決：改用 Tailwind 的 arbitrary values 如 `max-h-[calc(100vh-140px)]`

### 可用性

6. **表單欄位缺少 name 屬性**
   - 問題：影響瀏覽器自動填寫功能
   - 解決：為所有 input/select/textarea 添加 `id` 和 `name`

---

## 📝 Lighthouse 警告（可忽略）

開發環境出現的警告，不影響功能：

- ✅ **content-type charset**: 生產環境會由 Web 伺服器處理
- ✅ **x-content-type-options**: 部署時設定
- ✅ **cache-control**: Astro build 時會自動處理
- ✅ **CSS/TS MIME types**: Vite 開發伺服器的已知特性

---

## 🚀 下一步（未實作）

依照規格書，還需要實作：

### 參與者頁面 (`/event/[public_token]`)
- 顯示投票資訊
- 同樣的週曆 grid（可重用 TimeSlotSelector）
- 參與者填寫可用時間
- 提交 availability

### 主辦者頁面 (`/manage/[organizer_token]`)
- 編輯投票（draft 狀態）
- 時間槽編輯器
- 開放投票
- 查看 aggregated results（熱力圖）
- 最終確定時間

### 首頁 (`/`)
- Landing page
- 說明如何使用
- "Create a Event" CTA

### API 整合
- 目前都是 mock data
- 需要串接真實 backend endpoints

---

## 💡 給未來開發者的建議

### 程式碼閱讀順序
1. `types/index.ts` - 了解資料結構
2. `pages/new.astro` - 了解頁面結構
3. `CreateEventForm.tsx` - 了解表單邏輯
4. `TimeSlotSelector.tsx` - 了解互動邏輯（最複雜）

### 關鍵技術點
- `useMemo` 用於週數生成（避免重複計算）
- `useRef` 用於保存回調函數（避免無限循環）
- `useCallback` 用於穩定函數引用
- `Set` 用於儲存已選格子（快速查找）
- Tailwind arbitrary values 用於動態樣式

### 常見陷阱
- ❌ 不要在表單內用沒有 `type="button"` 的按鈕
- ❌ 不要在 state 更新函數中調用 props 的回調
- ❌ 不要忘記為拖拽元素加上 `select-none`
- ❌ 不要用 inline styles（除非真的必要）

---

## 📚 相關文件

- **前端規格書**: `docs/agreed-time-frontend-spec.md`
- **程式碼教學**: `docs/frontend-code-guide.md`
- **本文件**: `docs/implementation-summary.md`

---

**開發環境啟動**：
```bash
cd frontend
npm run dev
# 訪問 http://localhost:4321/new
```
