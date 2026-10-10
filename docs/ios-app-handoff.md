# 交接：由「旅のしおり」網站到 iOS 行程 App

> 用法：開新 project 嗰陣，將呢份文件放入新 repo（例如 `docs/handoff.md`），或者直接貼畀 Claude 做第一個訊息。
> 最後一節有現成嘅開場 prompt。
>
> 整理日期：2026-10-08

---

## 1. 一句講晒

而家已經有一個**做好、用緊**嘅個人旅行網站（京都・大阪 7 日 6 夜，2026-10-23 → 10-29，一個人去）。
下一步想另開一個 project，用 **Xcode + SwiftUI** 整一個 **iOS app**：

- 任何用家都可以自己建立行程（唔再只係我一個人嘅行程）
- 重點功能：**貼一段文字 → 自動拆成一張張行程卡**（AI）
- 保留網站已經有嘅功能（記帳、天氣、待辦、相片、航班、離線、小工具）
- 加 iPhone 先做到嘅嘢：主畫面 Widget、鎖定畫面、**Live Activities（動態島）**

今次旅行**繼續用網站**。App 唔會喺 10/23 出發前完成，亦唔需要趕。

---

## 2. 用家同已經決定咗嘅嘢

| 項目 | 狀態 |
|---|---|
| 用家 | 香港社工，廣東話溝通；一個人去旅行 |
| 有冇 Mac | **有** |
| Apple Developer Program（USD $99/年） | **未決定**。考慮緊；可以先用免費帳戶開發 |
| 平台 | iOS（iPhone）優先 |
| 今次旅行 | 用網站，唔用 app |
| 語言 | 介面用繁體中文（廣東話口語），英文技術名詞照用 |

---

## 3. 現有網站（參考實作）

- 網址：<https://oxygen1024.github.io/Osaka.github.io/>
- Repo：`oxygen1024/Osaka.github.io`
- **注意**：GitHub Pages 係由 branch `claude/eager-rubin-fcrx2q` 發佈，唔係 `main`。PR #1 仲係 draft，未 merge。
  **旅行完之前唔好 merge 或者刪除呢個 branch**，否則網站會壞。
- 技術：Jekyll（GitHub Pages）+ 純 HTML/CSS/JS，冇 framework
  - `index.html`：外殼同編輯表單
  - `assets/app.js`（約 2,400 行，一個 IIFE）：全部邏輯
  - `assets/style.css`（約 1,300 行）：設計系統
  - `data/trip.json`：**全部行程資料**（app 可以直接匯入）
  - `photos/<folder>/`：相片同 PDF
  - `photos.json`：Jekyll 生成嘅相片清單
  - `sw.js`：Service Worker（離線）
  - `widget/kansai-widget.js`：Scriptable 主畫面小工具
  - `manifest.webmanifest`、`assets/icon.svg/png`

### 3.1 網站功能清單（app 要對齊）

**行程**
- 總覽頁：行程目錄、7 日天氣、機票（登機證樣式）、住宿、交通票務、預訂截圖
- 每日頁：時間軸卡片；狀態標籤「已確認」（綠）/「待處理」（橙），可以剔
- 優先度：高・必去 / 中 / 低
- 每張卡：地址、電話（撳就打）、預約編號（撳就複製）、備註（網址自動變連結）、多條自訂連結（「名稱 | 網址」）
- 按日本時間自動標示「進行中」同「下一站」，過咗嘅變淡
- 編輯表單：改晒所有欄位、搬去另一日、上下移；**拖拉排序**
- 改當日主題同提示

**地圖同交通**
- 「地圖」：Google Maps 搜尋
- 「導航」：由而家位置去呢度（大眾運輸）
- 卡底「**下一站 · 路線**」：由呢站去下一站（大眾運輸）
- 冇地點嘅行程當係仲喺上一站；「返回酒店」自動用當晚酒店

**天氣**（Open-Meteo）
- 每日按主題揀城市（京都 / 大阪 / 天橋立 / 箕面），一日最多兩個城市
- 最高/最低溫、降雨機會，9:00–21:00 每 3 小時；降雨 ≥ 50% 提「帶遮」
- 預報只有 16 日；未有預報就顯示**去年同日**作參考（淡色）

