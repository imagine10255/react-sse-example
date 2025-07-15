import {baseApiUrl} from "@/providers/SSEProvider/config";
import { toast } from "@acrool/react-toaster";

export const api = {
    sse: `${baseApiUrl}/sse`,
    notifyUser: `${baseApiUrl}/notifyUser`,
    trigger: `${baseApiUrl}/trigger`,
    users: `${baseApiUrl}/users`,
}




export interface SetStateFunction {
    (callback: (prev: any) => any): void;
}

/**
 * 重新取得連線中的User
 */
export async function refreshConnectedUsersApi(setState: SetStateFunction) {
    try {
        const response = await fetch(api.users);
        const result = await response.json();
        if (result.success) {
            setState((prev: any) => ({
                ...prev,
                connectedUsers: result.data.users
            }));
        }
    } catch (error) {
        toast.error(`獲取用戶列表失敗: ${(error as any).message}`);
    }
}

/**
 * 發送訊息
 */
export async function sendMessageApi(userId: string, message: string, eventType: 'notification' | 'custom') {
    try {
        const response = await fetch(api.notifyUser, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                message,
                eventType,
            })
        });
        const result = await response.json();

        if (result.success) {
            toast.success(`個別通知結果成功: ${result.message}`);
            return;
        }
        toast.error(`個別通知結果失敗: ${result.message}`);
    } catch (error) {
        toast.error(`個別通知失敗，請檢查伺服器狀態: ${(error as any).message}`);
    }
}

/**
 * 發送 Type 為 notification
 */
export async function broadcastMessageApi(message: string) {
    try {
        const response = await fetch(api.trigger, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                eventType: 'notification'
            })
        });
        const result = await response.json();
        toast.success(`發送成功: ${result.message}`);
    } catch (error) {
        toast.error(`發送失敗，請檢查伺服器狀態`);
    }
}
