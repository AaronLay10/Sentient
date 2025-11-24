import { useMemo } from 'react';
import { Activity, Zap, AlertCircle, Info } from 'lucide-react';
import { useTopologyStore } from '../../hooks/useTopologyStore';
import type { TopologyEvent } from '../../lib/topology/types';
import './EventsPanel.css';

export function EventsPanel() {
  const events = useTopologyStore((s) => s.events);
  const filters = useTopologyStore((s) => s.filters);
  const setSelectedNode = useTopologyStore((s) => s.setSelectedNode);

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filters.roomId && event.roomId !== filters.roomId) return false;
      if (filters.nodeType && event.type !== filters.nodeType) return false;
      if (filters.eventType && event.subtype !== filters.eventType) return false;
      return true;
    });
  }, [events, filters]);

  const handleEventClick = (event: TopologyEvent) => {
    // Determine which node to select based on event
    if (event.deviceId) {
      setSelectedNode(event.deviceId);
    } else if (event.controllerId) {
      setSelectedNode(event.controllerId);
    } else if (event.roomId) {
      setSelectedNode(event.roomId);
    }
  };

  const getEventIcon = (event: TopologyEvent) => {
    if (event.subtype.includes('offline') || event.subtype.includes('error')) {
      return <AlertCircle size={14} className="event-icon error" />;
    } else if (event.subtype.includes('warning')) {
      return <AlertCircle size={14} className="event-icon warning" />;
    } else if (event.subtype.includes('heartbeat')) {
      return <Activity size={14} className="event-icon heartbeat" />;
    } else if (event.subtype.includes('state')) {
      return <Zap size={14} className="event-icon state" />;
    }
    return <Info size={14} className="event-icon info" />;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const getEventSummary = (event: TopologyEvent) => {
    const parts: string[] = [];

    if (event.type) parts.push(`[${event.type.toUpperCase()}]`);
    if (event.subtype) parts.push(event.subtype);

    if (event.deviceId) {
      parts.push(`device: ${event.deviceId}`);
    } else if (event.controllerId) {
      parts.push(`ctrl: ${event.controllerId}`);
    } else if (event.roomId) {
      parts.push(`room: ${event.roomId}`);
    } else if (event.serviceName) {
      parts.push(`service: ${event.serviceName}`);
    }

    return parts.join(' | ');
  };

  return (
    <div className="events-panel">
      <div className="events-header">
        <h3>Live Events</h3>
        <span className="event-count">{filteredEvents.length} events</span>
      </div>

      <div className="events-list">
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <Activity size={32} />
            <p>No events yet</p>
            <span>Waiting for system activity...</span>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="event-item"
              onClick={() => handleEventClick(event)}
            >
              <div className="event-header-row">
                {getEventIcon(event)}
                <span className="event-timestamp">{formatTimestamp(event.timestamp)}</span>
              </div>
              <div className="event-summary">{getEventSummary(event)}</div>
              {event.payload && Object.keys(event.payload).length > 0 && (
                <div className="event-payload">
                  {JSON.stringify(event.payload, null, 2)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
