# 行口雲端對賬系統

此專案提供 Google 試算表 + Google Apps Script 架構，用於多行口對賬與免登入上傳。前端採單頁式原生 HTML/CSS/JS，並以 Token 決定行口與權限。

## 檔案說明
- `Init.gs`：建立工作表、觸發器、自訂選單與示範資料。
- `Backend.gs`：上傳、查重、RowKey 生成與稽核日誌。
- `Rules.gs`：品名對照、計價模式與硬性規則檢查。
- `Reports.gs`：依日期區間產生報表、CSV 與 LINE 分享連結。
- `Token.gs`：Token 產生/驗簽/速率限制。
- `index.html`：單頁式前端，包含上傳、查詢、管理入口。

## 部署步驟
1. 建立名稱為「行口雲端對賬系統」的 Google 試算表與同名 GAS 專案。
2. 將上述 `.gs` 與 `index.html` 複製到 GAS 專案（Apps Script > 檔案 > 新增）。
3. 在 Script Properties 設定 `TOKEN_SECRET` 供 Token 簽章使用。
4. 於「入口管理」工作表設定各入口ID、行口、用途與速率限制。
5. 使用 `Token_generate` 產生行口 A/B/C 的上傳 Token、查詢 Token，以及管理者 Token。
6. 執行 `Init_buildAll()` 生成所需工作表與觸發器。
7. 部署為網路應用程式：執行身分選「我」，存取權限選「任何擁有連結的使用者」。
8. 將上傳網址（含 `token` 參數）提供給各行口；查詢網址提供給同行口；管理者使用管理者 Token 進入後台。

## 操作手冊
### 新增行口與 Token
1. 在 `Init.gs` 的 `BANKS` 陣列中加入行口名稱，重新執行 `Init_buildAll()`。
2. 於「入口管理」新增一列，設定入口ID、行口、用途與速率限制，啟用後利用 `Token_generate` 取得 Token。

### 行口上傳與查詢
- 行口使用上傳入口網址即可免登入上傳，行口欄位自動鎖定。
- 查詢入口可選日期區間產生報表並下載 CSV。

### 月結封存/解鎖
- 管理者入口按下「封存本月」即鎖定前月資料；如需解鎖，可於試算表手動取消保護。

### 常見錯誤
- `DUPLICATE`：同一 RowKey 的資料已存在。
- `CONFLICT`：RowKey 相同但內容不同。
- `規則違反`：例如雞籠非 1 筆、中公/中母多筆等。
- `token 無效`：Token 錯誤或過期。
- `速率超限`：超過設定的每分鐘次數，請稍後再試。

## 測試腳本
參見 `TESTING.md` 取得完整測試流程。
