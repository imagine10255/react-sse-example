import Redis from 'ioredis';
import { Response } from 'express';

export const redisPub = new Redis(); // publisher
export const redisSub = new Redis(); // subscriber

// 儲存所有 SSE 連接，以用戶 ID 為 key
export const sseConnections = new Map<string, Response>();

// 監聽 redis channel
export const CHANNEL_USER = 'sse-user';
export const CHANNEL_ALL = 'sse-all';

// Redis key 常數
export const ONLINE_USERS_KEY = 'online_users';

// 管理線上用戶的函數
export async function addOnlineUser(userId: string): Promise<void> {
    await redisPub.sadd(ONLINE_USERS_KEY, userId);
}

export async function removeOnlineUser(userId: string): Promise<void> {
    await redisPub.srem(ONLINE_USERS_KEY, userId);
}

export async function getOnlineUsers(): Promise<string[]> {
    return await redisPub.smembers(ONLINE_USERS_KEY);
}

export async function isUserOnline(userId: string): Promise<boolean> {
    const result = await redisPub.sismember(ONLINE_USERS_KEY, userId);
    return result === 1;
}

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
