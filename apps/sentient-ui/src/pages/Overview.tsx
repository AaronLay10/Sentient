import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SentientEye, type SystemHealth } from '../components/SentientEye/SentientEye';
import { ControllerNode, type ControllerNodeData } from '../components/NetworkTopology/ControllerNode';
import { DeviceNode, type DeviceNodeData } from '../components/NetworkTopology/DeviceNode';
import { MessagePulse, type MessagePulseData } from '../components/NetworkTopology/MessagePulse';
import { SystemOverviewPanel } from '../components/MetricPanels/SystemOverviewPanel';
import { AlertsPanel } from '../components/MetricPanels/AlertsPanel';
import { ActiveSessionsPanel } from '../components/MetricPanels/ActiveSessionsPanel';
import { ServiceVersionPanel } from '../components/MetricPanels/ServiceVersionPanel';
import { useWebSocket } from '../hooks/useWebSocket';
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
  // WebSocket connection for real-time events
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';
  const { isConnected: wsConnected, events: wsEvents } = useWebSocket({ url: wsUrl });

  // Fetch controllers from the database
  const { data: controllersData } = useQuery({
    queryKey: ['controllers'],
    queryFn: () => api.getControllers(),
    refetchInterval: 5000,
  });

  // Fetch devices from the database
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.getDevices(),
    refetchInterval: 5000,
  });

  // Performance monitoring
  useEffect(() => {
    const logPerformance = () => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        console.log('[Overview Performance]', {
          wsConnected,
          wsEventsCount: wsEvents.length,
          controllersCount: controllersData?.length || 0,
          devicesCount: devicesData?.length || 0,
          memoryUsedMB: (memory.usedJSHeapSize / 1048576).toFixed(2),
          memoryLimitMB: (memory.jsHeapSizeLimit / 1048576).toFixed(2),
          memoryPercent: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1) + '%',
        });
      } else {
        console.log('[Overview Status]', {
          wsConnected,
          wsEventsCount: wsEvents.length,
          controllersCount: controllersData?.length || 0,
          devicesCount: devicesData?.length || 0,
          note: 'Memory API not available (use Chrome with --enable-precise-memory-info)',
        });
      }
    };

    logPerformance();
    const interval = setInterval(logPerformance, 10000); // Log every 10 seconds

    return () => clearInterval(interval);
  }, [wsConnected, wsEvents, controllersData, devicesData]);

  // Calculate controller node positions early so effects can safely reference them
  const controllerNodes = useMemo((): ControllerNodeData[] => {
    if (!controllersData || controllersData.length === 0) return [];

    // Filter out Power Control controllers as they have their own dedicated page
    const filtered = controllersData.filter(c => 
      !c.friendly_name.toLowerCase().includes('power control')
    );

    const sorted = [...filtered].sort((a, b) =>
      a.friendly_name.localeCompare(b.friendly_name)
    );

    const count = sorted.length;
    const radius = 200;

    let nodeSize: number;
    if (count <= 8) nodeSize = 50;
    else if (count <= 16) nodeSize = 40;
    else if (count <= 32) nodeSize = 32;
    else nodeSize = 28;

    return sorted.map((controller, index) => {
      const angleStep = 360 / count;
      const angle = 270 + (angleStep * index);
      const angleRad = (angle * Math.PI) / 180;
      const x = radius * Math.cos(angleRad);
      const y = radius * Math.sin(angleRad);

      let status: ControllerNodeData['status'] = 'waiting';
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

      return {
        id: controller.id,
        friendly_name: controller.friendly_name,
        controller_type: controller.controller_type as ControllerNodeData['controller_type'],
        status,
        device_count: controller.device_count,
        last_heartbeat: controller.last_seen || undefined,
        angle,
        radius,
        x,
        y,
        size: nodeSize,
      };
    });
  }, [controllersData]);

  const deviceNodes = useMemo((): DeviceNodeData[] => {
    if (!devicesData || devicesData.length === 0 || !controllersData) return [];

    const totalCount = devicesData.length;
    let nodeSize: number;
    if (totalCount <= 16) nodeSize = 20;
    else if (totalCount <= 32) nodeSize = 16;
    else if (totalCount <= 64) nodeSize = 12;
    else nodeSize = 10;

    const controllerData = new Map(
      controllerNodes.map(c => [c.id, { x: c.x, y: c.y, angle: c.angle }])
    );

    const devicesByController = new Map<string, typeof devicesData>();
    devicesData.forEach(device => {
      const devices = devicesByController.get(device.controller_id) || [];
      devices.push(device);
      devicesByController.set(device.controller_id, devices);
    });

    const result: DeviceNodeData[] = [];
    const baseDeviceRadius = 140; // Further increased for more spacing

    devicesByController.forEach((devices, controllerId) => {
      const controllerInfo = controllerData.get(controllerId);
      if (!controllerInfo) return;

      const deviceCount = devices.length;

      devices.forEach((device, index) => {
        // Spread devices across a wider arc and use varying radius for better distribution
        const arcSpan = Math.min(100, Math.max(30, deviceCount * 18)); // Wider arc
        const startAngle = controllerInfo.angle - (arcSpan / 2);
        const angleStep = deviceCount > 1 ? arcSpan / (deviceCount - 1) : 0;
        const deviceAngle = startAngle + (angleStep * index);
        const deviceAngleRad = (deviceAngle * Math.PI) / 180;

        // Vary the radius slightly to create more separation
        const radiusVariation = (index % 2) * 20; // Alternate between two radii
        const deviceRadius = baseDeviceRadius + radiusVariation;

        const relativeX = deviceRadius * Math.cos(deviceAngleRad);
        const relativeY = deviceRadius * Math.sin(deviceAngleRad);

        const x = controllerInfo.x + relativeX;
        const y = controllerInfo.y + relativeY;

        result.push({
          id: device.id,
          friendly_name: device.friendly_name,
          device_type: device.device_type,
          device_category: device.device_category as DeviceNodeData['device_category'],
          status: device.status as DeviceNodeData['status'],
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

  // State for message pulses (after data queries so refs can use proper types)
  const [messagePulses, setMessagePulses] = useState<MessagePulseData[]>([]);
  const pulseIdCounter = useRef(0);

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

  // Remove completed pulses
  const handlePulseComplete = useCallback((pulseId: string) => {
    setMessagePulses(prev => prev.filter(p => p.id !== pulseId));
  }, []);

  // Generate pulse from controller to eye when controller sends real-time message
  useEffect(() => {
    if (!wsEvents.length || !controllerNodes.length) return;

    const latestEvent = wsEvents[0];
    
    // Only create pulses for controller-originated events
    const controllerEventTypes = [
      'controller_heartbeat',
      'controller_online',
      'controller_offline',
      'controller_error',
      'device_state_changed',
      'device_online',
      'device_offline',
      'device_error',
    ];

    if (!controllerEventTypes.includes(latestEvent.type)) return;

    const controllerId = latestEvent.controller_id;
    if (!controllerId) return;

    const node = controllerNodes.find(n => n.id === controllerId);
    if (!node) return;

    // Create pulse from controller to eye
    const pulseId = `controller-${controllerId}-${pulseIdCounter.current++}`;
    setMessagePulses(prev => [...prev, {
      id: pulseId,
      fromX: node.x,
      fromY: node.y,
      toX: 0, // Center of eye
      toY: 0,
      type: 'controller-to-eye',
      createdAt: Date.now(),
    }]);

  }, [wsEvents, controllerNodes]);

  // Generate pulse from device to controller when device event is received
  useEffect(() => {
    if (!wsEvents.length || !deviceNodes.length || !controllerNodes.length) return;

    const latestEvent = wsEvents[0];
    
    // Only create pulses for device-specific events
    const deviceEventTypes = [
      'device_state_changed',
      'device_online',
      'device_offline',
      'device_error',
    ];

    if (!deviceEventTypes.includes(latestEvent.type)) return;

    const deviceId = latestEvent.device_id;
    const controllerId = latestEvent.controller_id;
    
    if (!deviceId || !controllerId) return;

    const deviceNode = deviceNodes.find(n => n.id === deviceId);
    const controllerNode = controllerNodes.find(n => n.id === controllerId);
    
    if (!deviceNode || !controllerNode) return;

    // Create pulse from device to controller
    const pulseId = `device-${deviceId}-${pulseIdCounter.current++}`;
    setMessagePulses(prev => [...prev, {
      id: pulseId,
      fromX: deviceNode.x,
      fromY: deviceNode.y,
      toX: controllerNode.x,
      toY: controllerNode.y,
      type: 'device-to-controller',
      createdAt: Date.now(),
    }]);

  }, [wsEvents, deviceNodes, controllerNodes]);

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
  const activeSessions: Array<{ id: string; room: string; duration: number; status: 'active' | 'paused' | 'completed'; progress: number }> = [];

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
        <ServiceVersionPanel />
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
              onClick={() => {}}
              onHover={() => {}}
            />
          ))}

          {/* Render device nodes */}
          {deviceNodes.map((node) => (
            <DeviceNode
              key={node.id}
              data={node}
            />
          ))}

          {/* Render message pulses */}
          {messagePulses.map((pulse) => (
            <MessagePulse
              key={pulse.id}
              pulse={pulse}
              onComplete={handlePulseComplete}
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
