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
    // All devices are cyan to match brand
    return '#00d9ff'; // Brand cyan
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
          stroke="#ffaa32"
          strokeWidth="1"
          strokeOpacity="1"
        />
      </svg>

      {/* Device circle */}
      <div
        className="device-circle"
        style={{
          borderColor: getStatusColor(),
          backgroundColor: `${getStatusColor()}40` // 40 = ~25% opacity for brightness
        }}
      />

      {/* Label */}
      <div className="device-label">
        {data.friendly_name}
      </div>
    </div>
  );
}
