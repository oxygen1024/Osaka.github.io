# 京都・大阪 7日6夜自由行 🇯🇵

手機睇嘅 7 日關西行程網站（GitHub Pages）：總覽（機票、酒店、交通）、每日行程、待辦事項、設定。

網址：https://oxygen1024.github.io/Osaka.github.io/

## ✏️ 喺手機改行程

- 每張行程卡右上角有 **✏️**：可以改時間、名稱、地址、電話、預約編號、備註
- **狀態**：✅ 已確認（綠色）／🟠 待處理（橙色，會自動出現喺「待辦」頁）
- **優先度**：🔴 高／🔵 中／⚪ 低
- **次序**：按住卡片左上角 **⠿** 上下拖拉；或者喺表單用「⬆️ 上移／⬇️ 下移」；「放喺邊日」可以搬去第二日
- 每日底部有「＋ 新增行程」；當日主題旁邊嘅 ✏️ 可以改主題同 ⚠️ 提示

## ☁️ 連接 GitHub（同步 + 手機上載相片）

未連接之前，修改只會存喺嗰部手機。連接之後，修改同相片會直接存入呢個 repo，電腦同手機都睇到。

1. 開 https://github.com/settings/personal-access-tokens/new
2. Repository access →「Only select repositories」→ 揀 `Osaka.github.io`
3. Permissions → Repository permissions → **Contents: Read and write**
4. Generate token，複製 `github_pat_…`
5. 網站「⚙️ 設定」→ 貼 token → 儲存並連接

Token 只存喺嗰部裝置嘅瀏覽器；唔見手機可以喺 GitHub 刪除個 token。

## 📤 上載相片

- **手機**：每個相片區（總覽嘅機票／酒店／門票，同每日）都有「📤 上載相片 / PDF」掣。相片會自動壓縮到 2000px JPEG
- **電腦**：GitHub → `photos/` 入面對應資料夾 → Add file → Upload files

| 資料夾 | 出現喺邊 |
| --- | --- |
| `photos/flight/` | 總覽 → ✈️ 機票截圖 |
| `photos/hotel/` | 總覽 → 🏨 酒店截圖 |
| `photos/tickets/` | 總覽 → 🎟️ 門票 / 交通 / 其他 |
| `photos/day1/` … `photos/day7/` | 對應嗰日 |

## 🗂 資料

行程全部喺 [`data/trip.json`](data/trip.json)。網站上嘅修改都係改呢個檔。

## ⚠️ 私隱

GitHub Pages 免費版 repo 係公開嘅，有網址嘅人都睇到行程同相片（已設定唔俾 Google 收錄，但唔等於加密）。上載 booking 截圖前建議遮咗護照號碼等資料。
