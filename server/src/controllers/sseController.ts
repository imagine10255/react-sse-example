import { Request, Response } from 'express';
import { formatDateTime } from '../utils';

// 儲存所有 SSE 連接，以用戶 ID 為 key
const sseConnections = new Map<string, Response>();

export function notifyUser(req: Request, res: Response) {
    const { userId, message, eventType = 'notification' } = req.body;
    if (!userId || !message) {
        return res.status(400).json({
            success: false,
            message: '需要提供 userId 和 message',
        });
    }
    const userConnection = sseConnections.get(userId);
    if (!userConnection) {
        return res.json({
            success: false,
            message: `用戶 ${userId} 未連接`,
            data: { userId, message, eventType },
        });
    }
    try {
        userConnection.write(`event: ${eventType}\n`);
        userConnection.write(
            `data: ${JSON.stringify({
                type: eventType,
                message,
                timestamp: new Date().toISOString(),
                formattedTime: formatDateTime(new Date()),
            })}\n\n`
        );
        return res.json({
            success: true,
            message: `已向用戶 ${userId} 發送通知`,
            data: { userId, message, eventType },
        });
    } catch (error: any) {
        console.log('發送 SSE 訊息時發生錯誤:', error.message);
        sseConnections.delete(userId);
        return res.json({
            success: false,
            message: `用戶 ${userId} 連接已斷開`,
            data: { userId, message, eventType },
        });
    }
}

export function triggerAll(req: Request, res: Response) {
    const { message = '預設訊息', eventType = 'notification' } = req.body;
    let successCount = 0;
    let failCount = 0;
    sseConnections.forEach((clientRes, userId) => {
        try {
            clientRes.write(`event: ${eventType}\n`);
            clientRes.write(
                `data: ${JSON.stringify({
                    type: eventType,
                    message,
                    timestamp: new Date().toISOString(),
                    formattedTime: formatDateTime(new Date()),
                })}\n\n`
            );
            successCount++;
        } catch (error: any) {
            console.log(`發送 SSE 訊息給用戶 ${userId} 時發生錯誤:`, error.message);
            sseConnections.delete(userId);
            failCount++;
        }
    });
    res.json({
        success: true,
        message: `已向 ${successCount} 個用戶發送通知，${failCount} 個連接失敗`,
        data: { message, eventType, successCount, failCount },
    });
}

export function getUsers(req: Request, res: Response) {
    const users = Array.from(sseConnections.keys());
    res.json({
        success: true,
        message: `當前有 ${users.length} 個用戶連接`,
        data: { users, count: users.length },
    });
}

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