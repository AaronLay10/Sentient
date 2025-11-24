import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { getAuthToken } from '../components/ProtectedRoute';
import { Power, Zap, ZapOff } from 'lucide-react';

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
  created_at: string;
  actions?: any[];
}

export function PowerControl() {
  const [powerControllers, setPowerControllers] = useState<Map<string, PowerController>>(new Map());
  const [loading, setLoading] = useState(true);
  const { isConnected: connected, events } = useWebSocket({ url: 'ws://localhost:3002' });

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
                state: false, // Default state, will be updated by WebSocket
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
    };

    fetchDevices();
  }, []);

  // Listen for WebSocket events
  useEffect(() => {
    if (events.length === 0) return;

    const latestEvent = events[events.length - 1];
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

    // Handle device state changes
    if (latestEvent.type === 'device_state_changed') {
      const controllerId = latestEvent.controller_id;
      const deviceId = latestEvent.device_id;

      if (controllerId?.includes('power_control')) {
        setPowerControllers(prev => {
          const updated = new Map(prev);
          const controller = updated.get(controllerId);

          if (controller) {
            const deviceIndex = controller.devices.findIndex(d => d.device_id === deviceId);
            const deviceState = latestEvent.payload?.new_state?.on ?? latestEvent.payload?.new_state?.state ?? false;

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

  const handleToggleDevice = async (controllerId: string, deviceId: string, currentState: boolean) => {
    const newState = !currentState;

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
              {controller.online && controller.lastHeartbeat && (
                <div className="heartbeat-time">
                  Last seen: {Math.floor((Date.now() - controller.lastHeartbeat) / 1000)}s ago
                </div>
              )}
            </div>

            {controller.devices.length === 0 ? (
              <div className="no-devices">
                <p>No devices registered yet</p>
                <small>Waiting for controller to report devices...</small>
              </div>
            ) : (
              <div className="device-grid">
                {controller.devices.map(device => (
                  <div key={device.device_id} className="device-control">
                    <div className="device-info">
                      <span className="device-name">{device.name}</span>
                      <span className="device-id">{device.device_id}</span>
                    </div>
                    <button
                      className={`power-button ${device.state ? 'on' : 'off'}`}
                      onClick={() => handleToggleDevice(controller.controller_id, device.device_id, device.state)}
                      disabled={!controller.online}
                    >
                      {device.state ? (
                        <>
                          <Zap size={16} />
                          <span>ON</span>
                        </>
                      ) : (
                        <>
                          <ZapOff size={16} />
                          <span>OFF</span>
                        </>
                      )}
                    </button>
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

        .device-grid {
          display: grid;
          gap: 1rem;
        }

        .device-control {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(124, 58, 237, 0.1);
          border-radius: 0.5rem;
          transition: all 0.2s;
        }

        .device-control:hover {
          border-color: rgba(124, 58, 237, 0.3);
          background: rgba(30, 41, 59, 0.6);
        }

        .device-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .device-name {
          font-size: 1rem;
          font-weight: 500;
          color: #e0e7ff;
        }

        .device-id {
          font-size: 0.75rem;
          color: #9ca3af;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .power-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 80px;
          justify-content: center;
        }

        .power-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .power-button.on {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .power-button.on:hover:not(:disabled) {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .power-button.off {
          background: linear-gradient(135deg, #6b7280, #4b5563);
          color: white;
        }

        .power-button.off:hover:not(:disabled) {
          background: linear-gradient(135deg, #4b5563, #374151);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
        }
        `}</style>
      </div>
    </>
  );
}
