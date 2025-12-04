import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Activity, AlertCircle, CheckCircle2, Clock, Wifi, WifiOff, Building2 } from 'lucide-react';
import { api, type Room } from '../lib/api';
import { useRoomContext } from '../contexts/RoomContext';
import styles from './RoomOverview.module.css';

interface RoomWithStatus extends Room {
  controllerCount: number;
  onlineControllers: number;
  deviceCount: number;
  operationalDevices: number;
  hasActiveSession: boolean;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'offline';
  clientId?: string;
}

export function RoomOverview() {
  const navigate = useNavigate();
  const { setRoomContext } = useRoomContext();

  // Fetch all rooms
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.getRooms(),
    refetchInterval: 10000,
  });

  // Fetch all controllers for status info
  const { data: controllers } = useQuery({
    queryKey: ['controllers'],
    queryFn: () => api.getControllers(),
    refetchInterval: 5000,
  });

  // Fetch all devices for status info
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.getDevices(),
    refetchInterval: 5000,
  });

  // Fetch all clients for grouping
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.getClients(),
  });

  // Calculate room statuses
  const roomsWithStatus = useMemo((): RoomWithStatus[] => {
    if (!rooms) return [];

    return rooms.map(room => {
      // Controllers don't have room_id, they're fetched per-room via API
      // For now, filter by room relationship if available
      const roomControllers = controllers?.filter(c => (c as any).roomId === room.id) || [];
      const roomDevices = devices?.filter(d =>
        roomControllers.some(c => c.id === d.controller_id)
      ) || [];

      const onlineControllers = roomControllers.filter(c => c.status === 'online').length;
      const operationalDevices = roomDevices.filter(d => d.status === 'operational').length;

      // Determine health status
      let healthStatus: RoomWithStatus['healthStatus'] = 'healthy';
      if (roomControllers.length === 0) {
        healthStatus = 'offline';
      } else if (onlineControllers === 0) {
        healthStatus = 'critical';
      } else if (onlineControllers < roomControllers.length) {
        healthStatus = 'warning';
      } else if (roomDevices.length > 0 && operationalDevices < roomDevices.length) {
        healthStatus = 'warning';
      }

      return {
        ...room,
        controllerCount: roomControllers.length,
        onlineControllers,
        deviceCount: roomDevices.length,
        operationalDevices,
        hasActiveSession: false, // TODO: Implement session tracking
        healthStatus,
      };
    });
  }, [rooms, controllers, devices]);

  // Group rooms by client/tenant
  const roomsByClient = useMemo(() => {
    const grouped = new Map<string, { clientName: string; rooms: RoomWithStatus[] }>();

    roomsWithStatus.forEach(room => {
      // Room has clientId which corresponds to client (check multiple field names for safety)
      const clientId = (room as any).clientId || room.tenant_id || 'unknown';
      const client = clients?.find(c => c.id === clientId);
      const clientName = client?.name || 'Unknown Client';

      if (!grouped.has(clientId)) {
        grouped.set(clientId, { clientName, rooms: [] });
      }
      grouped.get(clientId)!.rooms.push(room);
    });

    return Array.from(grouped.entries()).map(([clientId, data]) => ({
      clientId,
      ...data,
    }));
  }, [roomsWithStatus, clients]);

  const handleRoomSelect = (room: RoomWithStatus) => {
    // Use venueId (camelCase) as that's what the API returns
    const venueId = room.venueId || room.venue_id || '';
    // Get clientId - database uses clientId, check multiple possible field names for safety
    const clientId = (room as any).clientId || room.tenant_id || '';
    const client = clients?.find(c => c.id === clientId);

    console.log('[RoomOverview] Selecting room:', {
      roomId: room.id,
      roomName: room.name,
      venueId,
      clientId,
      clientName: client?.name,
      rawRoom: room
    });

    // setRoomContext(clientId, clientName, venueId, venueName, roomId, roomName)
    setRoomContext(clientId, client?.name || 'Unknown', venueId, '', room.id, room.name);
    navigate(`/monitor`);
  };

  const getStatusIcon = (status: RoomWithStatus['healthStatus']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 size={16} className={styles.statusHealthy} />;
      case 'warning':
        return <AlertCircle size={16} className={styles.statusWarning} />;
      case 'critical':
        return <AlertCircle size={16} className={styles.statusCritical} />;
      case 'offline':
        return <WifiOff size={16} className={styles.statusOffline} />;
    }
  };

  if (roomsLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading rooms...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Summary Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <Building2 size={20} className={styles.statIcon} />
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{clients?.length || 0}</span>
            <span className={styles.statLabel}>Clients</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <MapPin size={20} className={styles.statIcon} />
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{roomsWithStatus.length}</span>
            <span className={styles.statLabel}>Rooms</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <CheckCircle2 size={20} className={`${styles.statIcon} ${styles.healthy}`} />
          <div className={styles.statInfo}>
            <span className={styles.statValue}>
              {roomsWithStatus.filter(r => r.healthStatus === 'healthy').length}
            </span>
            <span className={styles.statLabel}>Healthy</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <AlertCircle size={20} className={`${styles.statIcon} ${styles.warning}`} />
          <div className={styles.statInfo}>
            <span className={styles.statValue}>
              {roomsWithStatus.filter(r => r.healthStatus === 'warning' || r.healthStatus === 'critical').length}
            </span>
            <span className={styles.statLabel}>Issues</span>
          </div>
        </div>
      </div>

      {/* Rooms grouped by client */}
      <div className={styles.clientGroups}>
        {roomsByClient.map(({ clientId, clientName, rooms }) => (
          <div key={clientId} className={styles.clientGroup}>
            <div className={styles.clientHeader}>
              <Building2 size={18} />
              <h2 className={styles.clientName}>{clientName}</h2>
              <span className={styles.roomCount}>{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
            </div>

            <div className={styles.roomGrid}>
              {rooms.map(room => (
                <button
                  key={room.id}
                  className={`${styles.roomCard} ${styles[room.healthStatus]}`}
                  onClick={() => handleRoomSelect(room)}
                >
                  <div className={styles.roomHeader}>
                    <div className={styles.roomName}>
                      <MapPin size={16} />
                      <span>{room.name}</span>
                    </div>
                    {getStatusIcon(room.healthStatus)}
                  </div>

                  <div className={styles.roomStats}>
                    <div className={styles.roomStat}>
                      <Wifi size={14} />
                      <span>{room.onlineControllers}/{room.controllerCount} controllers</span>
                    </div>
                    <div className={styles.roomStat}>
                      <Activity size={14} />
                      <span>{room.operationalDevices}/{room.deviceCount} devices</span>
                    </div>
                  </div>

                  {room.hasActiveSession && (
                    <div className={styles.sessionIndicator}>
                      <Clock size={14} />
                      <span>Session Active</span>
                    </div>
                  )}

                  <div className={styles.roomAction}>
                    <span>Select Room</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {roomsByClient.length === 0 && (
          <div className={styles.emptyState}>
            <MapPin size={48} />
            <h3>No Rooms Found</h3>
            <p>There are no rooms configured yet. Add rooms in the Admin section.</p>
          </div>
        )}
      </div>
    </div>
  );
}