**記帳**
- 日圓 / 港幣；分類（餐飲、交通、購物、門票、住宿、其他）；付款（現金、信用卡、Suica）
- 自動匯率（每 12 小時），可以自訂；總預算進度條（就嚟用晒轉橙，超支轉紅）
- 分類統計、按日明細、撳一筆就改或刪
- 可以記「出發前」（例如機票）

**待辦**
- 行程標咗「待處理」嘅會自動列出
- 用家可以**自己加待辦**（可以揀關於邊日），剔、改、刪

**相片**
- 每日一個相簿，另有機票 / 酒店 / 門票三個分類
- 手機或電腦上載（壓縮到最長 2000px JPEG），PDF 都得
- 撳相全螢幕睇（FLIP 放大動畫、向下掃關閉）、刪相

**航班即時狀態**
- 冇 API key：按時刻表推算倒數、飛行進度
- 有 key：AeroDataBox 或 aviationstack（自動分辨 key），顯示延誤、閘口、行李帶等
- 有節流，慳 API 額度（見第 6 節）

**同步同離線**
- GitHub Contents API 讀寫 `trip.json`（Fine-grained PAT 存喺瀏覽器 localStorage）
- 版本衝突（409/422）會重新載入
- 離線：Service Worker 快取網頁、資料、字型、相片；離線修改存喺手機，有網自動上載

**iPhone 小工具**（Scriptable）
- 樣式：auto、countdown、next、today、day1–day7、flight、hotel、todo、week
- 尺寸：small / medium / large / 鎖定畫面三款

---

## 4. 資料結構（`data/trip.json`）

App 第一版可以直接匯入呢個 JSON。以下係而家實際用緊嘅欄位：

```jsonc
{
  "title": "京都・大阪 7日6夜自由行",
  "start_date": "2026-10-23",          // YYYY-MM-DD
  "end_date": "2026-10-29",
  "travellers": 1,
  "budget": 150000,                    // 可選；日圓
  "flights": [{
    "label": "去程", "code": "HX616", "date": "10/23（五）",
    "from": "香港國際機場 T2", "from_code": "HKG", "dep": "02:50",
    "to": "關西國際機場 T1",  "to_code": "KIX",  "arr": "07:55",
    "status": "confirmed", "note": "香港 T2 → 關西 T1"
  }],
  "hotels": [{
    "name": "…", "address": "…", "phone": "+81-…",
    "checkin": "2026/10/23", "checkout": "2026/10/25", "nights": 2,
    "status": "confirmed"
  }],
  "transport": [{ "what": "…", "ref": "…", "note": "…", "status": "confirmed" }],
  "photo_folders": [{ "folder": "flight", "name": "✈️ 機票截圖" }],
  "days": [{
    "title": "京都市區",
    "alert": "",                        // 當日提示，可空
    "items": [{
      "id": "d1-12",                    // 唯一；新嘅用隨機字串
      "time": "11:30",                  // "HH:MM"、"13:00–17:00" 或者文字
      "what": "坂之上商店 四條河原町店 — 牛舌晚餐",
      "place": "坂之上商店 四條河原町店", // 地圖搜尋字；空就用 address
      "address": "京都市中京区…",
      "phone": "075-746-2075",
      "ref": "SMDALMFH8R",              // 預約編號
      "note": "用餐時限 2 小時\n…",      // 多行；網址會變連結
      "links": "訂位頁 | https://…",     // 一行一條，「名稱 | 網址」
      "status": "confirmed",            // "" | "confirmed" | "pending"
      "priority": ""                    // "" | "high" | "mid" | "low"
    }]
  }],
  "expenses": [{
    "id": "…", "day": -1,               // -1 = 出發前；0 = Day 1
    "amt": 3879, "cur": "HKD",          // "JPY" | "HKD"
    "cat": "transport",                 // food|transport|shop|ticket|stay|other
    "pay": "card",                      // cash|card|ic
    "note": "機票", "t": 1791374311910  // 建立時間（ms）
  }],
  "todos": [{ "id": "…", "text": "換日圓", "day": -1, "done": false }]
}
```

**只存喺本機（唔同步）嘅嘢**：行程「待處理」嘅剔、GitHub token、航班 API key、匯率快取、天氣快取。

**App 版建議改良**：
- 時間改用正式型別（`Date` + 時區），唔好再用字串
- 每個行程（Trip）有自己嘅時區；日本行程用 `Asia/Tokyo`
- 支援多個 Trip
- 匯入時保留舊 `id`

---

## 5. 設計系統「旅のしおり」

