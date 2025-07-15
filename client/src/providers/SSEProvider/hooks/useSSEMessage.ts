import { useState, useCallback } from 'react';
import { useSSE } from './useSSE';

export interface UseSSEMessageReturn {
  isSending: boolean;
  sendMessage: (userId: string, message: string, eventType: 'notification' | 'custom') => Promise<void>;
  broadcastMessage: (message: string) => Promise<void>;
}

export const useSSEMessage = (): UseSSEMessageReturn => {
  const { sendMessage: sseSendMessage, broadcastMessage: sseBroadcastMessage } = useSSE();
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(async (userId: string, message: string, eventType: 'notification' | 'custom') => {
    setIsSending(true);
    try {
      await sseSendMessage(userId, message, eventType);
    } finally {
      setIsSending(false);
    }
  }, [sseSendMessage]);

  const broadcastMessage = useCallback(async (message: string) => {
    setIsSending(true);
    try {
      await sseBroadcastMessage(message);
    } finally {
      setIsSending(false);
    }
  }, [sseBroadcastMessage]);

  return {
    isSending,
    sendMessage,
    broadcastMessage,
  };
};
