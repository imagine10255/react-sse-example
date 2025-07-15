import { Request, Response } from 'express';
import { formatDateTime } from '../utils';
import {CHANNEL_ALL, CHANNEL_USER, redisPub, sseConnections} from '../redis';



/**
 * SSE連線
 * @param req
 * @param res
 */
export function sseHandler(req: Request, res: Response) {
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
    console.log(`用戶 ${userId} 建立 SSE 連接`);
    res.set({
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
    });
    res.flushHeaders();
    sseConnections.set(userId as string, res);
    let shouldStop = false;
    res.on('close', () => {
        console.log(`用戶 ${userId} 已斷開連接`);
        shouldStop = true;
        sseConnections.delete(userId as string);

        // 新增：通知所有人有新用戶連入
        redisPub.publish(CHANNEL_ALL, JSON.stringify({
            eventType: 'user-leave',
            data: {
                type: 'user-leave',
                userId,
                message: `用戶 ${userId} 已斷開連接`,
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
            message: `用戶 ${userId} SSE 連接已建立`,
            userId,
            timestamp: new Date().toISOString(),
            formattedTime: formatDateTime(new Date()),
        })}\n\n`
    );


    // 新增：通知所有人有新用戶連入
    redisPub.publish(CHANNEL_ALL, JSON.stringify({
        eventType: 'user-joined',
        data: {
            type: 'user-joined',
            userId,
            message: `用戶 ${userId} 已連線`,
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
            console.log(`發送 ping 給用戶 ${userId} 時發生錯誤:`, error.message);
            clearInterval(pingInterval);
            sseConnections.delete(userId as string);
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
export function notifyUser(req: Request, res: Response) {
    const { userId, message, eventType = 'notification' } = req.body;
    if (!userId || !message) {
        return res.status(400).json({
            success: false,
            message: '需要提供 userId 和 message',
        });
    }
    // 改為發送到 Redis channel
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
        message: `已向用戶 ${userId} 發送通知（經由 Redis）`,
        data: { userId, message, eventType },
    });
}

/**
 * 廣播所有人
 * @param req
 * @param res
 */
export function triggerAll(req: Request, res: Response) {
    const { message = '預設訊息', eventType = 'notification' } = req.body;
    // 改為發送到 Redis channel
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
        message: `已廣播通知（經由 Redis）`,
        data: { message, eventType },
    });
}




/**
 * 取得目前所有使用者
 * @param req
 * @param res
 */
export function getUsers(req: Request, res: Response) {
    const users = Array.from(sseConnections.keys());
    res.json({
        success: true,
        message: `當前有 ${users.length} 個用戶連接`,
        data: { users, count: users.length },
    });
}

