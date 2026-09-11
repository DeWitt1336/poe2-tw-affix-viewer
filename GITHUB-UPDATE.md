# GitHub 更新指南

本指南分成兩部分：先把本次程式修正和自動更新功能上傳一次；之後更新 PoE2DB 資料只需要在 GitHub 點一個按鈕。

## 一、本次先上傳最新版

### 1. 下載與解壓

下載最新版 `poe2-tw-affix-viewer.zip` 並解壓。

本次至少需要更新或新增以下內容：

- `app.js`：復合詞綴解析修正。
- `tools/update_data.py`：自動下載及重建資料庫。
- `.github/workflows/update-affix-data.yml`：GitHub 自動更新與部署流程。
- `README.md`、`GITHUB-UPDATE.md`：使用說明。

### 2. 先設定 Actions 权限

1. 打開 GitHub 儲存庫 `dewitt1336/poe2-tw-affix-viewer`。
2. 進入 `Settings`。
3. 左側選擇 `Actions → General`。
4. 拉到頁面下方的 `Workflow permissions`。
5. 選擇 `Read and write permissions`。
6. 按 `Save`。

這個權限只用於讓 GitHub Actions 將新版 `affixes-data.js` 提交回此儲存庫。

### 3. 将 Pages 改为 Actions 部署

1. 仍在 `Settings` 中，左側選擇 `Pages`。
2. 在 `Build and deployment` 下找到 `Source`。
3. 將原本的 `Deploy from a branch` 改成 `GitHub Actions`。

### 4. 上传普通文件和 tools 文件夹

1. 回到儲存庫的 `Code` 首頁。
2. 按 `Add file → Upload files`。
3. 從解壓後的資料夾上傳新版 `app.js`、`README.md`、`GITHUB-UPDATE.md`，以及整個 `tools` 資料夾。
4. Commit message 可填：`Fix compound modifier parsing and add data updater`。
5. 按 `Commit changes`。

可以直接把解壓後資料夾內的全部檔案拖進去；同名檔案會以新版取代。

### 5. 新增隐藏的工作流文件

macOS 預設不顯示 `.github` 隱藏資料夾，使用 GitHub 的建立檔案功能最簡單：

1. 在儲存庫首頁按 `Add file → Create new file`。
2. 在檔名欄完整輸入：

   `.github/workflows/update-affix-data.yml`

3. 打開本機相同路徑的文件，將全部內容複製到 GitHub 編輯框。
4. Commit message 填：`Add automatic affix data update workflow`。
5. 按 `Commit changes`。

提交後打開 `Actions`。第一次部署應該會自動開始；等待工作前方出現綠色勾號，再打開線上頁面測試。

## 二、以后在 GitHub 一键更新数据库

1. 打開儲存庫上方的 `Actions`。
2. 左側選擇 `更新数据库并部署网站`。
3. 按右側的 `Run workflow`。
4. Branch 選擇儲存庫的預設分支，通常是 `main`。
5. 按綠色的 `Run workflow`。
6. 等待工作完成並顯示綠色勾號。

工作流程會依序：

1. 下載 PoE2DB 最新英文與繁中頁面。
2. 重建 `affixes-data.js`。
3. 資料有變化時建立一筆 `Update PoE2DB affix data` 提交；沒有變化時不建立提交。
4. 部署本次產生的資料到 GitHub Pages。

## 三、确认是否更新成功

- 在 Actions 工作頁面確認所有步驟都是綠色勾號。
- 回到 Code 頁面；若資料有變化，最新提交應顯示 `Update PoE2DB affix data`。
- 等候數分鐘後，重新整理：`https://dewitt1336.github.io/poe2-tw-affix-viewer/`
- 如果仍看到舊版，可用強制重新整理：macOS 按 `Command + Shift + R`，Windows 按 `Ctrl + F5`。

## 常见失败原因

### 提示没有写入权限

回到 `Settings → Actions → General → Workflow permissions`，確認已選擇 `Read and write permissions`。

### Actions 中没有 Run workflow 按钮

確認 `.github/workflows/update-affix-data.yml` 已經提交到預設分支，而且儲存庫沒有停用 Actions。

### 找不到 tools/update_data.py

代表 `tools` 資料夾沒有完整上傳。重新使用 `Add file → Upload files` 上傳整個 `tools` 資料夾。

### 更新成功但线上页面没变化

確認 `Settings → Pages → Source` 已設為 `GitHub Actions`，並等待 GitHub Pages 快取更新。
