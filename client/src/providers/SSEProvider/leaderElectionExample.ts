import { BroadcastChannel, createLeaderElection } from 'broadcast-channel';

/**
 * 使用 broadcast-channel 套件的 createLeaderElection 範例
 */
export class LeaderElectionExample {
    private channel: BroadcastChannel<string>;
    private elector: any;

    constructor(channelName: string = 'leader-election-example') {
        // 創建 BroadcastChannel
        this.channel = new BroadcastChannel(channelName);
        
        // 創建 Leader Election
        this.elector = createLeaderElection(this.channel);
        
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // 監聽選舉事件
        this.elector.onduplicate = () => {
            console.log('[Leader Election] 檢測到重複的領導者');
        };

        this.elector.onresolve = () => {
            console.log('[Leader Election] 選舉完成');
        };

        // 監聽頻道訊息
        this.channel.onmessage = (message) => {
            console.log('[BroadcastChannel] 收到訊息:', message);
        };
    }

    /**
     * 等待成為 Leader
     */
    async awaitLeadership(): Promise<void> {
        try {
            await this.elector.awaitLeadership();
            console.log('[Leader Election] 成為 Leader');
        } catch (error) {
            console.error('[Leader Election] 等待領導權失敗:', error);
            throw error;
        }
    }

    /**
     * 檢查是否為 Leader
     */
    isLeader(): boolean {
        return this.elector.hasLeadership;
    }

    /**
     * 發送訊息到所有頁籤
     */
    broadcastMessage(message: string): void {
        this.channel.postMessage(message);
    }

    /**
     * 關閉連接
     */
    close(): void {
        if (this.elector) {
            this.elector.die();
        }
        this.channel.close();
    }
}

/**
 * 使用範例
 */
export const createLeaderElectionExample = () => {
    const leaderElection = new LeaderElectionExample();
    
    // 等待成為 Leader
    leaderElection.awaitLeadership().then(() => {
        console.log('已成為 Leader，可以開始工作');
        
        // 發送訊息到其他頁籤
        leaderElection.broadcastMessage('Hello from Leader!');
    }).catch((error) => {
        console.error('成為 Leader 失敗:', error);
    });

    return leaderElection;
}; 