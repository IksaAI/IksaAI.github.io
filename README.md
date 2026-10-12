<p align="center">
  <img src="site/images/icon-256.png" width="112" alt="EQalert 圖示" />
</p>

<h1 align="center">EQalert 地震速報</h1>

<p align="center"><b>平時安心，有事大聲。</b><br/>給 Mac 的地震速報 App</p>

<p align="center">
  <a href="https://iksaai.github.io"><b>官方網站與下載</b></a> ・
  <a href="https://github.com/IksaAI/IksaAI.github.io/releases/latest">最新版本</a>
</p>

---

## 安裝

1. 從 [Releases](https://github.com/IksaAI/IksaAI.github.io/releases/latest) 下載 `EQalert-<版本>.dmg`
2. 打開 DMG，把 EQalert 拖到「Applications」
3. 第一次打開會被 macOS 擋下（還沒經過 Apple 公證）：
   - **macOS 15 以上**：打開一次 → 按「完成」→「系統設定」→「隱私權與安全性」→ 在「已阻擋 EQalert」旁按「強制打開」
   - **macOS 14**：對 EQalert 按右鍵 →「打開」→ 再按「打開」
   - 或在終端機執行：`xattr -dr com.apple.quarantine /Applications/EQalert.app`

需求：macOS 14 以上，Apple Silicon 與 Intel 都支援。

## 這個 repo

這裡放的是 EQalert 的下載網站與安裝檔，App 原始碼不公開。

| 路徑 | 內容 |
|---|---|
| `site/` | 網站原始檔；`{{version}}` 等欄位在部署時填入 |
| `scripts/build.mjs` | 讀取 GitHub Releases，產生 `_site/` |
| `.github/workflows/pages.yml` | push 到 main 或發布 release 時自動部署 |

本機預覽：

```bash
node --test scripts/*.test.mjs
node scripts/build.mjs && python3 -m http.server -d _site 8000
```

## 發布新版本

在 EQalert 原始碼 repo 改好 `Support/Info.plist` 的版本號後：

```bash
./scripts/make-dmg.sh
gh release create v<版本> build/EQalert-<版本>.dmg --repo IksaAI/IksaAI.github.io --title "EQalert <版本>"
```

發布後網站會自動更新下載按鈕與版本紀錄。

---

EQalert 不是官方的地震速報系統。資料僅供參考，實際狀況請以各國官方機關發布為準。
資料來源：中央氣象署、ExpTech、日本氣象廳、P2P地震情報、印尼氣象氣候及地球物理局（BMKG）。
