import { MetricPanel } from './MetricPanel';
import './SystemOverviewPanel.css';

interface SystemOverviewPanelProps {
  controllersOnline: number;
  controllersTotal: number;
  devicesOperational: number;
  devicesTotal: number;
  activeSessions: number;
}

export function SystemOverviewPanel({
  controllersOnline,
  controllersTotal,
  devicesOperational,
  devicesTotal,
  activeSessions,
}: SystemOverviewPanelProps) {
  const controllerPercentage = controllersTotal > 0
    ? Math.round((controllersOnline / controllersTotal) * 100)
    : 0;

  const devicePercentage = devicesTotal > 0
    ? Math.round((devicesOperational / devicesTotal) * 100)
    : 0;

  return (
    <MetricPanel title="System Overview" className="system-overview-panel">
      <div className="overview-metrics">
        <div className="metric-item">
          <div className="metric-label">Controllers</div>
          <div className="metric-value">
            <span className="metric-number">{controllersOnline}</span>
            <span className="metric-total">/{controllersTotal}</span>
          </div>
          <div className="metric-bar">
            <div
              className="metric-bar-fill"
              style={{
                width: `${controllerPercentage}%`,
                backgroundColor: controllerPercentage >= 80 ? '#10b981' : controllerPercentage >= 50 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-label">Devices</div>
          <div className="metric-value">
            <span className="metric-number">{devicesOperational}</span>
            <span className="metric-total">/{devicesTotal}</span>
          </div>
          <div className="metric-bar">
            <div
              className="metric-bar-fill"
              style={{
                width: `${devicePercentage}%`,
                backgroundColor: devicePercentage >= 80 ? '#10b981' : devicePercentage >= 50 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-label">Active Sessions</div>
          <div className="metric-value">
            <span className="metric-number large">{activeSessions}</span>
          </div>
        </div>
      </div>
    </MetricPanel>
  );
}
