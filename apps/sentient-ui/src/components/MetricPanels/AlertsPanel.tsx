import { MetricPanel } from './MetricPanel';
import './AlertsPanel.css';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: Date;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return '⚠';
      case 'warning':
        return '⚡';
      case 'info':
        return 'ℹ';
    }
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
    }
  };

  return (
    <MetricPanel title="Alerts & Issues" className="alerts-panel">
      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="no-alerts">No active alerts</div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className={`alert-item ${alert.severity}`}>
              <div className="alert-icon" style={{ color: getSeverityColor(alert.severity) }}>
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="alert-content">
                <div className="alert-message">{alert.message}</div>
                <div className="alert-timestamp">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </MetricPanel>
  );
}
