# 大股東在幹嘛

把政府公開資料（證交所、櫃買中心、集保結算所、金管會）整理成「我關心的公司，大股東最近有沒有動作」的繁體中文儀表板。只整理公開事實，不提供買賣建議。

本專案已重寫為 **React + TypeScript + Vite** 單頁應用（SPA）。

## 核心特色

1. **無後端、無須 API 金鑰**：純前端靜態架構，資料每天由 GitHub Raw 取得，失敗時自動無縫降級至 `public/data.json`。
2. **Hash 路由**：
   - `#dash`：我的儀表板（過去 12 個月追蹤清單時間軸、一週新增異動、多重訊號公司）
   - `#radar`：全市場雷達（各產業有訊號公司比例、互動熱度方格）
   - `#feed`、`#signals`、`#pledge`、`#control`、`#risk`：社群動態牆討論區（支援收藏、複製分享文字）
   - `#search`：搜尋公司代號或名稱，提供快速篩選標籤
   - `#co-{代號}`：個別公司檔案（12 個月各類別時間軸、歷史事件紀錄、相關討論）
3. **客製化時間軸**：精準計算過去 12 個月相對百分比座標，支援申報轉讓區間、處置區間、董監質押比例視覺條。
4. **在地化色彩與語氣**：警訊採用橘色（#C2410C）避免與台股上漲紅色混淆；嚴守客觀中立原則，不提供買賣預測或建議。
5. **深色模式與行動裝置支援**：支援 400px 行動版響應式介面，自動配合系統深淺色主題切換。

## 本地開發與建置

```bash
# 安裝相依套件
npm install

# 啟動開發伺服器（預設 Port 3000）
npm run dev

# 生產環境建置
npm run build

# 預覽建置成果
npm run preview
```

## 如何發布（Publishing & Deployment）

因為本專案是純靜態 React SPA，您可以非常輕鬆地發布到以下任一免費託管平台：

### 方法一：發布至 GitHub Pages（最推薦）

1. 在 `package.json` 中可視需要設定 base 路徑（若部署在子路徑 `https://<username>.github.io/<repo>/`，於 `vite.config.ts` 加入 `base: './'`）。
2. 執行建置：
   ```bash
   npm run build
   ```
3. 建置完成的靜態檔案會產出於 `dist/` 資料夾。
4. 可以使用 GitHub Actions 自動部署，在 `.github/workflows/deploy.yml` 加入靜態部署流程，或直接將 `dist/` 推送到 `gh-pages` 分支。

### 方法二：發布至 Vercel / Cloudflare Pages / Netlify

1. 將程式碼推送到 GitHub 儲存庫。
2. 登入 Vercel 或 Cloudflare Pages，選擇「Import Git Repository」。
3. 平台會自動偵測為 Vite 專案：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. 點擊 Deploy 即可在一分鐘內完成全自動部屬，且享有免費 SSL 憑證與全球 CDN 加速。
