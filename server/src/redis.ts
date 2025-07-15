import Redis from 'ioredis';
import {Response} from "express";

export const redisPub = new Redis(); // publisher
export const redisSub = new Redis(); // subscriber



// 儲存所有 SSE 連接，以用戶 ID 為 key
export const sseConnections = new Map<string, Response>();

// 監聽 redis channel
export const CHANNEL_USER = 'sse-user';
export const CHANNEL_ALL = 'sse-all';

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