網站係用 Awwwards 級標準設計，app 應該延續同一種感覺。

**顏色**（淺色 / 深色）

| Token | 淺色 | 深色 | 用途 |
|---|---|---|---|
| paper | `#F3EEE5` | `#12110E` | 背景（和紙） |
| card | `#FBF9F4` | `#1E1C18` | 卡片 |
| ink | `#1B1915` | `#EEE8DC` | 主要文字（墨） |
| ink-2 / ink-3 | `#5A544B` / `#8E8679` | `#ACA497` / `#7B7467` | 次要文字 |
| shu（朱） | `#C63F28` | `#E8664B` | 重點、下一站、印章 |
| matcha | `#46744A` | `#8DBE86` | 已確認 |
| yama | `#A9650F` | `#E2A452` | 待處理、提示 |
| ai（藍） | `#2D4B7D` | `#94AEDD` | 連結、路線、落雨 |

**字型**：標題用 Noto Serif TC（900），數字用 Instrument Serif，介面用系統字（iOS 用 SF Pro / PingFang HK）。

**視覺元素**：朱紅太陽配直排「関西」、「n日目」印章、時間軸線、登機證樣式機票卡、圓角 14–22pt。

**動畫原則**（Emil Kowalski）
- 一般 UI 動畫 < 300ms，ease-out
- 撳落去縮到 0.97
- 抽屜可以向下拉關閉（速度判斷 + 橡皮筋）
- 相片由縮圖放大（matched geometry）
- 尊重「減少動態」、「減少透明度」、「增加對比」設定

---

## 6. 外部服務同 API

> ⚠️ **唔好將任何 API key 寫入 repo 或者 app 程式碼**。之前喺對話貼過嘅 key，建議去各自網站重新產生。

| 服務 | 用途 | 收費 / 限額 | 備註 |
|---|---|---|---|
| **Open-Meteo** | 天氣預報 | 免費，免 key（非商業用途） | 預報最多 16 日；一次可以查多個地點（`latitude=a,b`）；去年資料用 `archive-api.open-meteo.com` |
| **open.er-api.com** | 匯率 | 免費，免 key | `/v6/latest/HKD` → `rates.JPY` |
| **AeroDataBox**（RapidAPI） | 航班即時狀態 | 免費 Basic：400 units/月；「指定日期航班狀態」係 TIER 2，每次 2 units | RapidAPI key 錯一律回「You are not subscribed to this API」；亦可以用 API.Market |
| **aviationstack** | 航班（後備） | 免費：100 次/月，只有即時 | 回傳時間標住 `+00:00`，但其實係**機場當地時間** |
| **Google Maps URL** | 地圖、導航、路線 | 免費（只係開連結） | `https://www.google.com/maps/dir/?api=1&origin=…&destination=…&travelmode=transit` |
| **GitHub Contents API** | 網站同步 | 免費 | App 版改用 iCloud，唔使再用 |

**已知航班資料**：HX616 10/23 02:50 HKG T2 → 07:55 KIX T1；HX613 10/29 20:05 KIX T1 → 23:40 HKG T1。
（iOS 26 Wallet 登機證動態暫時唔支援香港航空。）

**航班節流（網站做法，app 可以沿用）**
- AeroDataBox：起飛前 48 小時至到達後 2 小時先查；起飛前 6 小時之前每 3 小時一次，之後每 15 分鐘一次
- aviationstack：起飛前 6 小時至到達後 1 小時，每 30 分鐘一次

---

## 7. 新 App：目標同功能

### 7.1 MVP（第一版）
1. 多個旅程（Trip），每個有日子、時區、航班、酒店
2. 每日行程卡（對齊第 3.1 節），拖拉排序
3. **貼一段文字 → 拆成行程**（見第 8 節）
4. 匯入現有 `trip.json`
5. 記帳、待辦、相片（用 PhotosPicker）
6. 地圖：Google Maps 連結（之後可以加 MapKit 內嵌地圖）
7. 離線：資料本身存喺手機，天生離線

### 7.2 第二版
- iCloud 同步（CloudKit）
- WidgetKit：主畫面同鎖定畫面（樣式參考 Scriptable 版）
- **Live Activities**：航班倒數、下一站
- 天氣（Open-Meteo，或者付費帳戶用 WeatherKit）
- 航班即時狀態

### 7.3 之後
- 分享行程畀朋友
- App Store 上架
- 自動由 email 或者截圖讀預訂資料

