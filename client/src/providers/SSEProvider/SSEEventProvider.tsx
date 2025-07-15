import React, {useState, useCallback, useEffect} from 'react';
import {toast} from '@acrool/react-toaster';
import {baseApiUrl} from "@/providers/SSEProvider/config";
import {SSEContext, SSEContextType, SSEEventState} from './sseContext';
import logger from "@acrool/js-logger";

export interface SSEMessage {
    type: 'connected' | 'ping' | 'custom' | 'notification';
    message: string;
    timestamp?: string;
}


interface IProps { children: React.ReactNode }

/**
 * SSE Provider
 * @param children
 */
export const SSEEventProvider = ({children}: IProps) => {
    const [state, setState] = useState<SSEEventState>({
        isConnected: false,
        pingList: [],
        customList: [],
        notifications: [],
        connectedUsers: [],
        eventSource: null,
    });

    useEffect(() => {
        logger.success('EventSource Mode');
    }, []);

    useEffect(() => {

        const closeConnection = () => {
            if (state.eventSource) {
                state.eventSource.close();
            }
        };
        window.addEventListener('beforeunload', closeConnection);
        return () => {
            window.removeEventListener('beforeunload', closeConnection);
            closeConnection();
        };
    }, [state.eventSource]);

    const refreshConnectedUsers = useCallback(async () => {
        try {
            const response = await fetch(`${baseApiUrl}/users`);
            const result = await response.json();
            if (result.success) {
                setState(prev => ({
                    ...prev,
                    connectedUsers: result.data.users
                }));
            }
        } catch (error) {
            console.error('獲取用戶列表失敗:', error);
        }
    }, []);

    // 連線
    const connect = useCallback(async (userId: string) => {
        if (!userId) {
            toast.error('請先輸入UserId');
            return;
        }
        if (state.eventSource) {
            toast.error('建立新連線前，請先斷開連線');
            return;
        }
        const es = new EventSource(`${baseApiUrl}/sse?userId=${userId}`);
        setState(prev => ({
            ...prev,
            eventSource: es,
            isConnected: true,
            pingList: ['已建立連線，準備傳輸數據...'],
        }));
        es.addEventListener('open', () => {
            refreshConnectedUsers();
        });
        es.addEventListener('error', (e) => {
            toast.error('連接失敗，請檢查伺服器狀態');
            setState(prev => ({
                ...prev,
                isConnected: false,
                eventSource: null,
            }));
            es.close();
        });
        es.addEventListener('connected', (e: MessageEvent) => {
            const data = JSON.parse(e.data);
            setState(prev => ({
                ...prev,
                pingList: [...prev.pingList, `連線確認: ${data.message}`]
            }));
        });
        es.addEventListener('ping', (e: MessageEvent) => {
            setState(prev => ({
                ...prev,
                pingList: [...prev.pingList, e.data]
            }));
        });
        es.addEventListener('custom', (e: MessageEvent) => {
            const data = JSON.parse(e.data);
            setState(prev => ({
                ...prev,
                customList: [...prev.customList, `${data.message} (${data.timestamp})`]
            }));
        });
        es.addEventListener('notification', (e: MessageEvent) => {
            const data = JSON.parse(e.data);
            setState(prev => ({
                ...prev,
                notifications: [...prev.notifications, `${data.message} (${data.timestamp})`]
            }));
        });
    }, [state.eventSource, refreshConnectedUsers]);

    // 斷開連線
    const disconnect = useCallback(() => {
        if (state.eventSource) {
            state.eventSource.close();
            setState(prev => ({
                ...prev,
                eventSource: null,
                isConnected: false,
                pingList: ['已關閉連線']
            }));
        } else {
            toast.error('當前無連接');
        }
    }, [state.eventSource]);


    /**
     * 發送訊息
     */
    const sendMessage = useCallback(async (userId: string, message: string, eventType: 'notification' | 'custom') => {
        try {
            const response = await fetch(`${baseApiUrl}/notifyUser`, {
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
            console.error('個別通知失敗:', error);
            toast.error('個別通知失敗，請檢查伺服器狀態');
        }
    }, []);


    /**
     * 發送 Type 為 notification
     */
    const broadcastMessage = useCallback(async (message: string) => {
        try {
            const response = await fetch(`${baseApiUrl}/trigger`, {
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
    }, []);




    const contextValue: SSEContextType = {
        ...state,
        connect,
        disconnect,
        sendMessage,
        broadcastMessage,
        refreshConnectedUsers,
    };

    return (
        <SSEContext.Provider value={contextValue}>
            {children}
        </SSEContext.Provider>
    );
};
