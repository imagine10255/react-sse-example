import { useMemo } from 'react';
import { useSSE } from './useSSE';

export interface UseSSEMessagesReturn {
  pingMessages: string[];
  customMessages: string[];
  notificationMessages: string[];
  connectedUsers: string[];
  refreshConnectedUsers: () => Promise<void>;
}

export const useSSEMessages = (): UseSSEMessagesReturn => {
  const {
    pingList,
    customList,
    notifications,
    connectedUsers,
    refreshConnectedUsers
  } = useSSE();

  const pingMessages = useMemo(() => pingList, [pingList]);
  const customMessages = useMemo(() => customList, [customList]);
  const notificationMessages = useMemo(() => notifications, [notifications]);


  return {
    pingMessages,
    customMessages,
    notificationMessages,
    connectedUsers,
    refreshConnectedUsers,
  };
};
