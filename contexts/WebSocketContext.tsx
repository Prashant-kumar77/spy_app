import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

const WS_URL = "wss://spy-backend-wss.onrender.com"; // Replace with your WebSocket server URL

interface WebSocketContextType {
  sendMessage: (message: string) => void;
  addMessageListener: (type: string, callback: (data: any) => void) => () => void;
  isConnected: boolean;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<WebSocket | null>(null);
  const messageListeners = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second
  const [, forceRender] = useState({}); // To trigger re-renders when needed
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN || 
        socketRef.current?.readyState === WebSocket.CONNECTING) {
      return; // Already connected or connecting
    }

    console.log(`Attempting to connect to WebSocket... (attempt ${reconnectAttemptsRef.current + 1})`);
    
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket Connected");
      setIsConnected(true);
      reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
    };

    ws.onclose = (event) => {
      console.log("WebSocket Disconnected", event.code, event.reason);
      setIsConnected(false);
      
      // Don't reconnect if it was a clean close (code 1000) or if we've exceeded max attempts
      if (event.code === 1000 || reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.log("WebSocket connection closed permanently or max reconnection attempts reached");
        return;
      }

      // Exponential backoff: delay = baseDelay * 2^attempts (capped at 30 seconds)
      const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;
      
      console.log(`Reconnecting in ${delay}ms...`);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error", error);
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type;
        // console.log("WebSocket Message", data);
        if (type && messageListeners.current.has(type)) {
          messageListeners.current.get(type)?.forEach(callback => callback(data));
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Don't close the WebSocket when component unmounts
      // Let it stay connected for navigation between screens
    };
  }, [connect]);

  const sendMessage = useCallback((message: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
    } else {
      console.warn("WebSocket is not connected. Message queued for when connection is restored.");
      // Optionally, you could queue messages here for when connection is restored
      // For now, we'll just log a warning
    }
  }, []);

  const addMessageListener = useCallback((type: string, callback: (data: any) => void) => {
    if (!messageListeners.current.has(type)) {
      messageListeners.current.set(type, new Set());
    }
    messageListeners.current.get(type)?.add(callback);

    // Force re-render to ensure components are aware of the updated listeners
    forceRender({});

    return () => {
      messageListeners.current.get(type)?.delete(callback);
      if (messageListeners.current.get(type)?.size === 0) {
        messageListeners.current.delete(type);
      }
      forceRender({});
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close(1000, "App closing");
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ sendMessage, addMessageListener, isConnected, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};