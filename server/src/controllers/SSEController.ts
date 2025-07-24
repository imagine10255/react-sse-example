import { Request, Response } from 'express';
import { formatDateTime } from '../utils';
import {
    HEARTBEAT_INTERVAL,
    sseConnections, TSSEConnections,
} from '../config';
import {ulid} from "ulid";

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

type TMessageData = {
    type?: 'notification' | 'custom',
    message: string
}

/**
 * 統一發送訊息 (格式化過)
 * @param userConnection
 * @param event
 * @param data
 */
function sendFormatMessage(userConnection: Response , event: 'connected'|'ping'|'message', data: TMessageData ) {
    const messageContent = {
        type: data.type,
        message: data.message,
        createdAt: formatDateTime(new Date()),
    };


    const sendData = [
        `id: ${ulid()}`,
        `event: ${event}`,
        `data: ${JSON.stringify(messageContent)}`,
    ]
    userConnection.write(`${sendData.join('\n')}\n\n`);
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

    res.set({
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
    });
    res.flushHeaders();

    // 儲存連接用於發送訊息
    sseConnections.set(authUserId, res);




    res.on('close', async () => {
        console.log(`用戶 ${authUserId} 已斷開連接`);
        clearInterval(pingInterval);

        // 從連接 Map 中移除
        sseConnections.delete(authUserId);
        // 從線上列表中移除用戶
        res.end();
    });

    sendFormatMessage(res, 'connected', {type: 'notification', message: `用戶 ${authUserId} SSE 連接已建立`} );


    const pingInterval = setInterval(async () => {
        try {

            sendFormatMessage(res, 'ping', {type: 'notification', message: `Ping from server`} );

        } catch (error: any) {
            console.log(`發送 ping 給用戶 ${authUserId} 時發生錯誤:`, error.message);
            clearInterval(pingInterval);
            sseConnections.delete(authUserId);
        }
    }, HEARTBEAT_INTERVAL);


    return;
}


/**
 * 用戶發送訊息時同時更新活動狀態
 */
async function sendUser(req: Request, res: Response) {
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
        sendFormatMessage(userConnection, 'message', {message, type: eventType})

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




/**
 * 廣播所有人
 */
async function broadcastAll(req: Request, res: Response) {
    const { message = '預設訊息', eventType = 'notification' } = req.body;
    let successCount = 0;
    let failCount = 0;

    sseConnections.forEach((clientRes, userId) => {
        try {
            sendFormatMessage(clientRes, 'message', {message, type: eventType})

            // clientRes.write(`event: ${eventType}\n`);
            // clientRes.write(
            //     `data: ${JSON.stringify({
            //         type: eventType,
            //         message,
            //         timestamp: new Date().toISOString(),
            //         formattedTime: formatDateTime(new Date()),
            //     })}\n\n`
            // );
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



/**
 * 取得目前所有使用者
 */
async function getUsers(req: Request, res: Response) {
    const users = Array.from(sseConnections.keys());
    res.json({
        success: true,
        message: `當前有 ${users.length} 個用戶連接`,
        data: { users, count: users.length },
    });
}


/**
 * 強制清理離線用戶
 */
// async function forceCleanup(req: Request, res: Response) {
//     await cleanupOfflineUsers();
//     res.json({
//         success: true,
//         message: '已強制清理離線用戶',
//     });
// }

