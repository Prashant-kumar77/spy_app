import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  connect: () => void;
  disconnect: () => void;
  addMessageHandler: (handler: (message: WebSocketMessage) => void) => void;
  removeMessageHandler: (handler: (message: WebSocketMessage) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  url = 'wss://spy-backend-mb3i.onrender.com',
  autoConnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageHandlersRef = useRef<Set<(message: WebSocketMessage) => void>>(new Set());

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        setReconnectAttempts(0);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          message.timestamp = Date.now();
          setLastMessage(message);
          
          // Log ROOM_STATE messages specifically
          if (message.type === 'ROOM_STATE') {
            console.log('ROOM_STATE received:', message);
          }
          
          // Notify all registered handlers
          messageHandlersRef.current.forEach(handler => {
            try {
              handler(message);
            } catch (error) {
              console.error('Error in message handler:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect if it wasn't a manual disconnect
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          console.log(`Attempting to reconnect... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          setReconnectAttempts(prev => prev + 1);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setConnectionStatus('error');
          console.error('Max reconnection attempts reached');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionStatus('error');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setReconnectAttempts(0);
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        console.log('Message sent:', message);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', message);
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    sendMessage,
    lastMessage,
    connectionStatus,
    connect,
    disconnect,
    addMessageHandler: (handler) => messageHandlersRef.current.add(handler),
    removeMessageHandler: (handler) => messageHandlersRef.current.delete(handler),
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Hook for subscribing to specific message types
export const useWebSocketMessage = (
  messageType: string,
  handler: (message: WebSocketMessage) => void,
  deps: any[] = []
) => {
  const { isConnected, addMessageHandler, removeMessageHandler } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    const messageHandler = (message: WebSocketMessage) => {
      if (message.type === messageType) {
        handler(message);
      }
    };

    addMessageHandler(messageHandler);

    return () => {
      removeMessageHandler(messageHandler);
    };
  }, [isConnected, messageType, ...deps]);
};

// Hook for sending messages with automatic retry
export const useWebSocketSend = () => {
  const { sendMessage, isConnected } = useWebSocket();

  const sendWithRetry = (message: WebSocketMessage, maxRetries = 3, delay = 1000) => {
    let retries = 0;

    const attemptSend = () => {
      if (isConnected) {
        sendMessage(message);
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(attemptSend, delay * retries);
      } else {
        console.error('Failed to send message after maximum retries:', message);
      }
    };

    attemptSend();
  };

  return { sendMessage, sendWithRetry };
};
