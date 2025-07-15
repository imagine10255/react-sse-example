# SSE (Server-Sent Events) 封裝

這個模組提供了完整的 SSE 功能封裝，包括 Provider、Hooks 和相關類型定義。

## 功能特性

- 🔌 **連接管理**: 自動處理 SSE 連接的建立和斷開
- 📨 **消息發送**: 支持個別消息和廣播消息
- 📊 **狀態管理**: 實時更新連接狀態和消息列表
- 🎯 **類型安全**: 完整的 TypeScript 類型定義
- 🔄 **自動重連**: 處理連接中斷和重連邏輯

## 安裝和使用

### 1. 在應用根組件中包裹 SSEProvider

```tsx
import { SSEProvider } from './components/organize/SSESection';

function App() {
  return (
    <SSEProvider>
      {/* 你的應用組件 */}
    </SSEProvider>
  );
}
```

### 2. 使用 Hooks

#### 連接管理 Hook

```tsx
import { useSSEConnection } from './components/organize/SSESection';

function MyComponent() {
  const { isConnecting, connect, disconnect, isConnected } = useSSEConnection();

  const handleConnect = async () => {
    await connect('user123');
  };

  return (
    <div>
      <button onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? '連接中...' : '建立連線'}
      </button>
      <button onClick={disconnect} disabled={!isConnected}>
        斷開連線
      </button>
    </div>
  );
}
```

#### 消息發送 Hook

```tsx
import { useSSEMessage } from './components/organize/SSESection';

function MessageComponent() {
  const { isSending, sendMessage, broadcastMessage } = useSSEMessage();

  const handleSendMessage = async () => {
    await sendMessage('user123', 'Hello!', 'notification');
  };

  const handleBroadcast = async () => {
    await broadcastMessage('廣播消息');
  };

  return (
    <div>
      <button onClick={handleSendMessage} disabled={isSending}>
        {isSending ? '發送中...' : '發送消息'}
      </button>
      <button onClick={handleBroadcast} disabled={isSending}>
        {isSending ? '發送中...' : '廣播消息'}
      </button>
    </div>
  );
}
```

#### 消息列表 Hook

```tsx
import { useSSEMessages } from './components/organize/SSESection';

function MessagesComponent() {
  const { 
    pingMessages, 
    customMessages, 
    notificationMessages, 
    connectedUsers, 
    refreshConnectedUsers 
  } = useSSEMessages();

  return (
    <div>
      <h3>Ping 消息 ({pingMessages.length})</h3>
      <ul>
        {pingMessages.map((msg, index) => (
          <li key={index}>{msg}</li>
        ))}
      </ul>

      <h3>通知消息 ({notificationMessages.length})</h3>
      <ul>
        {notificationMessages.map((msg, index) => (
          <li key={index} style={{ color: '#588e56' }}>{msg}</li>
        ))}
      </ul>

      <h3>自定義消息 ({customMessages.length})</h3>
      <ul>
        {customMessages.map((msg, index) => (
          <li key={index} style={{ color: '#4485bb' }}>{msg}</li>
        ))}
      </ul>

      <h3>連接用戶 ({connectedUsers.length})</h3>
      <button onClick={refreshConnectedUsers}>刷新用戶列表</button>
      <ul>
        {connectedUsers.map((userId, index) => (
          <li key={index}>{userId}</li>
        ))}
      </ul>
    </div>
  );
}
```

## API 參考

### SSEProvider

主要的 Provider 組件，提供 SSE 上下文。

#### Props

- `children: React.ReactNode` - 子組件

### useSSE

基礎的 SSE Hook，提供所有 SSE 功能。

#### 返回值

```typescript
interface SSEContextType {
  // 狀態
  isConnected: boolean;
  pingList: string[];
  customList: string[];
  notifications: string[];
  connectedUsers: string[];
  sseSource: ReadableStreamDefaultReader<Uint8Array> | null;
  abortController: AbortController | null;
  
  // 方法
  connect: (userId: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (userId: string, message: string, eventType: 'notification' | 'custom') => Promise<void>;
  broadcastMessage: (message: string) => Promise<void>;
  refreshConnectedUsers: () => Promise<void>;
}
```

### useSSEConnection

專門用於連接管理的 Hook。

#### 返回值

```typescript
interface UseSSEConnectionReturn {
  isConnecting: boolean;
  connect: (userId: string) => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
}
```

### useSSEMessage

專門用於消息發送的 Hook。

#### 返回值

```typescript
interface UseSSEMessageReturn {
  isSending: boolean;
  sendMessage: (userId: string, message: string, eventType: 'notification' | 'custom') => Promise<void>;
  broadcastMessage: (message: string) => Promise<void>;
}
```

### useSSEMessages

專門用於消息列表管理的 Hook。

#### 返回值

```typescript
interface UseSSEMessagesReturn {
  pingMessages: string[];
  customMessages: string[];
  notificationMessages: string[];
  connectedUsers: string[];
  refreshConnectedUsers: () => Promise<void>;
}
```

## 類型定義

### SSEMessage

```typescript
interface SSEMessage {
  type: 'connected' | 'ping' | 'custom' | 'notification';
  message: string;
  timestamp?: string;
}
```

### SSEState

```typescript
interface SSEState {
  isConnected: boolean;
  pingList: string[];
  customList: string[];
  notifications: string[];
  connectedUsers: string[];
  sseSource: ReadableStreamDefaultReader<Uint8Array> | null;
  abortController: AbortController | null;
}
```

## 注意事項

1. **Provider 包裹**: 使用任何 SSE Hook 前，必須先用 `SSEProvider` 包裹應用
2. **錯誤處理**: 所有異步操作都包含錯誤處理和用戶提示
3. **自動清理**: 組件卸載時會自動斷開連接
4. **頁面卸載**: 頁面關閉時會自動斷開連接

## 示例

查看 `SSEExample.tsx` 文件了解完整的使用示例。 