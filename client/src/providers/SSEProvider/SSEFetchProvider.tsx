import React, {useState, useCallback, useEffect} from 'react';
import {toast} from '@acrool/react-toaster';
import {SSEContext, SSEContextType, SSEFetchState} from './sseContext';
import logger from "@acrool/js-logger";
import { useApi } from './useApi';
import {baseApi1Url} from "@/providers/SSEProvider/config";
import { decodeSSEMessage } from './utils';



interface IProps { children: React.ReactNode }


/**
 * SSE Provider (Fetch)
 * @param children
 */
export const SSEFetchProvider = ({children}: IProps) => {
    const { apiUrl, refreshConnectedUsersApi, sendMessageApi, broadcastMessageApi } = useApi(baseApi1Url);

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
        await refreshConnectedUsersApi(setState);
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
            const response = await fetch(`${apiUrl.subscribe}?userId=${userId}`, {
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
                            toast.error(`Stream complete`);
                            break;
                        }
                        const eventBuffer = decodeSSEMessage(value);

                        switch (eventBuffer.event) {
                            case 'connected':
                                setState(prev => ({
                                    ...prev,
                                    pingList: [...prev.pingList, `連線確認: ${eventBuffer.data?.message}`]
                                }));
                                break;

                            case 'ping':
                                setState(prev => ({
                                    ...prev,
                                    pingList: [...prev.pingList, `${eventBuffer.data?.message} (${eventBuffer.data?.createdAt})`]
                                }));
                                break;

                            case 'user-joined':
                            case 'user-leave':
                                refreshConnectedUsers();
                                break;

                            case 'message':
                                const messageType = eventBuffer.data?.type === 'custom'? 'customList': 'notifications';
                                setState(prev => ({
                                    ...prev,
                                    [messageType]: [...prev[messageType], `${eventBuffer.data?.message} (${eventBuffer.data?.createdAt})`]
                                }));
                                break;
                        }
                    }
                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        toast.error(`Stream aborted`);
                    } else {
                        toast.error(`Stream processing error: ${error.message}`);
                    }
                }
            };

            processStream();
        } catch (error) {
            toast.error(`連接失敗，請檢查伺服器狀態 ${(error as any).message}`);
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
        await sendMessageApi(userId, message, eventType);
    }, []);


    /**
     * 發送 Type 為 notification
     */
    const broadcastMessage = useCallback(async (message: string) => {
        await broadcastMessageApi(message);
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

