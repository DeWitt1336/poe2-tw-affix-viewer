# GitHub 發布資料

## 建議儲存庫名稱

`poe2-tw-affix-viewer`

## About／Description

貼上 POE2 裝備文字，離線查看繁中詞綴、Tier、需求 ilvl、weight 與池內機率。

## Website

啟用 GitHub Pages 後填入：

`https://你的-GitHub-帳號.github.io/poe2-tw-affix-viewer/`

## Topics

`path-of-exile-2` `poe2` `affix` `modifier` `traditional-chinese` `offline-tool` `javascript`

## 首次 Release 標題

`v0.1.0 — 首個離線測試版`

## 首次 Release 說明

### POE2 繁中詞綴查看器 v0.1.0

首個可用的離線版本。貼上官方 Trade 或遊戲複製的裝備文字，即可查看目前物品已有詞綴，以及該底子與物品等級可出的各來源詞綴。

主要功能：

- 支援常見武器、防具、飾品、盾牌、法器與箭袋。
- 顯示繁中詞綴、Tier、需求 ilvl、weight 與池內機率。
- 根據現有詞綴數值判定實際 Tier。
- 排除物品已有詞綴系列並重新計算機率。
- 區分基礎通貨、褻瀆、精髓、裂痕、合金與腐化等來源。
- 支援詞綴搜尋、區塊收合及單 Tier 直接展示。
- 完全離線，不上傳任何裝備文字。
- 附帶 PoE2DB 詞綴資料更新腳本。

目前不包含查價、交易、BD、地圖或其他額外功能。

下載下方 ZIP，解壓後直接開啟 `index.html` 即可使用。

## 可貼到社群的短介紹

做了一個精簡的 POE2 繁中詞綴查看器。從官方 Trade 或遊戲複製裝備文字貼進去，就能看底子、物品等級、已有詞綴 Tier，以及目前 ilvl 可出的基礎／褻瀆／精髓／裂痕／腐化等詞綴。會按 weight 顯示池內機率，也會排除裝備已經有的詞綴系列。純離線網頁，不查價、不做 BD，也不會上傳裝備資料。

## GitHub 網頁發布步驟

1. 登入 GitHub，按右上角 `+`，選擇 `New repository`。
2. Repository name 填 `poe2-tw-affix-viewer`，Description 使用上方文字。
3. 選擇 `Public`，不要勾選自動建立 README、`.gitignore` 或 License。
4. 建立後按 `uploading an existing file`。
5. 將本資料夾內的所有檔案拖入上傳頁面。注意是上傳資料夾「裡面的檔案」，讓 `index.html` 位於儲存庫根目錄。
6. Commit message 填 `Initial release`，再按 `Commit changes`。
7. 進入 `Settings → Pages`，Source 選 `Deploy from a branch`，Branch 選 `main` 和 `/(root)`，按 `Save`。
8. 等待數分鐘，Pages 頁面會顯示線上網址。把網址填到儲存庫 About 的 Website。
9. 回到儲存庫右側 `Releases`，選 `Draft a new release`，Tag 填 `v0.1.0`，貼上上方 Release 說明並上傳 ZIP。

## 後續更新

修改後重新上傳變動的檔案並提交即可。發正式版本時使用新的 Tag，例如 `v0.1.1`、`v0.2.0`，不要覆蓋已發布的舊 Release。
