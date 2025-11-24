import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SentientEye, type SystemHealth } from '../components/SentientEye/SentientEye';
import { ControllerNode, type ControllerNodeData } from '../components/NetworkTopology/ControllerNode';
import { DeviceNode, type DeviceNodeData } from '../components/NetworkTopology/DeviceNode';
import { SystemOverviewPanel } from '../components/MetricPanels/SystemOverviewPanel';
import { AlertsPanel } from '../components/MetricPanels/AlertsPanel';
import { ActiveSessionsPanel } from '../components/MetricPanels/ActiveSessionsPanel';
import { api } from '../lib/api';
import styles from './Overview.module.css';

export interface NetworkNode {
  id: string;
  name: string;
  type: string;
  room: string;
  x?: number;
  y?: number;
  radius?: number;
  isController: boolean;
  pulseIntensity: number;
  angle?: number;
  deviceNodes?: NetworkNode[];
  controllerId?: string;
  status?: 'online' | 'offline' | 'warning' | 'error';
}

export interface RoomInfo {
  name: string;
  status: 'live' | 'standby' | 'offline';
  timer: string;
  puzzles?: string;
}

export function Overview() {
  const [selectedController, setSelectedController] = useState<string | null>(null);
  const [hoveredController, setHoveredController] = useState<string | null>(null);

  // Fetch controllers from the database
  const { data: controllersData, isLoading: controllersLoading } = useQuery({
    queryKey: ['controllers'],
    queryFn: () => api.getControllers(),
    refetchInterval: 5000,
  });

  // Fetch devices from the database
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.getDevices(),
    refetchInterval: 5000,
  });

  // Fetch system health data for the Sentient Eye
  const { data: health, isLoading } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const controllers = await api.getControllers();
      const devices = await api.getDevices();

      const onlineControllers = controllers.filter(c => c.status === 'online').length;
      const operationalDevices = devices.filter(d => d.status === 'operational').length;

      const controllerWarnings = controllers.filter(c => c.status === 'warning').length;
      const deviceWarnings = devices.filter(d => d.status === 'warning').length;

      const issues: SystemHealth['issues'] = [];

      // Generate issues from offline/warning controllers
      controllers.forEach(c => {
        if (c.status === 'offline') {
          issues.push({
            id: `controller-${c.id}`,
            severity: 'critical',
            message: `Controller "${c.friendly_name}" is offline`,
            source: c.id,
            timestamp: new Date().toISOString(),
          });
        } else if (c.status === 'warning') {
          issues.push({
            id: `controller-${c.id}`,
            severity: 'warning',
            message: `Controller "${c.friendly_name}" has warnings`,
            source: c.id,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Determine overall health
      // TODO: Temporarily forced to 'healthy' - restore logic later
      let overall: SystemHealth['overall'] = 'healthy';
      // if (issues.some(i => i.severity === 'critical')) {
      //   overall = 'critical';
      // } else if (issues.length > 0) {
      //   overall = 'warning';
      // } else if (onlineControllers === 0) {
      //   overall = 'offline';
      // }

      return {
        overall,
        controllers: {
          total: controllers.length,
          online: onlineControllers,
          offline: controllers.length - onlineControllers,
          warnings: controllerWarnings,
          errors: controllers.filter(c => c.status === 'error').length,
        },
        devices: {
          total: devices.length,
          operational: operationalDevices,
          warnings: deviceWarnings,
          errors: devices.filter(d => d.status === 'error').length,
        },
        issues,
      };
    },
  });

  const handleIssueClick = (issueId: string) => {
    console.log('Issue clicked:', issueId);
  };

  // Calculate controller node positions
  const controllerNodes = useMemo((): ControllerNodeData[] => {
    if (!controllersData || controllersData.length === 0) return [];

    // Sort controllers alphabetically by friendly_name
    const sorted = [...controllersData].sort((a, b) =>
      a.friendly_name.localeCompare(b.friendly_name)
    );

    const count = sorted.length;
    const radius = 250; // Distance from center

    // Calculate node size based on count
    let nodeSize: number;
    if (count <= 8) nodeSize = 50;
    else if (count <= 16) nodeSize = 40;
    else if (count <= 32) nodeSize = 32;
    else nodeSize = 28;

    return sorted.map((controller, index) => {
      // Start at top (270°) and go clockwise
      // 270° is top, 0° is right, 90° is bottom, 180° is left
      const angleStep = 360 / count;
      const angle = 270 + (angleStep * index); // Start at top, move clockwise
      const angleRad = (angle * Math.PI) / 180;

      // Calculate offset from center (0, 0)
      const x = radius * Math.cos(angleRad);
      const y = radius * Math.sin(angleRad);

      // Determine status with grey as default waiting state
      let status: ControllerNodeData['status'] = 'waiting';

      // Check if controller has never been seen (waiting state)
      if (!controller.last_seen) {
        status = 'waiting';
      } else if (controller.status === 'online') {
        status = 'online';
      } else if (controller.status === 'offline') {
        status = 'offline';
      } else if (controller.status === 'warning') {
        status = 'warning';
      } else if (controller.status === 'error') {
        status = 'error';
      }
      // If no status or unknown, remains 'waiting' (grey)

      return {
        id: controller.id,
        friendly_name: controller.friendly_name,
        controller_type: controller.controller_type,
        status,
        device_count: controller.assigned_devices,
        last_heartbeat: controller.last_heartbeat,
        angle,
        radius,
        x,
        y,
        size: nodeSize,
      };
    });
  }, [controllersData]);

  // Calculate device node positions grouped around their parent controllers
  const deviceNodes = useMemo((): DeviceNodeData[] => {
    if (!devicesData || devicesData.length === 0 || !controllersData) return [];

    const totalCount = devicesData.length;

    // Calculate node size based on total count
    let nodeSize: number;
    if (totalCount <= 16) nodeSize = 20;
    else if (totalCount <= 32) nodeSize = 16;
    else if (totalCount <= 64) nodeSize = 12;
    else nodeSize = 10;

    // Create a map of controller positions and angles
    const controllerData = new Map(
      controllerNodes.map(c => [c.id, { x: c.x, y: c.y, angle: c.angle }])
    );

    // Group devices by controller
    const devicesByController = new Map<string, typeof devicesData>();
    devicesData.forEach(device => {
      const devices = devicesByController.get(device.controller_id) || [];
      devices.push(device);
      devicesByController.set(device.controller_id, devices);
    });

    const result: DeviceNodeData[] = [];
    const deviceRadius = 80; // Distance from controller (reduced from 150)

    devicesByController.forEach((devices, controllerId) => {
      const controllerInfo = controllerData.get(controllerId);
      if (!controllerInfo) return;

      const deviceCount = devices.length;

      devices.forEach((device, index) => {
        // Distribute devices in a tight arc around their controller
        // Use controller's angle as the center of the arc
        const arcSpan = Math.min(40, deviceCount * 10); // Max 40 degrees, or 10 degrees per device (tighter)
        const startAngle = controllerInfo.angle - (arcSpan / 2);
        const angleStep = deviceCount > 1 ? arcSpan / (deviceCount - 1) : 0;
        const deviceAngle = startAngle + (angleStep * index);
        const deviceAngleRad = (deviceAngle * Math.PI) / 180;

        // Calculate device position relative to controller
        const relativeX = deviceRadius * Math.cos(deviceAngleRad);
        const relativeY = deviceRadius * Math.sin(deviceAngleRad);

        // Absolute position is controller position + relative offset
        const x = controllerInfo.x + relativeX;
        const y = controllerInfo.y + relativeY;

        result.push({
          id: device.id,
          friendly_name: device.friendly_name,
          device_type: device.device_type,
          device_category: device.device_category,
          status: device.status,
          controller_id: device.controller_id,
          x,
          y,
          size: nodeSize,
          controllerX: controllerInfo.x,
          controllerY: controllerInfo.y,
        });
      });
    });

    return result;
  }, [devicesData, controllersData, controllerNodes]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
      </div>
    );
  }

  // Calculate metrics for panels
  const controllersOnline = controllersData?.filter(c => c.status === 'online').length || 0;
  const controllersTotal = controllersData?.length || 0;
  const devicesOperational = devicesData?.filter(d => d.status === 'operational').length || 0;
  const devicesTotal = devicesData?.length || 0;

  // Mock active sessions for now - will be replaced with real data
  const activeSessions = [];

  // Convert issues to alerts format
  const alerts = health?.issues.map(issue => ({
    id: issue.id,
    severity: issue.severity as 'critical' | 'warning' | 'info',
    message: issue.message,
    timestamp: new Date(issue.timestamp),
  })) || [];

  return (
    <div className={styles.container}>
      {/* Left Panel - System Overview + Active Sessions */}
      <div className={styles.leftPanel}>
        <SystemOverviewPanel
          controllersOnline={controllersOnline}
          controllersTotal={controllersTotal}
          devicesOperational={devicesOperational}
          devicesTotal={devicesTotal}
          activeSessions={activeSessions.length}
        />
        <ActiveSessionsPanel sessions={activeSessions} />
      </div>

      {/* Center Area - Network Topology */}
      <div className={styles.centerArea}>
        {/* Network topology layer */}
        <div className={styles.networkLayer}>
          {/* Render controller nodes */}
          {controllerNodes.map((node) => (
            <ControllerNode
              key={node.id}
              data={node}
              onClick={setSelectedController}
              onHover={setHoveredController}
            />
          ))}

          {/* Render device nodes */}
          {deviceNodes.map((node) => (
            <DeviceNode
              key={node.id}
              data={node}
            />
          ))}
        </div>

        {/* Sentient Eye in center */}
        <div className={styles.eyeLayer}>
          <SentientEye health={health!} onIssueClick={handleIssueClick} />
        </div>
      </div>

      {/* Right Panel - Alerts & Issues */}
      <div className={styles.rightPanel}>
        <AlertsPanel alerts={alerts} />
      </div>
    </div>
  );
}