---

## 8. 重點功能：「成段文字 → 行程」

### 8.1 流程
1. 用家喺 app 貼一段文字（WhatsApp、email、小紅書筆記、自己寫嘅計劃）
2. App 將文字連同旅程資料（日子、時區、酒店、已有行程）送去**自己嘅後台**
3. 後台用 Claude API 拆成結構化 JSON
4. App 顯示**預覽**：每張卡都可以改、剔走，或者揀放入邊日
5. 用家撳「加入」先寫入行程

### 8.2 點解要後台
- API key 唔可以擺入 app，會畀人抽出嚟用
- 後台可以限流（每個用家每日幾多次）、記錄用量
- 最簡單：Cloudflare Workers / Vercel / Firebase Functions，用 TypeScript 寫一個 endpoint
- 用官方 SDK `@anthropic-ai/sdk`，唔好自己砌 HTTP

### 8.3 Model 同呼叫方式
- Model：`claude-opus-5-5`（預設）。呢種抽取工作可以用 `output_config.effort: "low"` 慳錢；要再平可以由用家決定轉 `claude-haiku-5-5`
- 用 **Structured Outputs**：`client.messages.parse()` + `output_config: { format: zodOutputFormat(schema) }`，保證回傳嘅 JSON 一定符合 schema
- Claude Opus 5.5 唔接受 `thinking: {type: "disabled"}`，唔好加；亦唔支援 assistant prefill
- 處理 `stop_reason === "refusal"`；可以開 server-side fallback（beta）
- 寫後台之前，喺新 project 用 `/claude-api` skill 攞最新 SDK 寫法

### 8.4 建議嘅輸出 schema

```ts
const Item = z.object({
  day_index: z.number().int(),     // 0 = 第一日；-1 = 唔確定
  time: z.string(),                // "HH:MM"、"HH:MM–HH:MM" 或 ""
  what: z.string(),
  place: z.string(),               // 用嚟搜地圖嘅名
  address: z.string(),
  phone: z.string(),
  ref: z.string(),                 // 預約編號
  note: z.string(),
  links: z.array(z.string()),
  status: z.enum(["", "confirmed", "pending"]),
  confidence: z.enum(["high", "medium", "low"]) // 低嘅喺預覽標黃
});
const ParseResult = z.object({
  items: z.array(Item),
  unparsed: z.string()             // 拆唔到嘅部分，畀用家睇
});
```

### 8.5 Prompt 要點
- 畀晒旅程開始日期、每日日期、時區、酒店名；「第二日」、「星期六」、「聽日」先計得啱
- 中英日夾雜、廣東話口語、日文地名都要識；`place` 保留日文原名，Google Maps 搵得到
- 冇講時間就留空，唔好估
- 一段入面有幾件事就拆幾張卡；預約編號、電話、網址放啱欄位
- 寫 5–10 個真實例子做測試（WhatsApp 對話、訂位 email、小紅書筆記）

### 8.6 成本
- 一段普通長度文字大約 2,000 input + 1,000–1,500 output tokens
- `claude-opus-5-5`（$4 / $20 每百萬 tokens）：大約 **US$0.03–0.05 一次**
- 個人用好平；畀公眾用就要後台限流，或者考慮收費

### 8.7 後備（唔使 AI）
- 離線或者 AI 失敗：用規則拆（換行、時間格式 `\d{1,2}:\d{2}`、「Day n」等），結果一樣入預覽畫面畀用家改

### 8.8 私隱
- 送去 AI 之前要**清楚講明**文字會傳去第三方 AI 處理，並取得同意（App Store 有要求）
- 私隱政策要寫明

---

## 9. 建議技術架構

| 範疇 | 建議 |
|---|---|
| UI | SwiftUI（iOS 17+；Live Activities 需要 iOS 16.1+） |
| 資料 | SwiftData；`Trip → Day → Item`、`Expense`、`Todo`、`Photo` |
| 同步 | SwiftData + CloudKit（**要付費帳戶**） |
| 相片 | PhotosPicker；本機存檔，CloudKit 用 CKAsset |
| Widget | WidgetKit extension；用 App Group 同主 app 共用資料 |
| 動態島 | ActivityKit：本機開始同更新；用推送更新要 APNs（**要付費帳戶**） |
| 天氣 | Open-Meteo（免費），或者 WeatherKit（付費帳戶包每月 50 萬次） |
| AI | 自己嘅後台 → Claude API（第 8 節） |
| 地圖 | 先用 Google Maps URL；之後可以加 MapKit |
| 時間 | 每個 Trip 存 `TimeZone`；顯示用當地時間 |

