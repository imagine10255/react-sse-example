import { SSEBroadcastChannel } from './broadcastChannel';

// 簡單的測試函數
export const testBroadcastChannel = async () => {
    console.log('開始測試 BroadcastChannel...');
    
    const channel1 = new SSEBroadcastChannel('test-channel');
    const channel2 = new SSEBroadcastChannel('test-channel');
    
    // 測試連線請求
    const isPrimary1 = await channel1.requestConnection('user1');
    const isPrimary2 = await channel2.requestConnection('user2');
    
    console.log('Channel 1 is primary:', isPrimary1);
    console.log('Channel 2 is primary:', isPrimary2);
    
    // 測試訊息廣播
    let receivedMessage = false;
    channel2.onMessage('test', (message) => {
        console.log('Channel 2 收到訊息:', message);
        receivedMessage = true;
    });
    
    channel1.broadcastSSEMessage('test', { message: 'Hello from Channel 1' });
    
    // 清理
    setTimeout(() => {
        channel1.close();
        channel2.close();
        console.log('BroadcastChannel 測試完成');
    }, 1000);
}; 