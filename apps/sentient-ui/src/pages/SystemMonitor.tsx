import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '../hooks/useWebSocket';
import { Activity, AlertTriangle, CheckCircle2, XCircle, Wifi, WifiOff, Clock, Zap } from 'lucide-react';
import type { DomainEvent } from '../types/events';
import styles from './SystemMonitor.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';

interface Controller {
  id: string;
  friendly_name: string;
  controller_type: string;
  status: string;
  last_heartbeat: string;
  room_id: string;
}

interface Device {
  id: string;
  friendly_name: string;
  device_type: string;
  controller_id: string;
  room_id: string;
  status: string;
}

interface Room {
  id: string;
  name: string;
  client_id: string;
  venue_id: string;
}

interface Issue {
  id: string;
  severity: 'warning' | 'error';
  type: 'controller' | 'device';
  entity_id: string;
  entity_name: string;
  room_name?: string;
  message: string;
  timestamp: Date;
}

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function SystemMonitor() {
  const [recentActivity, setRecentActivity] = useState<DomainEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch controllers
  const { data: controllers = [] } = useQuery<Controller[]>({
    queryKey: ['controllers'],
    queryFn: async () => {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/admin/controllers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch controllers');
      return response.json();
    },
  });

  // Fetch devices
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/admin/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch devices');
      return response.json();
    },
  });

  // Fetch rooms
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/admin/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch rooms');
      return response.json();
    },
  });

  // WebSocket connection - filter out heartbeat events for activity feed
  useWebSocket({
    url: WS_URL,
    onEvent: (event) => {
      // Skip heartbeat messages - they're too frequent and not useful in the activity feed
      if (event.type === 'controller_heartbeat' || event.type === 'heartbeat') {
        return;
      }
      setRecentActivity((prev) => [event, ...prev].slice(0, 20));
    },
  });

  // Update current time every second for relative timestamps
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate system health
  const systemHealth = useMemo(() => {
    const HEARTBEAT_TIMEOUT = 60000; // 60 seconds

    const controllerStats = controllers.reduce(
      (acc, ctrl) => {
        acc.total++;
        const lastHeartbeat = new Date(ctrl.last_heartbeat).getTime();
        const timeSinceHeartbeat = currentTime - lastHeartbeat;

        if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
          acc.offline++;
        } else if (timeSinceHeartbeat > 30000) {
          acc.warning++;
        } else {
          acc.online++;
        }
        return acc;
      },
      { total: 0, online: 0, offline: 0, warning: 0 }
    );

    const deviceStats = devices.reduce(
      (acc, dev) => {
        acc.total++;
        if (dev.status === 'operational') acc.operational++;
        else if (dev.status === 'warning') acc.warning++;
        else if (dev.status === 'error') acc.error++;
        return acc;
      },
      { total: 0, operational: 0, warning: 0, error: 0 }
    );

    return {
      controllers: controllerStats,
      devices: deviceStats,
      rooms: { total: rooms.length, active: 0 },
    };
  }, [controllers, devices, rooms, currentTime]);

  // Generate issues list
  const issues = useMemo(() => {
    const HEARTBEAT_TIMEOUT = 60000;
    const newIssues: Issue[] = [];

    controllers.forEach((ctrl) => {
      const lastHeartbeat = new Date(ctrl.last_heartbeat).getTime();
      const timeSinceHeartbeat = currentTime - lastHeartbeat;

      if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
        newIssues.push({
          id: `ctrl-${ctrl.id}`,
          severity: 'error',
          type: 'controller',
          entity_id: ctrl.id,
          entity_name: ctrl.friendly_name,
          room_name: rooms.find((r) => r.id === ctrl.room_id)?.name,
          message: `Offline - Last seen ${Math.floor(timeSinceHeartbeat / 1000)}s ago`,
          timestamp: new Date(ctrl.last_heartbeat),
        });
      } else if (timeSinceHeartbeat > 30000) {
        newIssues.push({
          id: `ctrl-${ctrl.id}`,
          severity: 'warning',
          type: 'controller',
          entity_id: ctrl.id,
          entity_name: ctrl.friendly_name,
          room_name: rooms.find((r) => r.id === ctrl.room_id)?.name,
          message: `High latency - Last heartbeat ${Math.floor(timeSinceHeartbeat / 1000)}s ago`,
          timestamp: new Date(ctrl.last_heartbeat),
        });
      }
    });

    devices.forEach((dev) => {
      if (dev.status === 'warning' || dev.status === 'error') {
        newIssues.push({
          id: `dev-${dev.id}`,
          severity: dev.status as 'warning' | 'error',
          type: 'device',
          entity_id: dev.id,
          entity_name: dev.friendly_name,
          room_name: rooms.find((r) => r.id === dev.room_id)?.name,
          message: `Status: ${dev.status}`,
          timestamp: new Date(),
        });
      }
    });

    return newIssues;
  }, [controllers, devices, rooms, currentTime]);

  // Group controllers and devices by room
  const roomStats = useMemo(() => {
    const stats = new Map<string, { room: Room; controllers: number; devices: number; online: number }>();

    rooms.forEach((room) => {
      const roomControllers = controllers.filter((c) => c.room_id === room.id);
      const roomDevices = devices.filter((d) => d.room_id === room.id);

      const onlineCount = roomControllers.filter((c) => {
        const lastHeartbeat = new Date(c.last_heartbeat).getTime();
        return currentTime - lastHeartbeat < 60000;
      }).length;

      stats.set(room.id, {
        room,
        controllers: roomControllers.length,
        devices: roomDevices.length,
        online: onlineCount,
      });
    });

    return Array.from(stats.values());
  }, [rooms, controllers, devices, currentTime]);

  const systemStatus = systemHealth.controllers.offline === 0 && systemHealth.devices.error === 0 ? 'healthy' : 'degraded';

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.iconBox}>
            <Activity size={28} />
          </div>
          <div>
            <h1 className={styles.title}>System Monitor</h1>
            <p className={styles.subtitle}>Real-time operational status</p>
          </div>
        </div>
        <div className={styles.statusBadge} data-status={systemStatus}>
          {systemStatus === 'healthy' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span>{systemStatus === 'healthy' ? 'All Systems Operational' : 'Issues Detected'}</span>
        </div>
      </div>

      {/* System Health Overview */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <Wifi size={24} />
            <span>Controllers</span>
          </div>
          <div className={styles.metricValue}>{systemHealth.controllers.online}/{systemHealth.controllers.total}</div>
          <div className={styles.metricBreakdown}>
            <div className={styles.metricItem}>
              <CheckCircle2 size={16} className={styles.iconOnline} />
              <span>Online: {systemHealth.controllers.online}</span>
            </div>
            <div className={styles.metricItem}>
              <AlertTriangle size={16} className={styles.iconWarning} />
              <span>Warning: {systemHealth.controllers.warning}</span>
            </div>
            <div className={styles.metricItem}>
              <XCircle size={16} className={styles.iconError} />
              <span>Offline: {systemHealth.controllers.offline}</span>
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <Zap size={24} />
            <span>Devices</span>
          </div>
          <div className={styles.metricValue}>{systemHealth.devices.operational}/{systemHealth.devices.total}</div>
          <div className={styles.metricBreakdown}>
            <div className={styles.metricItem}>
              <CheckCircle2 size={16} className={styles.iconOnline} />
              <span>Operational: {systemHealth.devices.operational}</span>
            </div>
            <div className={styles.metricItem}>
              <AlertTriangle size={16} className={styles.iconWarning} />
              <span>Warning: {systemHealth.devices.warning}</span>
            </div>
            <div className={styles.metricItem}>
              <XCircle size={16} className={styles.iconError} />
              <span>Error: {systemHealth.devices.error}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className={styles.contentGrid}>
        {/* Left column: Rooms & Issues */}
        <div className={styles.leftColumn}>
          {/* Room Status Cards */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Rooms ({rooms.length})</h2>
            <div className={styles.roomGrid}>
              {roomStats.map(({ room, controllers, devices, online }) => {
                const allOnline = controllers === online && controllers > 0;
                const someOffline = online < controllers;

                return (
                  <div key={room.id} className={styles.roomCard} data-status={allOnline ? 'online' : someOffline ? 'warning' : 'offline'}>
                    <div className={styles.roomHeader}>
                      <h3>{room.name}</h3>
                      {allOnline ? <CheckCircle2 size={18} className={styles.iconOnline} /> : <WifiOff size={18} className={styles.iconWarning} />}
                    </div>
                    <div className={styles.roomStats}>
                      <div className={styles.roomStat}>
                        <span className={styles.statLabel}>Controllers</span>
                        <span className={styles.statValue}>{online}/{controllers}</span>
                      </div>
                      <div className={styles.roomStat}>
                        <span className={styles.statLabel}>Devices</span>
                        <span className={styles.statValue}>{devices}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Active Issues */}
          {issues.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Active Issues ({issues.length})</h2>
              <div className={styles.issuesList}>
                {issues.map((issue) => (
                  <div key={issue.id} className={styles.issueCard} data-severity={issue.severity}>
                    <div className={styles.issueIcon}>
                      {issue.severity === 'error' ? <XCircle size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div className={styles.issueContent}>
                      <div className={styles.issueHeader}>
                        <span className={styles.issueType}>{issue.type === 'controller' ? 'Controller' : 'Device'}</span>
                        <span className={styles.issueName}>{issue.entity_name}</span>
                      </div>
                      <div className={styles.issueMessage}>{issue.message}</div>
                      {issue.room_name && <div className={styles.issueRoom}>Room: {issue.room_name}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column: Activity Stream */}
        <div className={styles.rightColumn}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
            <div className={styles.activityList}>
              {recentActivity.length === 0 ? (
                <div className={styles.emptyState}>
                  <Clock size={32} />
                  <p>Waiting for events...</p>
                </div>
              ) : (
                recentActivity.map((event, index) => {
                  const timestamp = new Date(event.timestamp);
                  const timeAgo = Math.floor((currentTime - timestamp.getTime()) / 1000);
                  const timeDisplay = timeAgo < 60 ? `${timeAgo}s` : `${Math.floor(timeAgo / 60)}m`;

                  return (
                    <div key={`${event.event_id}-${index}`} className={styles.activityItem}>
                      <div className={styles.activityTime}>{timeDisplay}</div>
                      <div className={styles.activityDot} />
                      <div className={styles.activityContent}>
                        <div className={styles.activityType}>{event.type}</div>
                        {event.controller_id && <div className={styles.activityDetail}>Controller: {event.controller_id}</div>}
                        {event.device_id && <div className={styles.activityDetail}>Device: {event.device_id}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
