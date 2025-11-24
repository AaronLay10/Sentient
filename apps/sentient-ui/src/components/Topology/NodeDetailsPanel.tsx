import { useMemo } from 'react';
import { X, Server, Cpu, Box, Database, Cloud } from 'lucide-react';
import { useTopologyStore } from '../../hooks/useTopologyStore';
import './NodeDetailsPanel.css';

export function NodeDetailsPanel() {
  const selectedNode = useTopologyStore((s) => s.selectedNode);
  const events = useTopologyStore((s) => s.events);
  const setSelectedNode = useTopologyStore((s) => s.setSelectedNode);

  // Get events related to this node
  const relatedEvents = useMemo(() => {
    if (!selectedNode) return [];

    return events.filter((event) => {
      if (selectedNode.type === 'device' && event.deviceId === selectedNode.id) return true;
      if (selectedNode.type === 'controller' && event.controllerId === selectedNode.id) return true;
      if (selectedNode.type === 'room' && event.roomId === selectedNode.id) return true;
      if (selectedNode.type === 'service' && event.serviceName === selectedNode.serviceName) return true;
      return false;
    }).slice(0, 20); // Show last 20 events
  }, [selectedNode, events]);

  if (!selectedNode) {
    return (
      <div className="node-details-panel empty">
        <div className="empty-state">
          <Server size={32} />
          <p>No node selected</p>
          <span>Click on a node to view details</span>
        </div>
      </div>
    );
  }

  const getNodeIcon = () => {
    switch (selectedNode.type) {
      case 'controller':
        return <Cpu size={20} />;
      case 'device':
        return <Box size={20} />;
      case 'service':
        return <Server size={20} />;
      case 'infra':
        return <Database size={20} />;
      case 'room':
        return <Cloud size={20} />;
      default:
        return <Server size={20} />;
    }
  };

  const getStatusColor = () => {
    switch (selectedNode.status) {
      case 'online':
        return 'var(--color-success)';
      case 'offline':
        return 'var(--color-error)';
      case 'degraded':
        return 'var(--color-warning)';
      default:
        return 'var(--color-text-dim)';
    }
  };

  return (
    <div className="node-details-panel">
      <div className="details-header">
        <div className="header-content">
          <div className="node-icon" style={{ color: getStatusColor() }}>
            {getNodeIcon()}
          </div>
          <div className="header-info">
            <h3>{selectedNode.label}</h3>
            <span className="node-type">{selectedNode.type}</span>
          </div>
        </div>
        <button
          onClick={() => setSelectedNode(null)}
          className="close-btn"
          title="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="details-content">
        {/* Status Section */}
        <div className="detail-section">
          <h4>Status</h4>
          <div className="status-badge" style={{ borderColor: getStatusColor(), color: getStatusColor() }}>
            {selectedNode.status || 'unknown'}
          </div>
        </div>

        {/* Node Information */}
        <div className="detail-section">
          <h4>Information</h4>
          <dl className="info-list">
            <dt>ID:</dt>
            <dd>{selectedNode.id}</dd>

            {selectedNode.roomId && (
              <>
                <dt>Room:</dt>
                <dd>{selectedNode.roomId}</dd>
              </>
            )}

            {selectedNode.controllerId && (
              <>
                <dt>Controller:</dt>
                <dd>{selectedNode.controllerId}</dd>
              </>
            )}

            {selectedNode.serviceName && (
              <>
                <dt>Service:</dt>
                <dd>{selectedNode.serviceName}</dd>
              </>
            )}

            {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
              <>
                <dt>Metadata:</dt>
                <dd>
                  <pre>{JSON.stringify(selectedNode.metadata, null, 2)}</pre>
                </dd>
              </>
            )}
          </dl>
        </div>

        {/* Recent Events */}
        <div className="detail-section events-section">
          <h4>Recent Events ({relatedEvents.length})</h4>
          {relatedEvents.length === 0 ? (
            <div className="no-events">No recent events</div>
          ) : (
            <div className="event-list">
              {relatedEvents.map((event) => (
                <div key={event.id} className="mini-event">
                  <span className="event-time">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="event-subtype">{event.subtype}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
