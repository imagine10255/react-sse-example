import {BroadcastChannel, createLeaderElection, LeaderElector} from 'broadcast-channel';

export interface SSEMessage {
    type: string;
    data?: any;
    timestamp: number;
    connectionId: string;
}

export interface ConnectionRequest {
    type: 'connection-request';
    userId: string;
    timestamp: number;
    connectionId: string;
}

export interface ConnectionResponse {
    type: 'connection-response';
    isPrimary: boolean;
    connectionId: string;
    timestamp: number;
}

export class SSEBroadcastChannel {
    private channel: BroadcastChannel<SSEMessage | ConnectionRequest | ConnectionResponse>;
    private elector: LeaderElector; // Leader Election 實例
    private connectionId: string;
    private isPrimary: boolean = false;
    private messageHandlers: Map<string, (message: SSEMessage) => void> = new Map();
    private connectionHandlers: Map<string, (response: ConnectionResponse) => void> = new Map();

    constructor(channelName: string = 'sse-connection') {
        this.channel = new BroadcastChannel(channelName);
        this.connectionId = this.generateConnectionId();
        this.elector = createLeaderElection(this.channel, {
            fallbackInterval: 2000, // optional configuration for how often will renegotiation for leader occur
            responseTime: 1000, // optional configuration for how long will instances have to respond
        });
        this.setupMessageHandler();
        this.setupLeaderElection();

    }

    private generateConnectionId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private setupMessageHandler() {
        this.channel.onmessage = (message: SSEMessage | ConnectionRequest | ConnectionResponse) => {
            if ('type' in message) {
                switch (message.type) {
                    case 'connection-request':
                        this.handleConnectionRequest(message as ConnectionRequest);
                        break;
                    case 'connection-response':
                        this.handleConnectionResponse(message as ConnectionResponse);
                        break;
                    default:
                        this.handleSSEMessage(message as SSEMessage);
                        break;
                }
            }
        };
    }

    private setupLeaderElection() {
        // 監聽選舉事件
        this.elector.onduplicate = () => {
            console.log('[Leader Election] 檢測到重複的領導者');
        };

        // 套件沒有提供該事件
        // this.elector.onresolve = () => {
        //     console.log('[Leader Election] 選舉完成');
        // };
    }

    private handleConnectionRequest(request: ConnectionRequest) {
        // 如果收到連線請求，回應是否為主要連線
        const response: ConnectionResponse = {
            type: 'connection-response',
            isPrimary: !this.isPrimary, // 如果當前沒有主要連線，則這個請求可以成為主要連線
            connectionId: request.connectionId,
            timestamp: Date.now()
        };
        this.channel.postMessage(response);
    }

    private handleConnectionResponse(response: ConnectionResponse) {
        // 處理連線回應
        const handler = this.connectionHandlers.get(response.connectionId);
        if (handler) {
            handler(response);
            this.connectionHandlers.delete(response.connectionId);
        }
    }

    private handleSSEMessage(message: SSEMessage) {
        // 處理 SSE 訊息
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(message);
        }
    }

    /**
     * 使用 Leader Election 機制建立連線
     */
    async createLeaderElection(userId: string): Promise<boolean> {
        try {
            // 等待選舉完成
            await this.elector.awaitLeadership();

            // 成為 Leader
            this.isPrimary = true;
            console.log(`[Leader Election] ${this.connectionId} 成為 Leader`);

            return true;
        } catch (error) {
            console.error('[Leader Election] 選舉失敗:', error);
            this.isPrimary = false;
            return false;
        }
    }

    /**
     * 檢查是否為 Leader
     */
    isLeader(): boolean {
        return this.elector.isLeader;
    }

    /**
     * 等待成為 Leader
     */
    async awaitLeadership(): Promise<void> {
        if (this.elector) {
            await this.elector.awaitLeadership();
        }
    }

    /**
     * 請求建立連線（保留原有方法以向後兼容）
     */
    async requestConnection(userId: string): Promise<boolean> {
        const request: ConnectionRequest = {
            type: 'connection-request',
            userId,
            timestamp: Date.now(),
            connectionId: this.connectionId
        };

        return new Promise((resolve) => {
            // 設置回應處理器
            this.connectionHandlers.set(this.connectionId, (response: ConnectionResponse) => {
                this.isPrimary = response.isPrimary;
                resolve(response.isPrimary);
            });

            // 發送連線請求
            this.channel.postMessage(request);

            // 設置超時，如果沒有收到回應，預設為主要連線
            setTimeout(() => {
                if (this.connectionHandlers.has(this.connectionId)) {
                    this.isPrimary = true;
                    this.connectionHandlers.delete(this.connectionId);
                    resolve(true);
                }
            }, 1000);
        });
    }

    /**
     * 廣播 SSE 訊息
     */
    broadcastSSEMessage(type: SSEMessage['type'], data?: any) {
        const message: SSEMessage = {
            type,
            data,
            timestamp: Date.now(),
            connectionId: this.connectionId
        };
        this.channel.postMessage(message);
    }

    /**
     * 註冊訊息處理器
     */
    onMessage(type: string, handler: (message: SSEMessage) => void) {
        this.messageHandlers.set(type, handler);
    }

    /**
     * 移除訊息處理器
     */
    offMessage(type: string) {
        this.messageHandlers.delete(type);
    }

    /**
     * 取得連線 ID
     */
    getConnectionId(): string {
        return this.connectionId;
    }

    /**
     * 檢查是否為主要連線
     */
    isPrimaryConnection(): boolean {
        return this.isPrimary;
    }

    /**
     * 關閉頻道
     */
    close() {
        if (this.elector) {
            this.elector.die();
        }
        this.channel.close();
    }
}
