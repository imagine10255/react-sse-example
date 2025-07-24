# React SSE Example - Hono + Cloudflare Workers

這是一個使用 Hono 框架和 Cloudflare Workers 的 Server-Sent Events (SSE) 示例項目。

## 功能特性

- ✅ 基於 Hono 框架的輕量級 API
- ✅ Server-Sent Events (SSE) 實時通信
- ✅ 部署到 Cloudflare Workers
- ✅ TypeScript 支援
- ✅ CORS 配置
- ✅ 用戶連接管理
- ✅ 修復 Cloudflare Workers 環境的 SSE 實現

## API 端點

### 1. 根路徑
```
GET /
```
返回 "Hello World!" 訊息

### 2. SSE 連接
```
GET /sse?userId={userId}
```
建立 SSE 長連接，需要提供 `userId` 參數

### 3. 通知特定用戶
```
POST /notifyUser
Content-Type: application/json

{
  "userId": "user123",
  "message": "這是一個通知",
  "eventType": "notification"
}
```

### 4. 通知所有用戶
```
POST /trigger
Content-Type: application/json

{
  "message": "全體通知",
  "eventType": "notification"
}
```

### 5. 獲取連接用戶列表
```
GET /users
```
返回當前連接的所有用戶 ID

## 本地開發

### 安裝依賴
```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 啟動開發服務器
```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

開發服務器將在 `http://localhost:8787` 啟動

### 測試 API
```bash
# 運行 SSE 測試
npm test
# 或
node test-sse.js
```

## 部署到 Cloudflare Workers

### 1. 安裝 Wrangler CLI
```bash
npm install -g wrangler
```

### 2. 登錄 Cloudflare
```bash
wrangler login
```

### 3. 配置 KV 命名空間（可選）
如果需要持久化存儲連接信息，可以創建 KV 命名空間：

```bash
# 創建 KV 命名空間
wrangler kv:namespace create "SSE_CONNECTIONS"

# 創建預覽環境的 KV 命名空間
wrangler kv:namespace create "SSE_CONNECTIONS" --preview
```

然後更新 `wrangler.toml` 中的 KV 配置。

### 4. 部署
```bash
npm run deploy
# 或
yarn deploy
# 或
pnpm deploy
```

## 項目結構

```
server/
├── src/
│   ├── index.ts          # 主應用入口
│   └── sse-manager.ts    # SSE 連接管理器
├── test-sse.js           # SSE 測試腳本
├── package.json
├── tsconfig.json
├── wrangler.toml         # Wrangler 配置
└── README.md
```

## 技術實現

### SSE 實現修復
原版本在 Cloudflare Workers 環境中會出現 "hanging Promise" 錯誤，已修復：

- 使用 `TransformStream` 替代 `ReadableStream`
- 使用 `WritableStreamDefaultWriter` 管理連接
- 正確處理 Cloudflare Workers 的流式響應

### 連接管理
- 使用內存 Map 存儲連接信息
- 自動清理斷開的連接
- 支援單用戶和全體通知

## 注意事項

1. **連接持久化**: 當前實現使用內存存儲連接信息，在 Cloudflare Workers 環境中，連接信息不會在請求之間持久化。如果需要持久化，建議使用 KV 存儲或 Durable Objects。

2. **連接限制**: Cloudflare Workers 有連接數限制，建議在生產環境中實現連接池管理。

3. **錯誤處理**: 已實現基本的錯誤處理，但在生產環境中可能需要更完善的錯誤處理機制。

4. **SSE 實現**: 已修復 Cloudflare Workers 環境中的 SSE 實現問題，避免 hanging Promise 錯誤。

## 與原 Express 版本的差異

- 使用 Hono 替代 Express
- 使用 Cloudflare Workers 運行時環境
- 使用 TransformStream 實現 SSE（修復版本）
- 更輕量級的架構
- 更好的 TypeScript 支援
- 修復了 Workers 環境的 SSE 兼容性問題

## 故障排除

### 常見問題

1. **TypeScript 編譯錯誤**
   - 確保已安裝所有依賴
   - 檢查 `tsconfig.json` 配置

2. **部署失敗**
   - 確保已登錄 Cloudflare 帳戶
   - 檢查 `wrangler.toml` 配置
   - 確認項目名稱唯一

3. **SSE 連接失敗**
   - 檢查 CORS 配置
   - 確認客戶端正確處理 SSE 事件
   - 檢查網絡連接

4. **Hanging Promise 錯誤**
   - 已修復：使用 TransformStream 替代 ReadableStream
   - 確保正確處理流式響應

## 授權

MIT License 


## Server 端支援 HTTPS

```bash
brew install mkcert
mkcert -install

## 加入 localhost 127.0.0.1 的憑證
mkcert localhost 127.0.0.1 ::1
```
