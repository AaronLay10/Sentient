import './MetricPanel.css';

export interface MetricPanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function MetricPanel({ title, children, className = '' }: MetricPanelProps) {
  return (
    <div className={`metric-panel ${className}`}>
      <div className="metric-panel-header">
        <h3>{title}</h3>
      </div>
      <div className="metric-panel-content">
        {children}
      </div>
    </div>
  );
}
