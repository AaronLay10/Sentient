import { useQuery } from '@tanstack/react-query';
import { MetricPanel } from './MetricPanel';
import { api } from '../../lib/api';
import './ServiceVersionPanel.css';

interface ServiceVersionInfo {
  service: string;
  version: string;
  node?: string;
  uptime?: number;
}

export function ServiceVersionPanel() {
  const { data: versionData } = useQuery<ServiceVersionInfo>({
    queryKey: ['system-version'],
    queryFn: () => api.getSystemVersion(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatUptime = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <MetricPanel title="Service Version" className="service-version-panel">
      <div className="version-info">
        <div className="version-row">
          <span className="version-label">API Service</span>
          <span className="version-value">v{versionData?.version || '1.0.0'}</span>
        </div>
        <div className="version-row">
          <span className="version-label">Node.js</span>
          <span className="version-value">{versionData?.node || 'N/A'}</span>
        </div>
        <div className="version-row">
          <span className="version-label">Uptime</span>
          <span className="version-value">{formatUptime(versionData?.uptime)}</span>
        </div>
      </div>
    </MetricPanel>
  );
}
