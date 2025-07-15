import { useState, useCallback } from 'react';
import { useSSE } from './useSSE';

export interface UseSSEConnectionReturn {
  isConnecting: boolean;
  connect: (userId: string) => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
}

export const useSSEConnection = (): UseSSEConnectionReturn => {
  const { connect: sseConnect, disconnect: sseDisconnect, isConnected } = useSSE();
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async (userId: string) => {
    setIsConnecting(true);
    try {
      await sseConnect(userId);
    } finally {
      setIsConnecting(false);
    }
  }, [sseConnect]);

  const disconnect = useCallback(() => {
    sseDisconnect();
  }, [sseDisconnect]);

  return {
    isConnecting,
    connect,
    disconnect,
    isConnected,
  };
};
