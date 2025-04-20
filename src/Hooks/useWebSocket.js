import { useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import websocketService from '../api/websocketService';

export const useWebSocket = (messageHandlers = {}) => {
  const connectionStatus = useSelector(state => state.websocket.status);

  const sendMessage = useCallback((data) => {
    return websocketService.send(data);
  }, []);

  useEffect(() => {
    // Connect to WebSocket
    websocketService.connect();

    // Register message handlers
    Object.entries(messageHandlers).forEach(([type, handler]) => {
      websocketService.addMessageHandler(type, handler);
    });

    // Cleanup when unmounting
    return () => {
      Object.entries(messageHandlers).forEach(([type, handler]) => {
        websocketService.removeMessageHandler(type, handler);
      });
    };
  }, [messageHandlers]);

  return {
    connectionStatus,
    sendMessage,
    isConnected: connectionStatus === 'connected'
  };
};