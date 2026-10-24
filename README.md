<h1 align="center">IksaAI</h1>

<p align="center"><b>做在關鍵時刻，派得上用場的軟體。</b></p>

<p align="center">
  <a href="https://iksaai.github.io"><b>iksaai.github.io</b></a> ・
  <a href="https://github.com/IksaAI/IksaAI.github.io/releases">所有版本</a>
</p>

---

這個 repo 是艾可颯智慧工作室（IksaAI）的網站，也放所有 App 的安裝檔（GitHub Releases）。IksaAI 製作小而專注的軟體：App 與線上服務；原始碼不公開。

| App | 介紹與下載 | 需求 |
|---|---|---|
| EQalert 地震速報 | [iksaai.github.io/eqalert](https://iksaai.github.io/eqalert/) | macOS 14 以上、Windows 10（2004 版）以上 |
| PolyComme 多平台留言整合 | [iksaai.github.io/polycomme](https://iksaai.github.io/polycomme/)（[English](https://iksaai.github.io/polycomme/en/)・[日本語](https://iksaai.github.io/polycomme/ja/)） | macOS 14 以上 |

## 安裝 EQalert

**macOS**

1. 從 [EQalert 頁面](https://iksaai.github.io/eqalert/)下載 `EQalert-<版本>.dmg`
2. 打開 DMG，把 EQalert 拖到「Applications」
3. 第一次打開會被 macOS 擋下（還沒經過 Apple 公證）：
   - **macOS 15 以上**：打開一次 → 按「完成」→「系統設定」→「隱私權與安全性」→ 在「已阻擋 EQalert」旁按「強制打開」
   - **macOS 14**：對 EQalert 按右鍵 →「打開」→ 再按「打開」
   - 或在終端機執行：`xattr -dr com.apple.quarantine /Applications/EQalert.app`

**Windows**

1. 從 [EQalert 頁面](https://iksaai.github.io/eqalert/)下載 `EQalert-Setup-<版本>-x64.exe` 並執行
2. 出現「Windows 已保護您的電腦」（還沒有程式碼簽章）：點「其他資訊」→「仍要執行」
3. 照安裝精靈完成安裝；預設只裝給目前的使用者，不需要系統管理員

## 安裝 PolyComme

**macOS**

1. 從 [PolyComme 頁面](https://iksaai.github.io/polycomme/)下載 `PolyComme-<版本>.dmg`
2. 打開 DMG，把 PolyComme 拖到「Applications」
3. 第一次打開會被 macOS 擋下（還沒經過 Apple 公證）：
   - **macOS 15 以上**：打開一次 → 按「完成」→「系統設定」→「隱私權與安全性」→ 在「已阻擋 PolyComme」旁按「強制打開」
   - **macOS 14**：對 PolyComme 按右鍵 →「打開」→ 再按「打開」
   - 或在終端機執行：`xattr -dr com.apple.quarantine /Applications/PolyComme.app`

Windows 版製作中。

## 網站結構

| 路徑 | 內容 |
|---|---|
| `apps.json` | 所有 App 的資料；`slug` 同時是網址（`/eqalert/`）和 release tag 前綴（`eqalert-v…`） |
| `site/index.html`、`site/assets/` | 工作室首頁（藍晒配色）；App 方格與最新動態在部署時產生 |
| `site/<slug>/` | 各 App 的介紹頁，保留 App 自己的設計；`{{version}}` 等欄位在部署時填入。有英文、日文頁的話放在 `site/<slug>/en/`、`site/<slug>/ja/`（PolyComme），版本紀錄會用那一頁的語言 |
| `site/eqalert/platform.js` | 判斷訪客用 macOS 還是 Windows（寫在 `<html data-platform>`），切換下載按鈕、截圖和安裝步驟；網址加 `?os=win` 或 `?os=mac` 可以指定 |
| `templates/` | 首頁方格的 HTML 樣板（不會發布） |
| `site/assets/analytics.js` | Google Analytics 4（評估 ID `G-Y5PN5P55LH`）的初始化；CSP 不允許 inline script，所以不能照 GA 給的片段直接貼 |
| `scripts/build.mjs` | 讀取 `apps.json` 與 GitHub Releases，產生 `_site/` |
| `.github/workflows/pages.yml` | push 到 main 或發布 release 時自動部署 |

本機預覽：

```bash
node --test scripts/*.test.mjs
node scripts/build.mjs && python3 -m http.server -d _site 8000
```

## 發布新版本

release tag 一律是 `<slug>-v<版本>`，例如 `eqalert-v0.7.0`。版本由 **IksaAI GitHub App**（`iksaai[bot]`）發布，release 頁不會顯示個人帳號：先上傳草稿，再執行 `publish.yml`，它會保留說明和安裝檔，改由 IksaAI 重新發布。發布後網站會自動更新下載按鈕、版本紀錄和首頁的最新動態。

```bash
# Mac 的 DMG 和 Windows 的 Setup.exe 放在同一個草稿
gh release create eqalert-v<版本> EQalert-<版本>.dmg EQalert-Setup-<版本>-x64.exe --draft --repo IksaAI/IksaAI.github.io --title "EQalert <版本>" --notes-file notes.md
gh workflow run publish.yml --repo IksaAI/IksaAI.github.io -f tag=eqalert-v<版本>
```

release 說明可以寫三種語言：最前面是繁中，`<!-- lang:en -->`、`<!-- lang:ja -->` 下面各是英文、日文，`<!-- lang:all -->` 下面的內容（例如 SHA-256）每個語言頁都會顯示。這幾行在 GitHub 的 release 頁上看不到；英文、日文頁只顯示自己那段，沒寫就退回繁中。首頁「最新動態」用繁中那段的第一行。

每個 App 的最新 release 一定要有 DMG；`apps.json` 標了 `"windows": true` 的 App（EQalert），最新 release 也一定要有 Windows 安裝檔（`.exe`）。缺檔時建置會失敗，網站維持上一版。
EQalert 的完整步驟（改版號、兩台電腦分別打包、雜湊）寫在 EQalert 原始碼 repo 的 `docs/發版流程.md`。

`publish.yml` 需要 repo secrets `IKSAAI_APP_CLIENT_ID`、`IKSAAI_APP_PRIVATE_KEY`（IksaAI App 的設定：https://github.com/organizations/IksaAI/settings/apps/iksaai ，只授權本 repo）。

## 新增一個 App

1. 在 `apps.json` 加一筆（`featured: true` 的會成為首頁的精選大格；截圖用 16:10；有 Windows 版就加 `"windows": true`，頁面可以用 `{{exeUrl}}`、`{{exeSize}}`、`{{exeName}}`）
2. 新增 `site/<slug>/index.html`（可參考 `site/eqalert/`）。`<head>` 要照抄 EQalert 頁的 CSP 和兩行 GA 載入（`gtag/js` 與 `../assets/analytics.js`），頁尾也要寫明使用 Google Analytics
3. **先發布第一個 release**（`<slug>-v1.0.0`，附上安裝檔），再 push 網站。還沒有 release 的 App 會讓建置失敗，網站會維持上一版。

---

各 App 提供的資料僅供參考。EQalert 不是官方的地震速報系統，實際狀況請以各國官方機關發布為準。
