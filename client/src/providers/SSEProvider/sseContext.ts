import {createContext} from "react";


export interface BaseSSEState {
    isConnected: boolean;
    pingList: string[];
    customList: string[];
    notifications: string[];
    connectedUsers: string[];
    isPrimaryConnection: boolean; // 是否為主要連線（第一個建立的連線）
    connectionId: string | null; // 連線識別碼
    isLeader: boolean; // 是否為 Leader
    leaderId: string | null; // 當前 Leader ID
    electionInProgress: boolean; // 選舉進行中
}

export interface SSEFetchState extends BaseSSEState{
    sseSource: ReadableStreamDefaultReader<Uint8Array> | null;
    abortController: AbortController | null;
}


export interface SSEEventState extends BaseSSEState {
    eventSource: EventSource | null;
}

export interface SSEContextType extends BaseSSEState {
    connect: (userId: string) => Promise<void>;
    disconnect: () => void;
    sendMessage: (userId: string, message: string, eventType: 'notification' | 'custom') => Promise<void>;
    broadcastMessage: (message: string) => Promise<void>;
    refreshConnectedUsers: () => Promise<void>;
}

export const SSEContext = createContext<SSEContextType | undefined>(undefined);
