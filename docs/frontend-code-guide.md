# Frontend Code 讀懂指南

這份文件會教你如何讀懂 AgreedTime 的前端程式碼。我們會從最基礎的概念開始，逐步深入。

---

## 目錄

1. [整體架構](#1-整體架構)
2. [檔案類型解釋](#2-檔案類型解釋)
3. [從最簡單的檔案開始讀](#3-從最簡單的檔案開始讀)
4. [React 核心概念](#4-react-核心概念)
5. [讀懂 TimeSlotSelector 組件](#5-讀懂-timeslotselector-組件)

---

## 1. 整體架構

### 專案使用的技術

```
┌─────────────────────────────────────┐
│         Astro Framework             │  ← 主要框架，負責路由和頁面
│  (負責 .astro 檔案)                  │
│                                     │
│  ┌────────────────────────────┐    │
│  │     React Components       │    │  ← 處理互動邏輯
│  │   (負責 .tsx 檔案)          │    │
│  └────────────────────────────┘    │
│                                     │
│  ┌────────────────────────────┐    │
│  │     Tailwind CSS           │    │  ← 處理樣式
│  │   (class 屬性裡的樣式)      │    │
│  └────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 檔案結構

```
src/
├── pages/              ← Astro 頁面（路由）
│   ├── index.astro     → 對應 URL: /
│   └── new.astro       → 對應 URL: /new
│
├── components/         ← React 組件（可重用的互動元件）
│   ├── CreateEventForm.tsx
│   └── TimeSlotSelector.tsx
│
├── layouts/            ← 頁面佈局（共用的外框）
│   └── Layout.astro
│
└── types/              ← TypeScript 類型定義
    └── index.ts
```

---

## 2. 檔案類型解釋

### `.astro` 檔案
- 這是 Astro 框架專用的檔案格式
- 類似 HTML，但可以嵌入 JavaScript 和 React 組件
- **職責**：定義頁面結構和路由

### `.tsx` 檔案
- TypeScript + JSX (React 的語法)
- 可以寫 JavaScript 邏輯和 HTML 結構在同一個檔案
- **職責**：處理互動邏輯（點擊、拖拽、狀態管理）

### `.ts` 檔案
- 純 TypeScript 檔案
- **職責**：定義資料結構（類型定義）

---

## 3. 從最簡單的檔案開始讀

### 3.1 類型定義 (`types/index.ts`)

這是最簡單的檔案，我們從這裡開始：

```typescript
// types/index.ts

// 定義「時間槽」的資料結構
export interface TimeSlot {
  id: string;              // 唯一識別碼，例如 "2025-12-10_9"
  date: string;            // 日期，格式 "YYYY-MM-DD"，例如 "2025-12-10"
  startTime: string;       // 開始時間，格式 "HH:MM"，例如 "09:00"
  endTime: string;         // 結束時間，格式 "HH:MM"，例如 "10:00"
}
```

**關鍵詞解釋**：
- `export`: 讓其他檔案可以引用（import）這個定義
- `interface`: TypeScript 的類型定義，描述一個物件有哪些屬性
- `string`: 資料類型，表示文字

**類比**：
想像你在設計一張表單，`interface` 就是定義這張表單有哪些欄位。

---

### 3.2 頁面佈局 (`layouts/Layout.astro`)

這個檔案定義了所有頁面共用的外框（HTML 的 head, body）：

```astro
---
// 這區塊是 JavaScript，會在伺服器端執行
interface Props {
	title?: string;  // ? 表示這是可選的（optional）
}

const { title = 'AgreedTime' } = Astro.props;
// 從 props 取出 title，如果沒有就用預設值 'AgreedTime'
---

<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width" />
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<title>{title}</title>  <!-- 使用上面定義的 title -->
	</head>
	<body>
		<slot />  <!-- 這裡會插入使用這個 Layout 的頁面內容 -->
	</body>
</html>
```

**關鍵概念**：
- `---` 區塊：Astro 的 frontmatter，寫 JavaScript 邏輯
- `{title}`：插入變數的值
- `<slot />`：佔位符，實際內容會被插入這裡

---

### 3.3 Create Event 頁面 (`pages/new.astro`)

這個檔案很短，主要是組合其他組件：

```astro
---
import Layout from '../layouts/Layout.astro';
import CreateEventForm from '../components/CreateEventForm';
---

<Layout title="Create a Event - AgreedTime">
  <main class="min-h-screen bg-gray-50 py-12 px-4">
    <div class="max-w-6xl mx-auto">

      <!-- 標題區塊 -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          Create a New Event
        </h1>
        <p class="text-lg text-gray-600">
          Set up your event and select the time slots
        </p>
      </div>

      <!-- 表單區塊 -->
      <div class="bg-white rounded-lg shadow-sm p-8">
        <CreateEventForm client:load />
        <!--
          client:load 是 Astro 的指令，
          告訴 Astro 這個 React 組件要在瀏覽器端載入
        -->
      </div>

    </div>
  </main>
</Layout>
```

**Tailwind CSS 類別解讀**：
- `min-h-screen`: 最小高度 = 螢幕高度
- `bg-gray-50`: 背景顏色灰色 50（很淺的灰）
- `py-12`: padding Y軸（上下）12 單位
- `px-4`: padding X軸（左右）4 單位
- `max-w-6xl`: 最大寬度 6xl
- `mx-auto`: margin X軸自動（左右置中）
- `text-center`: 文字置中
- `font-bold`: 粗體

---

## 4. React 核心概念

在讀 React 組件之前，需要理解幾個核心概念：

### 4.1 State（狀態）

**什麼是 State？**
- State 是「組件的記憶」
- 當 state 改變時，畫面會自動更新

**例子**：
```tsx
const [count, setCount] = useState(0);
//     ↑       ↑          ↑
//   變數名  更新函數   初始值

// 使用：
console.log(count);     // 讀取 state
setCount(5);            // 更新 state
setCount(count + 1);    // 基於當前值更新
```

**類比**：
想像一個計數器，`count` 是顯示的數字，`setCount` 是按鈕。
按下按鈕後，數字會更新，螢幕也會跟著更新。

---

### 4.2 Props（屬性）

**什麼是 Props？**
- Props 是「父組件傳給子組件的資料」
- 類似函數的參數

**例子**：
```tsx
// 父組件
<TimeSlotSelector onSlotsChange={handleChange} />
//                 ↑ 這是 prop

// 子組件
function TimeSlotSelector({ onSlotsChange }) {
  // 使用 onSlotsChange...
}
```

**類比**：
父組件像是主管，子組件像是員工。
Props 就是主管給員工的指示。

---

### 4.3 事件處理（Event Handlers）

**什麼是事件？**
- 事件是使用者的動作：點擊、拖拽、輸入等
- 我們要寫函數來「處理」這些事件

**例子**：
```tsx
const handleClick = () => {
  console.log('被點擊了！');
};

<button onClick={handleClick}>點我</button>
//      ↑ 綁定事件處理函數
```

**常見事件**：
- `onClick`: 點擊
- `onMouseDown`: 滑鼠按下
- `onMouseEnter`: 滑鼠移入
- `onMouseUp`: 滑鼠放開
- `onChange`: 輸入框內容改變

---

### 4.4 Hooks（React 的特殊函數）

Hooks 是 React 提供的「魔法函數」，讓我們可以在組件裡使用特殊功能。

**常用的 Hooks**：

#### `useState` - 狀態管理
```tsx
const [value, setValue] = useState(初始值);
```

#### `useEffect` - 副作用處理
```tsx
useEffect(() => {
  // 這裡的程式碼會在組件載入時執行
  console.log('組件載入了');

  return () => {
    // 這裡是清理函數，組件卸載時執行
    console.log('組件卸載了');
  };
}, [依賴項]);
// ↑ 空陣列 [] 表示只在組件載入時執行一次
// ↑ 有依賴項 [count] 表示 count 改變時也會執行
```

#### `useRef` - 取得 DOM 元素的參考
```tsx
const inputRef = useRef(null);

<input ref={inputRef} />

// 可以直接操作這個 DOM 元素：
inputRef.current.focus();  // 讓輸入框聚焦
```

#### `useCallback` - 記憶化函數
```tsx
const handleClick = useCallback(() => {
  // 這個函數只會建立一次，不會每次渲染都重新建立
}, [依賴項]);
```

---

## 5. 讀懂 TimeSlotSelector 組件

現在我們有足夠的知識來讀懂最複雜的組件了！

### 5.1 組件結構概覽

```tsx
// 1. 引入依賴
import { useState, useCallback, useRef, useEffect } from 'react';
import type { TimeSlot } from '../types';

// 2. 定義 Props 類型
interface TimeSlotSelectorProps {
  onSlotsChange?: (slots: TimeSlot[]) => void;
  initialSlots?: TimeSlot[];
}

// 3. 定義組件
export default function TimeSlotSelector({
  onSlotsChange,
  initialSlots = []
}: TimeSlotSelectorProps) {

  // 4. 準備資料（日期、時間）
  const dates = [...];
  const hours = [...];

  // 5. 定義 State
  const [selectedCells, setSelectedCells] = useState(...);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(...);

  // 6. 定義輔助函數
  const getCellKey = (date, hour) => {...};
  const isCellSelected = (date, hour) => {...};

  // 7. 定義事件處理函數
  const handleMouseDown = (date, hour) => {...};
  const handleMouseEnter = (date, hour) => {...};
  const handleMouseUp = () => {...};

  // 8. 副作用處理
  useEffect(() => {...}, []);

  // 9. 渲染 UI
  return (
    <div>...</div>
  );
}
```

---

### 5.2 逐段解析

#### 第 1 部分：準備資料

```tsx
// 生成未來 7 天的日期陣列
const dates = Array.from({ length: 7 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() + i);  // 今天 + i 天
  return date.toISOString().split('T')[0];  // "2025-12-10"
});
// 結果：['2025-12-03', '2025-12-04', ..., '2025-12-09']

// 生成 9-18 的小時陣列
const hours = Array.from({ length: 10 }, (_, i) => i + 9);
// 結果：[9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
```

**Array.from 解釋**：
- `Array.from({ length: 7 }, ...)`: 建立長度為 7 的陣列
- `(_, i) => ...`: 箭頭函數，`_` 表示不用第一個參數，`i` 是索引（0, 1, 2...）

---

#### 第 2 部分：State 定義

```tsx
// 儲存已選擇的格子
// 使用 Set 是因為要快速檢查某個格子是否被選中
const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
// selectedCells 的值像這樣：Set(['2025-12-10_9', '2025-12-10_10', ...])

// 是否正在拖拽
const [isDragging, setIsDragging] = useState(false);

// 拖拽模式：'select'（選擇）或 'deselect'（取消選擇）
const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');
```

**為什麼用 Set？**
- Set 是一種資料結構，特點是「不重複」且「快速查找」
- `Set.has(key)` 比 `Array.includes(key)` 快很多

---

#### 第 3 部分：輔助函數

```tsx
// 生成格子的唯一識別碼
const getCellKey = (date: string, hour: number): string => {
  return `${date}_${hour}`;
  // 例如：getCellKey('2025-12-10', 9) → '2025-12-10_9'
};

// 檢查某個格子是否被選中
const isCellSelected = (date: string, hour: number): boolean => {
  return selectedCells.has(getCellKey(date, hour));
  // has() 是 Set 的方法，檢查是否包含某個值
};
```

---

#### 第 4 部分：事件處理函數

```tsx
// 滑鼠按下時
const handleMouseDown = (date: string, hour: number) => {
  // 1. 檢查這個格子是否已選中
  const isSelected = isCellSelected(date, hour);

  // 2. 設定拖拽模式
  //    如果已選中 → 設為「取消選擇」模式
  //    如果未選中 → 設為「選擇」模式
  setDragMode(isSelected ? 'deselect' : 'select');

  // 3. 開始拖拽
  setIsDragging(true);

  // 4. 切換這個格子的狀態
  toggleCell(date, hour);
};

// 滑鼠移入格子時
const handleMouseEnter = (date: string, hour: number) => {
  // 只有在拖拽時才執行
  if (isDragging) {
    // 根據拖拽模式設定格子狀態
    setCell(date, hour, dragMode === 'select');
  }
};

// 滑鼠放開時
const handleMouseUp = () => {
  setIsDragging(false);  // 結束拖拽
};
```

**流程圖**：
```
使用者按下滑鼠
    ↓
handleMouseDown 執行
    ↓
isDragging = true
    ↓
使用者拖動滑鼠到其他格子
    ↓
handleMouseEnter 執行（多次）
    ↓
根據 dragMode 選擇/取消選擇格子
    ↓
使用者放開滑鼠
    ↓
handleMouseUp 執行
    ↓
isDragging = false
```

---

#### 第 5 部分：通知父組件

```tsx
const notifySlotsChange = (cells: Set<string>) => {
  if (onSlotsChange) {  // 如果父組件有傳 onSlotsChange prop
    // 1. 將 Set 轉換為陣列
    const slots: TimeSlot[] = Array.from(cells).map(key => {
      // 2. 解析 key（例如 '2025-12-10_9'）
      const [date, hourStr] = key.split('_');
      const hour = parseInt(hourStr);

      // 3. 建立 TimeSlot 物件
      return {
        id: key,
        date,
        startTime: `${hour.toString().padStart(2, '0')}:00`,  // '09:00'
        endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,  // '10:00'
      };
    });

    // 4. 呼叫父組件傳進來的函數
    onSlotsChange(slots);
  }
};
```

**padStart 解釋**：
```tsx
'9'.padStart(2, '0')   // → '09'
'10'.padStart(2, '0')  // → '10'（已經有 2 位數，不用補）
```

---

#### 第 6 部分：格式化顯示

```tsx
// 格式化日期顯示
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[date.getDay()];  // 取得星期幾
  const month = date.getMonth() + 1;  // 月份（注意要 +1）
  const dateNum = date.getDate();  // 日期
  return `${day}\n${month}/${dateNum}`;
  // 例如：'Mon\n12/10'（\n 是換行）
};

// 格式化小時顯示
const formatHour = (hour: number): string => {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
  // 例如：9 → '9 AM', 14 → '2 PM'
};
```

---

#### 第 7 部分：渲染表格

```tsx
return (
  <div className="space-y-4">  {/* space-y-4: 子元素垂直間距 */}

    {/* 標題區塊 */}
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Select Your Available Time Slots
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Selected: <span className="font-semibold text-green-600">
            {selectedCells.size}
          </span> slots
        </p>
      </div>
    </div>

    {/* 表格容器 */}
    <div className="overflow-x-auto border border-gray-300 rounded-lg">
      <table className="border-collapse">

        {/* 表頭：日期 */}
        <thead>
          <tr>
            <th className="...">Time</th>
            {dates.map(date => (
              <th key={date} className="...">
                {formatDate(date)}
              </th>
            ))}
          </tr>
        </thead>

        {/* 表身：時間格子 */}
        <tbody>
          {hours.map(hour => (
            <tr key={hour}>
              {/* 時間標籤 */}
              <th className="...">{formatHour(hour)}</th>

              {/* 每個日期的格子 */}
              {dates.map(date => {
                const isSelected = isCellSelected(date, hour);
                return (
                  <td
                    key={`${date}_${hour}`}
                    className={`
                      border cursor-pointer transition-colors
                      ${isSelected
                        ? 'bg-green-400 hover:bg-green-500'
                        : 'bg-white hover:bg-gray-100'
                      }
                    `}
                    onMouseDown={() => handleMouseDown(date, hour)}
                    onMouseEnter={() => handleMouseEnter(date, hour)}
                    onMouseUp={handleMouseUp}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
```

**map 函數解釋**：
```tsx
const numbers = [1, 2, 3];
const doubled = numbers.map(n => n * 2);
// doubled = [2, 4, 6]

// 在 JSX 中：
{dates.map(date => <th>{date}</th>)}
// 會產生多個 <th> 元素
```

**條件樣式（className）**：
```tsx
className={`
  基礎樣式
  ${條件 ? '符合時的樣式' : '不符合時的樣式'}
`}

// 例如：
${isSelected ? 'bg-green-400' : 'bg-white'}
// 如果 isSelected 是 true → 背景綠色
// 如果 isSelected 是 false → 背景白色
```

---

### 5.3 完整資料流程圖

```
使用者點擊格子
    ↓
handleMouseDown 執行
    ↓
toggleCell 被呼叫
    ↓
selectedCells 狀態更新
    ↓
notifySlotsChange 被呼叫
    ↓
onSlotsChange prop 函數被觸發
    ↓
父組件（CreateEventForm）收到更新
    ↓
父組件更新自己的 state
    ↓
畫面重新渲染
```

---

## 6. CreateEventForm 組件

這個組件比較簡單，主要是「表單」+ 「嵌入 TimeSlotSelector」。

### 關鍵部分解析

```tsx
export default function CreateEventForm() {
  // State：表單欄位
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當 TimeSlotSelector 的選擇改變時，這個函數會被呼叫
  const handleSlotsChange = (slots: TimeSlot[]) => {
    setSelectedSlots(slots);  // 更新 state
  };

  // 表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();  // 防止表單預設的頁面刷新行為

    // 驗證
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (selectedSlots.length === 0) {
      alert('Please select at least one time slot');
      return;
    }

    setIsSubmitting(true);

    // TODO: 呼叫 API
    console.log({ title, description, timeSlots: selectedSlots });

    // 模擬 API 呼叫
    await new Promise(resolve => setTimeout(resolve, 1000));

    alert(`Event created! Slots: ${selectedSlots.length}`);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 標題輸入框 */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      {/* 描述輸入框 */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* 時間選擇器 */}
      <TimeSlotSelector onSlotsChange={handleSlotsChange} />

      {/* 提交按鈕 */}
      <button
        type="submit"
        disabled={isSubmitting || !title.trim() || selectedSlots.length === 0}
      >
        {isSubmitting ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  );
}
```

**資料流向**：
```
TimeSlotSelector 內部狀態改變
    ↓
呼叫 onSlotsChange prop（傳進來的 handleSlotsChange）
    ↓
CreateEventForm 的 selectedSlots 狀態更新
    ↓
畫面重新渲染（按鈕狀態、計數器更新）
```

---

## 7. 讀程式碼的建議流程

### 步驟 1：先看類型定義
了解資料結構 → 知道這個專案在處理什麼資料

### 步驟 2：從頁面入口開始讀
`pages/new.astro` → 看整體結構

### 步驟 3：找主要組件
`CreateEventForm` → 理解表單邏輯

### 步驟 4：深入互動組件
`TimeSlotSelector` → 理解拖拽邏輯

### 步驟 5：追蹤資料流
從子組件 → 父組件 → 看資料如何流動

---

## 8. 常見問題

### Q: 為什麼要用 `const` 而不是 `let` 或 `var`？
A: `const` 表示「不會重新賦值」，是現代 JavaScript 的最佳實踐。
   雖然 `const` 定義的變數不能重新賦值，但如果是物件或陣列，內容還是可以改變。

### Q: `?.` 是什麼意思？
A: 這是「可選鏈」（Optional Chaining）
   ```tsx
   obj?.property  // 如果 obj 是 null/undefined，不會報錯，直接回傳 undefined

   // 等同於：
   obj && obj.property
   ```

### Q: `??` 是什麼意思？
A: 這是「空值合併」（Nullish Coalescing）
   ```tsx
   value ?? defaultValue  // 如果 value 是 null 或 undefined，回傳 defaultValue

   // 跟 || 的差異：
   0 || 'default'   // → 'default' (0 被視為 falsy)
   0 ?? 'default'   // → 0 (0 不是 null/undefined)
   ```

### Q: 為什麼有些函數要包在 `useCallback` 裡？
A: 為了「記憶化」，避免每次渲染都重新建立函數。
   但在我們這個簡單的例子中，其實不用 `useCallback` 也沒關係。

### Q: `key` prop 是什麼？
A: 當你用 `map` 產生多個元素時，React 需要 `key` 來追蹤哪個元素是哪個。
   ```tsx
   {items.map(item => <div key={item.id}>{item.name}</div>)}
   ```
   `key` 必須是唯一的，通常用 ID 或索引。

---

## 9. 下一步

現在你應該能讀懂這個專案的前端程式碼了！

**練習建議**：
1. 試著修改 `hours` 陣列，改成 8-20（8 AM - 8 PM）
2. 試著修改顏色，把綠色改成藍色
3. 試著在格子上顯示時間（目前是空白的）
4. 試著加入「全選」按鈕

**進階閱讀**：
- [React 官方文件](https://react.dev)
- [Astro 官方文件](https://docs.astro.build)
- [Tailwind CSS 文件](https://tailwindcss.com/docs)
