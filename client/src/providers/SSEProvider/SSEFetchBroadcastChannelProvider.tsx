import React, {useState, useCallback, useEffect, useRef} from 'react';
import {toast} from '@acrool/react-toaster';
import {SSEContext, SSEContextType, SSEFetchState} from './sseContext';
import logger from "@acrool/js-logger";
import { useApi } from './useApi';
import {baseApi1Url} from "@/providers/SSEProvider/config";
import { decodeSSEMessage } from './utils';
import { SSEBroadcastChannel } from './broadcastChannel';



interface IProps { children: React.ReactNode }


/**
 * SSE Provider (Fetch with BroadcastChannel)
 * @param children
 */
export const SSEFetchBroadcastChannelProvider = ({children}: IProps) => {
    const { apiUrl, refreshConnectedUsersApi, sendMessageApi, broadcastMessageApi } = useApi(baseApi1Url);
    const broadcastChannelRef = useRef<SSEBroadcastChannel>(new SSEBroadcastChannel());

    const [state, setState] = useState<SSEFetchState>({
        isConnected: false,
        pingList: [],
        customList: [],
        notifications: [],
        connectedUsers: [],
        sseSource: null,
        abortController: null,
        isPrimaryConnection: false,
        connectionId: null,
        isLeader: false,
        leaderId: null,
        electionInProgress: false,
    });


    useEffect(() => {
        logger.success('Fetch Mode with BroadcastChannel');

        // 初始化 BroadcastChannel

        // 註冊訊息處理器
        const channel = broadcastChannelRef.current;

        // 處理從其他頁籤接收到的 SSE 訊息
        channel.onMessage('connected', (message) => {
            setState(prev => ({
                ...prev,
                pingList: [...prev.pingList, `連線確認: ${message.data?.message} (來自其他頁籤)`]
            }));
        });

        channel.onMessage('ping', (message) => {
            setState(prev => ({
                ...prev,
                pingList: [...prev.pingList, `${message.data?.message} (${message.data?.createdAt}) (來自其他頁籤)`]
            }));
        });

        channel.onMessage('message', (message) => {
            const messageType = message.data?.type === 'custom' ? 'customList' : 'notifications';
            setState(prev => ({
                ...prev,
                [messageType]: [...prev[messageType], `${message.data?.message} (${message.data?.createdAt}) (來自其他頁籤)`]
            }));
        });

        channel.onMessage('user-joined', () => {
            refreshConnectedUsers();
        });

        channel.onMessage('user-leave', () => {
            refreshConnectedUsers();
        });

        return () => {
            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.close();
            }
        };
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


        if (!broadcastChannelRef.current) {
            toast.error('BroadcastChannel 未初始化');
            return;
        }
        // 使用 Leader Election 機制
        setState(prev => ({ ...prev, electionInProgress: true }));

        let isLeader = false;
        try {
            console.log('xxx00');
            isLeader = await broadcastChannelRef.current.createLeaderElection(userId);
            console.log('xxx11');

            setState(prev => ({
                ...prev,
                isLeader,
                leaderId: isLeader ? broadcastChannelRef.current?.getConnectionId() || null : null,
                electionInProgress: false,
                isPrimaryConnection: isLeader,
                connectionId: broadcastChannelRef.current?.getConnectionId() || null
            }));
        } catch (error) {
            setState(prev => ({ ...prev, electionInProgress: false }));
            toast.error('Leader Election 失敗');
            return;
        }
        console.log('xxx22');

        if (!isLeader) {
            // 如果不是 Leader，只更新狀態，不建立實際的 SSE 連線
            setState(prev => ({
                ...prev,
                isConnected: true,
                pingList: ['已連線（非 Leader，接收其他頁籤的訊息）']
            }));
            toast.info('已連線（非 Leader，接收其他頁籤的訊息）');
            return;
        }

        // 如果是主要連線，建立實際的 SSE 連線
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
                pingList: ['已建立主要連線，準備傳輸數據...'],
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

                        // 廣播訊息到其他頁籤
                        if (broadcastChannelRef.current && eventBuffer.event) {
                            broadcastChannelRef.current.broadcastSSEMessage(eventBuffer.event, eventBuffer.data);
                        }

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
            setState(prev => ({
                ...prev,
                isConnected: false,
                pingList: ['已關閉連線']
            }));
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

