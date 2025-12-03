import { useEffect, useRef } from 'react';
import { useTopologyStore } from './useTopologyStore';
import type { TopologyEvent } from '../lib/topology/types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';

export function useTopologyWebSocket() {
  const addEvent = useTopologyStore((s) => s.addEvent);
  const applyEventToGraph = useTopologyStore((s) => s.applyEventToGraph);
  const paused = useTopologyStore((s) => s.paused);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // Subscribe to topology channel
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'topology' }));
      };

      ws.onmessage = (event) => {
        if (paused) return;

        try {
          const message = JSON.parse(event.data);

          // Handle different message types
          if (message.type === 'topology_event' && message.data) {
            const topologyEvent: TopologyEvent = message.data;
            addEvent(topologyEvent);
            applyEventToGraph(topologyEvent);
          } else if (message.type === 'ping') {
            // Respond to ping
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (err) {
          console.error('[Topology WS] Error parsing message', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[Topology WS] Error:', error);
      };

      ws.onclose = (event) => {
        wsRef.current = null;

        // Attempt to reconnect after 5 seconds
        if (isMounted && !event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [addEvent, applyEventToGraph, paused]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
