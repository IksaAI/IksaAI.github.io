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
| EQalert 地震速報 | [iksaai.github.io/eqalert](https://iksaai.github.io/eqalert/) | macOS 14 以上 |

## 安裝 EQalert

1. 從 [EQalert 頁面](https://iksaai.github.io/eqalert/)下載 `EQalert-<版本>.dmg`
2. 打開 DMG，把 EQalert 拖到「Applications」
3. 第一次打開會被 macOS 擋下（還沒經過 Apple 公證）：
   - **macOS 15 以上**：打開一次 → 按「完成」→「系統設定」→「隱私權與安全性」→ 在「已阻擋 EQalert」旁按「強制打開」
   - **macOS 14**：對 EQalert 按右鍵 →「打開」→ 再按「打開」
   - 或在終端機執行：`xattr -dr com.apple.quarantine /Applications/EQalert.app`

## 網站結構

| 路徑 | 內容 |
|---|---|
| `apps.json` | 所有 App 的資料；`slug` 同時是網址（`/eqalert/`）和 release tag 前綴（`eqalert-v…`） |
| `site/index.html`、`site/assets/` | 工作室首頁（藍晒配色）；App 方格與最新動態在部署時產生 |
| `site/<slug>/` | 各 App 的介紹頁，保留 App 自己的設計；`{{version}}` 等欄位在部署時填入 |
| `templates/` | 首頁方格的 HTML 樣板（不會發布） |
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
# 在 EQalert 原始碼 repo，先改好 Support/Info.plist 的版本號
./scripts/make-dmg.sh
gh release create eqalert-v<版本> build/EQalert-<版本>.dmg --draft --repo IksaAI/IksaAI.github.io --title "EQalert <版本>" --notes-file notes.md
gh workflow run publish.yml --repo IksaAI/IksaAI.github.io -f tag=eqalert-v<版本>
```

`publish.yml` 需要 repo secrets `IKSAAI_APP_CLIENT_ID`、`IKSAAI_APP_PRIVATE_KEY`（IksaAI App 的設定：https://github.com/organizations/IksaAI/settings/apps/iksaai ，只授權本 repo）。

## 新增一個 App

1. 在 `apps.json` 加一筆（`featured: true` 的會成為首頁的主打大格；截圖用 16:10）
2. 新增 `site/<slug>/index.html`（可參考 `site/eqalert/`）
3. **先發布第一個 release**（`<slug>-v1.0.0`，附上安裝檔），再 push 網站。還沒有 release 的 App 會讓建置失敗，網站會維持上一版。

---

各 App 提供的資料僅供參考。EQalert 不是官方的地震速報系統，實際狀況請以各國官方機關發布為準。
