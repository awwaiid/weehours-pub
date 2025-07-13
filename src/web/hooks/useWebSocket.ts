import { useEffect, useRef, useState, useCallback } from 'react';
import { getWebSocketUrl } from '../lib/api';

interface UseWebSocketOptions {
  sessionId: string;
  onMessage?: (data: any) => void;
  onStatusChange?: (connected: boolean) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempt: number;
  lastError?: string;
}

export const useWebSocket = ({
  sessionId,
  onMessage,
  onStatusChange,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10
}: UseWebSocketOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempt: 0
  });

  const updateState = useCallback((updates: Partial<WebSocketState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      if (prev.isConnected !== newState.isConnected && onStatusChange) {
        onStatusChange(newState.isConnected);
      }
      return newState;
    });
  }, [onStatusChange]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      return; // Already connecting
    }

    updateState({ isConnecting: true, lastError: undefined });

    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      const connectTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          updateState({ 
            isConnecting: false, 
            lastError: 'Connection timeout' 
          });
          scheduleReconnect();
        }
      }, 10000); // 10 second timeout

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        console.log('WebSocket connected');
        reconnectAttemptRef.current = 0;
        updateState({ 
          isConnected: true, 
          isConnecting: false, 
          reconnectAttempt: 0,
          lastError: undefined
        });
        
        // Authenticate with the server
        ws.send(JSON.stringify({ 
          type: 'authenticate', 
          sessionId 
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'authenticated') {
            console.log('WebSocket authenticated for session:', data.sessionId);
          }
          
          if (onMessage) {
            onMessage(data);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectTimeout);
        console.log('WebSocket closed:', event.code, event.reason);
        
        updateState({ 
          isConnected: false, 
          isConnecting: false,
          lastError: event.reason || `Connection closed (${event.code})`
        });

        // Only attempt to reconnect if we should and it wasn't a clean close
        if (shouldReconnectRef.current && event.code !== 1000) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectTimeout);
        console.error('WebSocket error:', error);
        updateState({ 
          isConnecting: false,
          lastError: 'Connection error'
        });
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      updateState({ 
        isConnecting: false,
        lastError: 'Failed to create connection'
      });
      scheduleReconnect();
    }
  }, [sessionId, onMessage, updateState]);

  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current) {
      return;
    }

    if (reconnectAttemptRef.current >= maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      updateState({ 
        lastError: `Max reconnect attempts reached (${maxReconnectAttempts})`
      });
      return;
    }

    reconnectAttemptRef.current++;
    
    // Exponential backoff with jitter
    const baseDelay = reconnectInterval;
    const exponentialDelay = baseDelay * Math.pow(2, reconnectAttemptRef.current - 1);
    const jitter = Math.random() * 1000;
    const delay = Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds

    console.log(`Scheduling reconnect attempt ${reconnectAttemptRef.current} in ${Math.round(delay)}ms`);
    
    updateState({ 
      reconnectAttempt: reconnectAttemptRef.current
    });

    clearReconnectTimeout();
    reconnectTimeoutRef.current = setTimeout(() => {
      if (shouldReconnectRef.current) {
        connect();
      }
    }, delay);
  }, [connect, reconnectInterval, maxReconnectAttempts, updateState, clearReconnectTimeout]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimeout();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    updateState({ 
      isConnected: false, 
      isConnecting: false,
      reconnectAttempt: 0,
      lastError: undefined
    });
  }, [clearReconnectTimeout, updateState]);

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    shouldReconnectRef.current = true;
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    connect();
  }, [connect]);

  // Handle page visibility changes (sleep/wake)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldReconnectRef.current) {
        // Page became visible, check connection
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log('Page visible and WebSocket not connected, reconnecting...');
          reconnect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reconnect]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('Browser back online, checking WebSocket connection...');
      if (shouldReconnectRef.current && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
        reconnect();
      }
    };

    const handleOffline = () => {
      console.log('Browser went offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reconnect]);

  // Initial connection and cleanup
  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    reconnect,
    disconnect
  };
};