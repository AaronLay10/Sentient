import { useEffect, useRef, useState, useCallback } from 'react';
import type { DomainEvent, WebSocketMessage } from '../types/events';
import { getAuthToken } from '../components/ProtectedRoute';

interface UseWebSocketOptions {
  url: string;
  roomId?: string;
  onEvent?: (event: DomainEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    roomId,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<DomainEvent | null>(null);
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  const isCleaningUpRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);

  // Use refs for callbacks to avoid reconnection loops
  const onEventRef = useRef(options.onEvent);
  const onConnectRef = useRef(options.onConnect);
  const onDisconnectRef = useRef(options.onDisconnect);

  // Update refs when callbacks change (without triggering reconnect)
  useEffect(() => {
    onEventRef.current = options.onEvent;
  }, [options.onEvent]);

  useEffect(() => {
    onConnectRef.current = options.onConnect;
  }, [options.onConnect]);

  useEffect(() => {
    onDisconnectRef.current = options.onDisconnect;
  }, [options.onDisconnect]);

  const connect = useCallback(() => {
    // Prevent connection if already connected or connecting
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Check max reconnect attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error(`WebSocket connection failed: Max reconnect attempts (${maxReconnectAttempts}) reached`);
      return;
    }

    try {
      // Build WebSocket URL with auth token and optional room_id
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (token) params.set('token', token);
      if (roomId) params.set('room_id', roomId);
      const queryString = params.toString();
      const wsUrl = queryString ? `${url}?${queryString}` : url;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        setIsConnected(true);
        onConnectRef.current?.();

        // Subscribe to room if provided
        if (roomId) {
          ws.send(JSON.stringify({
            action: 'subscribe',
            channels: [`room:${roomId}`],
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'event_notification' && message.data) {
            const isAck = message.data.metadata?.is_acknowledgement === true;

            if (isAck) {
              console.log('📨 WebSocket ACK received:', {
                device_id: message.data.device_id,
                event_type: message.data.type,
                is_ack: true
              });
            }

            // Call onEvent FIRST for time-critical events (ACKs)
            // This bypasses React state batching for immediate processing
            onEventRef.current?.(message.data);

            // Then update state for UI display (can be deferred)
            setLastEvent(message.data);
            setEvents((prev) => [message.data!, ...prev].slice(0, 20));
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
        onDisconnectRef.current?.();
        wsRef.current = null;

        // Don't reconnect if we're in cleanup phase
        if (!isCleaningUpRef.current) {
          reconnectAttemptsRef.current++;

          // Exponential backoff: increase delay with each attempt
          const backoffDelay = Math.min(
            reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1),
            30000 // Max 30 second delay
          );

          console.log(`WebSocket connection failed: Connection failed: Attempting reconnect ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${Math.round(backoffDelay)}ms`);

          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, backoffDelay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [url, roomId, reconnectInterval, maxReconnectAttempts]);

  useEffect(() => {
    isCleaningUpRef.current = false;
    reconnectAttemptsRef.current = 0;
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
