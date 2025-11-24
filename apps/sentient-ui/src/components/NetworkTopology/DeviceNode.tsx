import './DeviceNode.css';

export interface DeviceNodeData {
  id: string;
  friendly_name: string;
  device_type: string;
  device_category: string;
  status: 'operational' | 'warning' | 'error' | 'offline';
  controller_id: string;

  // Layout properties
  x: number;
  y: number;
  size: number;
  // Controller position for drawing connection line
  controllerX: number;
  controllerY: number;
}

interface DeviceNodeProps {
  data: DeviceNodeData;
  onClick?: (deviceId: string) => void;
  onHover?: (deviceId: string | null) => void;
}

export function DeviceNode({ data, onClick, onHover }: DeviceNodeProps) {
  const getStatusColor = () => {
    switch (data.status) {
      case 'operational':
        return '#10b981'; // Green - operational
      case 'offline':
        return '#6b7280'; // Grey - offline
      case 'warning':
        return '#f59e0b'; // Orange - warning state
      case 'error':
        return '#ef4444'; // Red - error state
      default:
        return '#6b7280';
    }
  };

  return (
    <div
      className={`device-node ${data.status}`}
      style={{
        left: `${data.x}px`,
        top: `${data.y}px`,
        width: `${data.size}px`,
        height: `${data.size}px`,
      }}
      onClick={() => onClick?.(data.id)}
      onMouseEnter={() => onHover?.(data.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Connection line to parent controller */}
      <svg
        className="device-connection-line"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: `${Math.abs(data.controllerX - data.x) + data.size}px`,
          height: `${Math.abs(data.controllerY - data.y) + data.size}px`,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        <line
          x1={data.size / 2}
          y1={data.size / 2}
          x2={data.controllerX - data.x + data.size / 2}
          y2={data.controllerY - data.y + data.size / 2}
          stroke={getStatusColor()}
          strokeWidth="1"
          strokeOpacity="0.3"
        />
      </svg>

      {/* Device circle */}
      <div
        className="device-circle"
        style={{
          borderColor: getStatusColor(),
          backgroundColor: `${getStatusColor()}22` // 22 = ~13% opacity
        }}
      />

      {/* Label */}
      <div className="device-label">
        {data.friendly_name}
      </div>
    </div>
  );
}
