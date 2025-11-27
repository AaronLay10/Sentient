import { useEffect, useRef, useState, useCallback } from 'react';
import type { DomainEvent, WebSocketMessage } from '../types/events';

interface UseWebSocketOptions {
  url: string;
  roomId?: string;
  onEvent?: (event: DomainEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    roomId,
    onEvent,
    onConnect,
    onDisconnect,
    reconnectInterval = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<DomainEvent | null>(null);
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  const isCleaningUpRef = useRef(false);

  const connect = useCallback(() => {
    try {
      const wsUrl = roomId ? `${url}?room_id=${roomId}` : url;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        onConnect?.();

        // Subscribe to room if provided
        if (roomId) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            room_id: roomId,
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'event_notification' && message.data) {
            setLastEvent(message.data);
            setEvents((prev) => [message.data!, ...prev].slice(0, 100));
            onEvent?.(message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        // Suppress errors during React StrictMode cleanup
        if (!isCleaningUpRef.current) {
          console.error('WebSocket error:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        onDisconnect?.();
        wsRef.current = null;

        // Don't reconnect if we're in cleanup phase
        if (!isCleaningUpRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [url, roomId, onEvent, onConnect, onDisconnect, reconnectInterval]);

  useEffect(() => {
    isCleaningUpRef.current = false;
    connect();

    return () => {
      isCleaningUpRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // Only close if not already closing/closed to avoid browser errors
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
      }
    };
  }, [connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    isConnected,
    lastEvent,
    events,
    clearEvents,
  };
}
