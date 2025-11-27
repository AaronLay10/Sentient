import './ControllerNode.css';

export interface ControllerNodeData {
  id: string;
  friendly_name: string;
  controller_type: 'RPI' | 'ESP32' | 'ARDUINO';
  status: 'waiting' | 'online' | 'offline' | 'warning' | 'error';
  device_count?: number;
  last_heartbeat?: string;

  // Layout properties
  angle: number;
  radius: number;
  x: number;
  y: number;
  size: number;
}

interface ControllerNodeProps {
  data: ControllerNodeData;
  onClick?: (controllerId: string) => void;
  onHover?: (controllerId: string | null) => void;
}

export function ControllerNode({ data, onClick, onHover }: ControllerNodeProps) {
  const getStatusColor = () => {
    switch (data.status) {
      case 'waiting':
        return '#8888aa'; // Purple-gray - waiting for connection
      case 'online':
        return '#00d9ff'; // Brand cyan - online and active
      case 'offline':
        return '#666677'; // Gray - powered but offline
      case 'warning':
        return '#ffaa32'; // Brand orange - warning state
      case 'error':
        return '#ff3355'; // Brand red - error state
      default:
        return '#8888aa';
    }
  };


  return (
    <div
      className={`controller-node ${data.status}`}
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
      {/* Status ring */}
      <div
        className="controller-ring"
        style={{ 
          borderColor: getStatusColor(),
          backgroundColor: 'rgb(10, 14, 26)',
        }}
      >
        {/* Controller initial centered inside */}
        <div className="controller-inner">
          <span className="controller-initial">
            {data.friendly_name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Connection line to center - only show when online */}
      {data.status === 'online' && (
        <svg
          className="connection-line"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${Math.abs(data.x) + data.size}px`,
            height: `${Math.abs(data.y) + data.size}px`,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          <line
            x1={data.size / 2}
            y1={data.size / 2}
            x2={-data.x + data.size / 2}
            y2={-data.y + data.size / 2}
            stroke={getStatusColor()}
            strokeWidth="2"
            strokeOpacity="0.5"
          />
        </svg>
      )}

      {/* Label */}
      <div className="controller-label">
        {data.friendly_name}
      </div>
    </div>
  );
}
