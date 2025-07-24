import Redis from 'ioredis';
import { Response } from 'express';
import {formatDateTime} from "./utils";

export const redisPub = new Redis(); // publisher
export const redisSub = new Redis(); // subscriber

// 儲存所有 SSE 連接，以用戶 ID 為 key
export const sseConnections = new Map<string, Response>();

// 監聽 redis channel
export const CHANNEL_USER = 'sse-user';
export const CHANNEL_ALL = 'sse-all';

// Redis key 常數
export const ONLINE_USERS_KEY = 'online_users';
export const HEARTBEAT_KEY_PREFIX = 'heartbeat:';

// 心跳配置
export const HEARTBEAT_INTERVAL = 30000; // 30 秒
const HEARTBEAT_TTL = 90; // 90 秒 TTL（3 個心跳週期）

// 管理線上用戶的函數
export async function addOnlineUser(userId: string): Promise<void> {
    await redisPub.sadd(ONLINE_USERS_KEY, userId);
    // 設置初始心跳
    await setUserHeartbeat(userId);
    // 設置用戶活動狀態
    // await setUserActivity(userId);

    // 通知所有人有新用戶連入
    redisPub.publish(CHANNEL_ALL, JSON.stringify({
        eventType: 'user-joined',
        data: {
            type: 'user-joined',
            userId: userId,
            message: `用戶 ${userId} 已連線`,
            timestamp: new Date().toISOString(),
            formattedTime: formatDateTime(new Date()),
        },
    }));
}

export async function removeOnlineUser(userId: string): Promise<void> {
    await redisPub.srem(ONLINE_USERS_KEY, userId);
    // 清理心跳和活動記錄
    await redisPub.del(`${HEARTBEAT_KEY_PREFIX}${userId}`);
    // await redisPub.del(`${USER_ACTIVITY_KEY_PREFIX}${userId}`);


    // 通知所有人有用戶離開
    redisPub.publish(CHANNEL_ALL, JSON.stringify({
        eventType: 'user-leave',
        data: {
            type: 'user-leave',
            userId: userId,
            message: `用戶 ${userId} 已斷開連接`,
            timestamp: new Date().toISOString(),
            formattedTime: formatDateTime(new Date()),
        },
    }));
}

/**
 * 取得線上活躍使用者
 */
export async function getOnlineUsers(): Promise<string[]> {
    return redisPub.smembers(ONLINE_USERS_KEY);
}

// 設置用戶心跳
export async function setUserHeartbeat(userId: string): Promise<void> {
    const heartbeatKey = `${HEARTBEAT_KEY_PREFIX}${userId}`;
    await redisPub.set(heartbeatKey, Date.now().toString());
    await redisPub.expire(heartbeatKey, HEARTBEAT_TTL);
}

// 檢查用戶心跳是否活躍
export async function isUserHeartbeatActive(userId: string): Promise<boolean> {
    const heartbeatKey = `${HEARTBEAT_KEY_PREFIX}${userId}`;
    const heartbeat = await redisPub.get(heartbeatKey);
    return heartbeat !== null;
}

// 更新用戶心跳
export async function updateUserHeartbeat(userId: string): Promise<void> {
    await setUserHeartbeat(userId);
}

// 清理離線用戶（基於心跳檢測）
export async function cleanupOfflineUsers(): Promise<void> {
    const onlineUsers = await getOnlineUsers();
    const offlineUsers: string[] = [];

    for (const userId of onlineUsers) {
        // 檢查心跳是否活躍
        const hasActiveHeartbeat = await isUserHeartbeatActive(userId);

        // 如果沒有連接、心跳過期或活動過期，則認為用戶離線
        if (!hasActiveHeartbeat) {
            offlineUsers.push(userId);
        }
    }

    if (offlineUsers.length > 0) {
        await redisPub.srem(ONLINE_USERS_KEY, ...offlineUsers);
        console.log(`清理了 ${offlineUsers.length} 個離線用戶:`, offlineUsers);
    }
}

// 定期清理離線用戶（每 30 秒執行一次）
setInterval(async () => {
    try {
        await cleanupOfflineUsers();
    } catch (error) {
        console.error('清理離線用戶時發生錯誤:', error);
    }
}, 30000);




redisSub.subscribe(CHANNEL_USER, CHANNEL_ALL);
redisSub.on('message', (channel, message) => {
    try {
        const payload = JSON.parse(message);
        if (channel === CHANNEL_USER && payload.userId) {
            const userConnection = sseConnections.get(payload.userId);
            if (userConnection) {
                userConnection.write(`event: ${payload.eventType || 'notification'}\n`);
                userConnection.write(`data: ${JSON.stringify(payload.data)}\n\n`);
            }
        } else if (channel === CHANNEL_ALL) {
            sseConnections.forEach((clientRes) => {
                clientRes.write(`event: ${payload.eventType || 'notification'}\n`);
                clientRes.write(`data: ${JSON.stringify(payload.data)}\n\n`);
            });
        }
    } catch (e) {
        console.log('解析 Redis 訊息失敗:', e);
    }
});
