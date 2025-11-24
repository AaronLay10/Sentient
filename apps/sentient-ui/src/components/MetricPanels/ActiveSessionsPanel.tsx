import { MetricPanel } from './MetricPanel';
import './ActiveSessionsPanel.css';

interface Session {
  id: string;
  room: string;
  duration: number; // in seconds
  status: 'active' | 'paused' | 'completed';
  progress: number; // 0-100
}

interface ActiveSessionsPanelProps {
  sessions: Session[];
}

export function ActiveSessionsPanel({ sessions }: ActiveSessionsPanelProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'paused':
        return '#f59e0b';
      case 'completed':
        return '#3b82f6';
    }
  };

  return (
    <MetricPanel title="Active Sessions" className="active-sessions-panel">
      <div className="sessions-list">
        {sessions.length === 0 ? (
          <div className="no-sessions">No active sessions</div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="session-item">
              <div className="session-header">
                <div className="session-room">{session.room}</div>
                <div className="session-duration">{formatDuration(session.duration)}</div>
              </div>
              <div className="session-status">
                <div
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(session.status) }}
                />
                <span className="status-text">{session.status}</span>
              </div>
              <div className="session-progress-bar">
                <div
                  className="session-progress-fill"
                  style={{
                    width: `${session.progress}%`,
                    backgroundColor: getStatusColor(session.status)
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </MetricPanel>
  );
}
