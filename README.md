# 大阪之旅 🇯🇵

手機睇嘅 7 日大阪行程網站（GitHub Pages）。

## 📱 喺手機打開

1. GitHub → 呢個 repo → **Settings → Pages**
2. Source 揀 **Deploy from a branch**，Branch 揀 `main`、資料夾 `/ (root)`，Save
3. 等 1–2 分鐘，網址會係：`https://oxygen1024.github.io/Osaka.github.io/`
4. 手機用 Safari / Chrome 打開 →「分享」→「加入主畫面」，之後好似 app 咁一撳就開

## 🖼️ 用電腦加相（機票、酒店、booking 截圖）

唔使改任何 code，放相入資料夾就會自動喺手機出現：

1. 電腦打開 GitHub 呢個 repo → 入去 `photos/` 入面對應嘅資料夾
2. 撳 **Add file → Upload files**，將相拖入去 → **Commit changes**
3. 等大約 1–2 分鐘，手機 reload 就見到

| 資料夾 | 出現喺邊 |
| --- | --- |
| `photos/flight/` | 預訂 → ✈️ 機票 / 航班 |
| `photos/hotel/` | 預訂 → 🏨 酒店 |
| `photos/tickets/` | 預訂 → 🎟️ 門票 / 交通 / 其他 |
| `photos/day1/` … `photos/day7/` | 對應嗰日嘅「相片 / 文件」 |

- 支援 `.jpg` `.jpeg` `.png` `.webp` `.gif` 同 `.pdf`
- 相片按檔名排序，想控制次序可以用 `01_去程.png`、`02_回程.png` 咁命名
- 檔名會顯示喺相下面，所以可以直接用中文改個有意思嘅名
- iPhone 嘅 `.HEIC` 相 Android / 電腦瀏覽器睇唔到，建議截圖（PNG）或者轉做 JPG

## ✏️ 改行程

行程全部喺 [`_data/trip.yml`](_data/trip.yml)。填咗 `start_date` 之後，每日會自動計日期，旅行期間打開網站會自動跳去「今日」。

## ⚠️ 私隱

GitHub Pages 免費版嘅 repo 係公開嘅，**任何人有網址都睇到啲相**（網站已設定唔俾 Google 收錄，但唔等於加密）。上載 booking 截圖之前，建議遮咗護照號碼、電話、完整 booking reference 等資料。
