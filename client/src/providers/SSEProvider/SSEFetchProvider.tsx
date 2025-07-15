import React, {useState, useCallback, useEffect} from 'react';
import {toast} from '@acrool/react-toaster';
import {SSEContext, SSEContextType, SSEFetchState} from './sseContext';
import logger from "@acrool/js-logger";
import {api} from "@/providers/SSEProvider/api";

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
export const SSEFetchProvider = ({children}: IProps) => {
    const [state, setState] = useState<SSEFetchState>({
        isConnected: false,
        pingList: [],
        customList: [],
        notifications: [],
        connectedUsers: [],
        sseSource: null,
        abortController: null,
    });


    useEffect(() => {
        logger.success('Fetch Mode');
    }, []);

    useEffect(() => {
        const closeConnection = () => {
            if (state.abortController) {
                state.abortController.abort();
            }
        };

        window.addEventListener('beforeunload', closeConnection);

        return () => {
            window.removeEventListener('beforeunload', closeConnection);
            closeConnection();
        };
    }, [state.abortController]);


    /**
     * 重新取得連線中的User
     */
    const refreshConnectedUsers = useCallback(async () => {
        try {
            const response = await fetch(api.users);
            const result = await response.json();
            console.log('連接用戶列表:', result);
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


    /**
     * 連線
     */
    const connect = useCallback(async (userId: string) => {
        if (!userId) {
            toast.error('請先輸入UserId');
            return;
        }

        if (state.sseSource) {
            toast.error('建立新連線前，請先斷開連線');
            return;
        }

        const controller = new AbortController();
        setState(prev => ({...prev, abortController: controller, isConnected: true}));

        try {
            const response = await fetch(`${api.sse}?userId=${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${userId}`,
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                },
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            setState(prev => ({
                ...prev,
                pingList: ['已建立連線，準備傳輸數據...'],
                sseSource: reader
            }));

            await refreshConnectedUsers();

            // 處理流式數據
            const processStream = async () => {
                try {
                    while (true) {
                        const {done, value} = await reader.read();

                        if (done) {
                            console.log('Stream complete');
                            break;
                        }

                        const chunk = new TextDecoder().decode(value);
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('event: ')) {
                                const eventType = line.substring(7);
                                continue;
                            }

                            if (line.startsWith('data: ')) {
                                const data = line.substring(6);

                                if (data.includes('"type":"connected"')) {
                                    const parsedData = JSON.parse(data);
                                    setState(prev => ({
                                        ...prev,
                                        pingList: [...prev.pingList, `連線確認: ${parsedData.message}`]
                                    }));
                                } else if (data.includes('"type":"ping"')) {
                                    setState(prev => ({
                                        ...prev,
                                        pingList: [...prev.pingList, data]
                                    }));
                                } else if (data.includes('"type":"custom"')) {
                                    const parsedData = JSON.parse(data);
                                    setState(prev => ({
                                        ...prev,
                                        customList: [...prev.customList, `${parsedData.message} (${parsedData.timestamp})`]
                                    }));
                                } else if (data.includes('"type":"notification"')) {
                                    const parsedData = JSON.parse(data);
                                    setState(prev => ({
                                        ...prev,
                                        notifications: [...prev.notifications, `${parsedData.message} (${parsedData.timestamp})`]
                                    }));
                                }
                            }
                        }
                    }
                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        console.log('Stream aborted');
                    } else {
                        console.error('Stream processing error:', error);
                    }
                }
            };

            processStream();
        } catch (error) {
            console.error('Connection Error:', error);
            toast.error('連接失敗，請檢查伺服器狀態');
            setState(prev => ({
                ...prev,
                isConnected: false,
                abortController: null
            }));
        }
    }, [state.sseSource, refreshConnectedUsers]);


    /**
     * 斷開連線
     */
    const disconnect = useCallback(() => {
        if (state.abortController) {
            state.abortController.abort();
            setState(prev => ({
                ...prev,
                abortController: null,
                sseSource: null,
                isConnected: false,
                pingList: ['已關閉連線']
            }));
        } else {
            toast.error('當前無連接');
        }
    }, [state.abortController]);


    /**
     * 發送訊息
     */
    const sendMessage = useCallback(async (userId: string, message: string, eventType: 'notification' | 'custom') => {
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
            console.error('個別通知失敗:', error);
            toast.error('個別通知失敗，請檢查伺服器狀態');
        }
    }, []);


    /**
     * 發送 Type 為 notification
     */
    const broadcastMessage = useCallback(async (message: string) => {
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

