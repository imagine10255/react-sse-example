import { Response } from 'express';

export type TSSEConnections = Map<string, Response>;

// 儲存所有 SSE 連接，以用戶 ID 為 key
export const sseConnections: TSSEConnections = new Map<string, Response>();


export const HEARTBEAT_INTERVAL = 30000; // 30 秒
