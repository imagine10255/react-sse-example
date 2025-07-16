import { Request, Response } from 'express';
import { formatDateTime } from '../utils';
import {CHANNEL_ALL, CHANNEL_USER, redisPub, sseConnections, addOnlineUser, removeOnlineUser, getOnlineUsers} from '../redis';

interface IRoute {
    method: 'get'|'post',
    func: (req: Request, res: Response) => Promise<unknown>
}

export const SSEController: Record<string, IRoute> = {
    '/subscribe': {method: 'get', func: Subscribe},
    '/users': {method: 'get', func: getUsers},
    '/sendUser': {method: 'post', func: sendUser},
    '/broadcastAll': {method: 'post', func: broadcastAll},
}

/**
 * SSE連線
 * @param req
 * @param res
 */
async function Subscribe(req: Request, res: Response) {
    const { userId } = req.query as { userId?: string };
    const authHeader = req.headers.authorization;
    let headerUserId: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        headerUserId = authHeader.substring(7);
    }
    const authUserId = userId || headerUserId;
    if (!authUserId) {
        console.log('身份驗證失敗:', { userId, headerUserId });
        res.status(401).send('身份驗證失敗');
        return;
    }

    console.log(`用戶 ${authUserId} 建立 SSE 連接`);

    // 將用戶加入線上列表
    await addOnlineUser(authUserId);

    res.set({
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
    });
    res.flushHeaders();

    // 儲存連接用於發送訊息
    sseConnections.set(authUserId, res);

    let shouldStop = false;
    res.on('close', async () => {
        console.log(`用戶 ${authUserId} 已斷開連接`);
        shouldStop = true;

        // 從連接 Map 中移除
        sseConnections.delete(authUserId);

        // 從線上列表中移除用戶
        await removeOnlineUser(authUserId);

        // 通知所有人有用戶離開
        redisPub.publish(CHANNEL_ALL, JSON.stringify({
            eventType: 'user-leave',
            data: {
                type: 'user-leave',
                userId: authUserId,
                message: `用戶 ${authUserId} 已斷開連接`,
                timestamp: new Date().toISOString(),
                formattedTime: formatDateTime(new Date()),
            },
        }));

        res.end();
    });

    res.write(`event: connected\n`);
    res.write(
        `data: ${JSON.stringify({
            type: 'connected',
            message: `用戶 ${authUserId} SSE 連接已建立`,
            userId: authUserId,
            timestamp: new Date().toISOString(),
            formattedTime: formatDateTime(new Date()),
        })}\n\n`
    );

    // 通知所有人有新用戶連入
    redisPub.publish(CHANNEL_ALL, JSON.stringify({
        eventType: 'user-joined',
        data: {
            type: 'user-joined',
            userId: authUserId,
            message: `用戶 ${authUserId} 已連線`,
            timestamp: new Date().toISOString(),
            formattedTime: formatDateTime(new Date()),
        },
    }));

    const pingInterval = setInterval(() => {
        if (shouldStop) {
            clearInterval(pingInterval);
            return;
        }
        try {
            res.write(`event: ping\n`);
            res.write(
                `data: ${JSON.stringify({
                    type: 'ping',
                    message: `Ping from server - ${formatDateTime(new Date())}`,
                    timestamp: new Date().toISOString(),
                    formattedTime: formatDateTime(new Date()),
                })}\n\n`
            );
        } catch (error: any) {
            console.log(`發送 ping 給用戶 ${authUserId} 時發生錯誤:`, error.message);
            clearInterval(pingInterval);
            sseConnections.delete(authUserId);
            removeOnlineUser(authUserId);
        }
    }, 30000);

    res.on('close', () => {
        clearInterval(pingInterval);
    });
    return;
}

/**
 * 通知一位使用者
 * @param req
 * @param res
 */
async function sendUser(req: Request, res: Response) {
    const { userId, message, eventType = 'notification' } = req.body;
    if (!userId || !message) {
        return res.status(400).json({
            success: false,
            message: '需要提供 userId 和 message',
        });
    }
    // 發送到 Redis channel
    redisPub.publish(CHANNEL_USER, JSON.stringify({
        userId,
        eventType,
        data: {
            type: eventType,
            message,
            timestamp: new Date().toISOString(),
            formattedTime: formatDateTime(new Date()),
        },
    }));
    return res.json({
        success: true,
        message: `已向用戶 ${userId} 發送通知`,
        data: { userId, message, eventType },
    });
}

/**
 * 廣播所有人
 * @param req
 * @param res
 */
async function broadcastAll(req: Request, res: Response) {
    const { message = '預設訊息', eventType = 'notification' } = req.body;
    // 發送到 Redis channel
    redisPub.publish(CHANNEL_ALL, JSON.stringify({
        eventType,
        data: {
            type: eventType,
            message,
            timestamp: new Date().toISOString(),
            formattedTime: formatDateTime(new Date()),
        },
    }));
    res.json({
        success: true,
        message: `已廣播通知`,
        data: { message, eventType },
    });
}

/**
 * 取得目前所有使用者
 * @param req
 * @param res
 */
async function getUsers(req: Request, res: Response) {
    const users = await getOnlineUsers();
    res.json({
        success: true,
        message: `當前有 ${users.length} 個用戶連接`,
        data: { users, count: users.length },
    });
}

