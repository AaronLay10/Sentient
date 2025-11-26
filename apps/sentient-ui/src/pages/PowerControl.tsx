import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { getAuthToken } from '../components/ProtectedRoute';
import { Power, Zap } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface PowerController {
  controller_id: string;
  name: string;
  online: boolean;
  devices: PowerDevice[];
  lastHeartbeat?: number;
}

interface PowerDevice {
  device_id: string;
  name: string;
  state: boolean; // on/off
  relayNumber?: number;
}

interface ApiDevice {
  id: string;
  controllerId: string;
  friendly_name: string;
  device_type: string;
  device_category: string;
  properties?: any;
  current_state: boolean;
  state_updated_at?: string;
  created_at: string;
  actions?: any[];
}

export function PowerControl() {
  const [powerControllers, setPowerControllers] = useState<Map<string, PowerController>>(new Map());
  const [loading, setLoading] = useState(true);
  const wsUrl = window.location.protocol === 'https:' ? 'wss://sentientengine.ai/ws' : 'ws://sentientengine.ai/ws';
  const { isConnected: connected, events } = useWebSocket({ url: wsUrl });

  // Fetch devices and controller status from API on mount
  useEffect(() => {
    const fetchDevices = async () => {
      const controllerIds = [
        'power_control_upper_right',
        'power_control_lower_right',
        'power_control_lower_left'
      ];

      const token = getAuthToken();
      const initialControllers = new Map<string, PowerController>();

      // Fetch all controllers with their online status
      let controllerStatuses = new Map<string, boolean>();
      try {
        const controllersResponse = await fetch(`${API_URL}/controllers`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (controllersResponse.ok) {
          const controllers = await controllersResponse.json();
          controllers.forEach((ctrl: any) => {
            controllerStatuses.set(ctrl.id, ctrl.status === 'online');
          });
        }
      } catch (error) {
        console.error('Failed to fetch controller statuses:', error);
      }

      // Fetch devices for each controller
      for (const controllerId of controllerIds) {
        try {
          const response = await fetch(`${API_URL}/devices/controller/${controllerId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const apiDevices: ApiDevice[] = await response.json();

            initialControllers.set(controllerId, {
              controller_id: controllerId,
              name: controllerId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              online: controllerStatuses.get(controllerId) || false,
              devices: apiDevices.map(d => ({
                device_id: d.id,
                name: d.friendly_name,
                state: d.current_state ?? false, // Use persisted state from database
              })),
            });
          } else {
            // Controller exists but has no devices yet
            initialControllers.set(controllerId, {
              controller_id: controllerId,
              name: controllerId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              online: controllerStatuses.get(controllerId) || false,
              devices: [],
            });
          }
        } catch (error) {
          console.error(`Failed to fetch devices for ${controllerId}:`, error);
          // Initialize with empty controller on error
          initialControllers.set(controllerId, {
            controller_id: controllerId,
            name: controllerId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            online: false,
            devices: [],
          });
        }
      }

      setPowerControllers(initialControllers);
      setLoading(false);

      // Request current status from each online controller
      for (const controllerId of controllerIds) {
        if (controllerStatuses.get(controllerId)) {
          try {
            await fetch(`${API_URL}/controllers/${controllerId}/request-status`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            console.log(`📋 Requested status from ${controllerId}`);
          } catch (error) {
            console.error(`Failed to request status from ${controllerId}:`, error);
          }
        }
      }
    };

    fetchDevices();
  }, []);

  // Listen for WebSocket events
  useEffect(() => {
    if (events.length === 0) return;

    // Events are prepended to the array, so index 0 is the newest
    const latestEvent = events[0];
    console.log('PowerControl received event:', latestEvent.type, latestEvent.controller_id);

    // Handle controller heartbeat
    if (latestEvent.type === 'controller_heartbeat') {
      const controllerId = latestEvent.controller_id;
      if (controllerId?.includes('power_control')) {
        setPowerControllers(prev => {
          const updated = new Map(prev);
          const controller = updated.get(controllerId);
          if (controller) {
            controller.online = true;
            controller.lastHeartbeat = Date.now();
          }
          return updated;
        });
      }
    }

    // Handle controller online/offline
    if (latestEvent.type === 'controller_online' || latestEvent.type === 'controller_offline') {
      const controllerId = latestEvent.controller_id;
      if (controllerId?.includes('power_control')) {
        setPowerControllers(prev => {
          const updated = new Map(prev);
          const controller = updated.get(controllerId);
          if (controller) {
            controller.online = latestEvent.type === 'controller_online';
          }
          return updated;
        });
      }
    }

    // Handle device state changes (including command acknowledgements)
    if (latestEvent.type === 'device_state_changed') {
      const controllerId = latestEvent.controller_id;
      const deviceId = latestEvent.device_id;
      const isAck = latestEvent.metadata?.is_acknowledgement;

      if (isAck) {
        console.log(`⚡ ACK received: ${controllerId}/${deviceId} -> command: ${latestEvent.payload?.command_acknowledged}`);
      }

      if (controllerId?.includes('power_control')) {
        setPowerControllers(prev => {
          const updated = new Map(prev);
          const controller = updated.get(controllerId);

          if (controller) {
            const deviceIndex = controller.devices.findIndex(d => d.device_id === deviceId);
            // Check for power (boolean), state (0/1), or on (boolean) - firmware sends both power and state
            const newState = latestEvent.payload?.new_state;
            const deviceState = newState?.power ?? (newState?.state === 1 || newState?.state === true) ?? newState?.on ?? false;

            if (deviceIndex >= 0) {
              // Only update existing device state (devices come from database via API)
              controller.devices[deviceIndex].state = deviceState;
            }
            // Note: We don't add new devices here - devices must be registered in database first
          }
          return updated;
        });
      }
    }
  }, [events]);

  const handleSetDeviceState = async (_controllerId: string, deviceId: string, newState: boolean) => {
    // Send command to API (DO NOT optimistically update - wait for controller acknowledgment)
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/devices/${deviceId}/control`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ device_id: deviceId, state: newState })
      });

      if (!response.ok) {
        console.error('Failed to send device command:', await response.text());
      } else {
        console.log(`Command sent successfully: ${deviceId} -> ${newState ? 'ON' : 'OFF'}`);
        // UI will update when controller sends back state change via WebSocket
      }
    } catch (error) {
      console.error('Error sending device command:', error);
    }
  };

  const handlePowerAllDevices = async (controllerId: string, newState: boolean) => {
    const controller = powerControllers.get(controllerId);
    if (!controller || controller.devices.length === 0) return;

    console.log(`🔌 Powering ${newState ? 'ON' : 'OFF'} all devices for ${controllerId}`);
    
    // Send commands for all devices in parallel
    const promises = controller.devices.map(device => 
      handleSetDeviceState(controllerId, device.device_id, newState)
    );

    await Promise.all(promises);
  };

  const handleRefreshStatus = async (controllerId: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/controllers/${controllerId}/request-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log(`✅ Status refresh requested for ${controllerId}`);
      } else {
        console.error(`❌ Failed to request status from ${controllerId}`);
      }
    } catch (error) {
      console.error(`❌ Error requesting status from ${controllerId}:`, error);
    }
  };

  return (
    <>
      <div className="page-container">
        <div className="page-header">
          <div className="page-title-group">
            <Power size={32} className="page-icon" />
            <div>
              <h1 className="page-title">Power Control</h1>
              <p className="page-subtitle">Master power control for all room controllers</p>
            </div>
          </div>

          <div className="status-badge" style={{
            backgroundColor: connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: connected ? '#10b981' : '#ef4444',
            border: `1px solid ${connected ? '#10b981' : '#ef4444'}`,
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}>
            {connected ? '● Connected' : '○ Disconnected'}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
            <p>Loading devices from database...</p>
          </div>
        ) : (
          <div className="power-control-grid">
            {Array.from(powerControllers.values()).map(controller => (
              <div key={controller.controller_id} className="power-controller-card">
                <div className="controller-header">
                  <div className="controller-info">
                    <Zap size={24} className={controller.online ? 'icon-online' : 'icon-offline'} />
                    <div>
                      <h3 className="controller-name">{controller.name}</h3>
                      <p className="controller-status">
                        {controller.online ? (
                          <span style={{ color: '#10b981' }}>● Online</span>
                        ) : (
                          <span style={{ color: '#ef4444' }}>○ Offline</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    {controller.online && controller.lastHeartbeat && (
                      <div className="heartbeat-time">
                        Last seen: {Math.floor((Date.now() - controller.lastHeartbeat) / 1000)}s ago
                      </div>
                    )}
                    {controller.devices.length > 0 && (
                      <div className="power-all-buttons">
                        <button
                          className="btn-power-all-on"
                          onClick={() => handlePowerAllDevices(controller.controller_id, true)}
                          disabled={!controller.online}
                          title="Turn all devices ON"
                        >
                          All ON
                        </button>
                        <button
                          className="btn-power-all-off"
                          onClick={() => handlePowerAllDevices(controller.controller_id, false)}
                          disabled={!controller.online}
                          title="Turn all devices OFF"
                        >
                          All OFF
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {controller.devices.length === 0 ? (
                  <div className="no-devices">
                    <p>No devices registered yet</p>
                    <small>Waiting for controller to report devices...</small>
                  </div>
                ) : (
                  <div className="device-grid-compact">
                    {controller.devices.map(device => (
                      <div key={device.device_id} className={`device-row ${device.state ? 'state-on' : 'state-off'}`}>
                        <div className={`state-indicator ${device.state ? 'on' : 'off'}`}>
                          {device.state ? 'ON' : 'OFF'}
                        </div>
                        <div className="device-info-compact">
                          <span className="device-name-compact">{device.name}</span>
                        </div>
                        <div className="button-pair">
                          <button
                            className={`btn-on ${device.state ? 'active' : ''}`}
                            onClick={() => handleSetDeviceState(controller.controller_id, device.device_id, true)}
                            disabled={!controller.online}
                          >
                            ON
                          </button>
                          <button
                            className={`btn-off ${!device.state ? 'active' : ''}`}
                            onClick={() => handleSetDeviceState(controller.controller_id, device.device_id, false)}
                            disabled={!controller.online}
                          >
                            OFF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <style>{`
        .power-control-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .power-controller-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(124, 58, 237, 0.2);
          border-radius: 1rem;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .controller-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(124, 58, 237, 0.1);
        }

        .controller-info {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .controller-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: #e0e7ff;
          margin: 0;
        }

        .controller-status {
          font-size: 0.875rem;
          margin: 0.25rem 0 0 0;
          font-weight: 500;
        }

        .icon-online {
          color: #10b981;
        }

        .icon-offline {
          color: #6b7280;
        }

        .heartbeat-time {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .no-devices {
          text-align: center;
          padding: 3rem 1rem;
          color: #9ca3af;
        }

        .no-devices p {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
        }

        .no-devices small {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .device-grid-compact {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .device-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 0.375rem;
          border-left: 3px solid transparent;
          transition: all 0.15s;
        }

        .device-row.state-on {
          border-left-color: #10b981;
          background: rgba(16, 185, 129, 0.08);
        }

        .device-row.state-off {
          border-left-color: #6b7280;
        }

        .state-indicator {
          font-size: 0.625rem;
          font-weight: 700;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          min-width: 32px;
          text-align: center;
          letter-spacing: 0.05em;
        }

        .state-indicator.on {
          background: #10b981;
          color: white;
        }

        .state-indicator.off {
          background: #4b5563;
          color: #9ca3af;
        }

        .device-info-compact {
          flex: 1;
          min-width: 0;
        }

        .device-name-compact {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #e0e7ff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .button-pair {
          display: flex;
          gap: 0.25rem;
        }

        .btn-on, .btn-off {
          padding: 0.3rem 0.6rem;
          border: none;
          border-radius: 0.25rem;
          font-weight: 600;
          font-size: 0.6875rem;
          cursor: pointer;
          transition: all 0.15s;
          min-width: 36px;
        }

        .btn-on {
          background: rgba(16, 185, 129, 0.2);
          color: #6b7280;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .btn-on:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.4);
          color: #10b981;
        }

        .btn-on.active {
          background: #10b981;
          color: white;
          border-color: #10b981;
        }

        .btn-off {
          background: rgba(107, 114, 128, 0.2);
          color: #6b7280;
          border: 1px solid rgba(107, 114, 128, 0.3);
        }

        .btn-off:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.3);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.5);
        }

        .btn-off.active {
          background: #6b7280;
          color: white;
          border-color: #6b7280;
        }

        .btn-on:disabled, .btn-off:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .power-all-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn-power-all-on, .btn-power-all-off {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          font-weight: 600;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .btn-power-all-on {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }

        .btn-power-all-on:hover:not(:disabled) {
          background: #10b981;
          color: white;
          border-color: #10b981;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
        }

        .btn-power-all-off {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .btn-power-all-off:hover:not(:disabled) {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
        }

        .btn-power-all-on:disabled, .btn-power-all-off:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        `}</style>
      </div>
    </>
  );
}