---

## 10. USD $99 Apple Developer Program

| 項目 | 免費帳戶（Xcode Personal Team） | $99/年 |
|---|---|---|
| 裝落自己部 iPhone | ✅ 但 **7 日後失效**，要用 Mac 重裝 | ✅ |
| Widget、本機 Live Activities | ✅ | ✅ |
| Push（包括遠端更新動態島） | ❌ | ✅ |
| iCloud / CloudKit 同步 | ❌ | ✅ |
| WeatherKit | ❌ | ✅ |
| TestFlight（畀朋友試） | ❌ | ✅ 測試者免費；每個 build 有效 90 日 |
| App Store 上架 | ❌ | ✅ |

部分 capability（例如 App Groups）免費帳戶用唔用到，以 Xcode「Signing & Capabilities」顯示為準。

**建議**：先用免費帳戶開發 MVP（資料存本機），確定好用先畀 $99，再加 CloudKit、TestFlight。

### App Store 審核要留意
- 私隱政策網址、App Privacy 標籤
- 傳資料去第三方 AI：要披露並取得同意
- 如果有註冊帳戶，要可以喺 app 入面刪除帳戶
- 用第三方登入就要同時提供 Sign in with Apple
- 唔可以只係包住個網站（要有原生功能）

---

## 11. 建議時間表（大約）

| 階段 | 內容 | 時間 |
|---|---|---|
| 0 | 開 Xcode project、SwiftData 模型、匯入 `trip.json`、每日時間軸 | 1 週 |
| 1 | 編輯、拖拉、記帳、待辦、相片 | 1–2 週 |
| 2 | 後台 + 貼文字拆行程（預覽畫面） | 1 週 |
| 3 | Widget、Live Activities、天氣、航班 | 1–2 週 |
| 4 | 畀 $99：CloudKit、TestFlight | 1 週 |
| 5 | App Store 資料、審核 | 1–2 週 |

最花時間嘅係喺 iPhone 上面反覆 build、試、改，因為 Claude 冇得直接行 Xcode，要用家喺 Mac 測試再回報。

---

## 12. 由網站學到嘅教訓

- 航班 API：aviationstack 嘅時間其實係當地時間；RapidAPI key 錯會講「not subscribed」；記得節流
- 天氣預報最多 16 日，出發前兩星期先有；要有「未有預報」狀態，唔好一直轉圈
- 匯率等非同步資料返嚟之後，要更新已經畫咗嘅畫面
- 用家成日喺手機直接改資料（加、刪、拖拉），同步要處理衝突
- 「待處理」嘅剔只存本機；自己加嘅待辦就同步，兩者要分清楚
- 拖拉排序時，未完成嘅動畫會令位置計錯，要先取消動畫
- 時間欄有幾種寫法：`11:30`、`13:00–17:00`、文字

---

## 13. 未完成 / 要決定

- [ ] 幾時畀 $99
- [ ] App 名（網站叫「旅のしおり」）
- [ ] 後台用邊個平台（Cloudflare Workers / Vercel / Firebase）
- [ ] 公開畀其他人用定只係自己用（影響登入、限流、收費）
- [ ] 網站：旅行完之後決定 PR #1 merge 定保留

---

## 14. 新 project 開場 prompt（直接複製）

```
我想用 Xcode + SwiftUI 整一個 iOS 旅行行程 app。請用廣東話回覆。
背景同所有規格喺 docs/handoff.md（由我之前嘅網站 project 整理），請先讀完。
參考實作：https://github.com/oxygen1024/Osaka.github.io
（Pages branch：claude/eager-rubin-fcrx2q；資料格式睇 data/trip.json）

我有 Mac，暫時用免費 Apple 帳戶。第一步請幫我：
1. 開 Xcode project 結構（SwiftUI + SwiftData）
2. 建立 Trip / Day / Item / Expense / Todo 資料模型
3. 寫匯入 trip.json 嘅功能
4. 做每日時間軸畫面（跟 docs/handoff.md 第 5 節嘅設計系統）
每一步講清楚我要喺 Xcode 撳邊度、點樣喺 iPhone 測試。
```
