import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { getAuthToken } from '../components/ProtectedRoute';
import { Sun, Lightbulb, Power } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface LightingDevice {
  device_id: string;
  name: string;
  type: 'dimmer' | 'led_strip' | 'relay';
  state: boolean;
  brightness?: number;
  color?: string;
}

interface LightingController {
  controller_id: string;
  name: string;
  online: boolean;
  devices: LightingDevice[];
  lastHeartbeat?: number;
}

// Lighting device configurations
const LIGHTING_DEVICES: Record<string, { name: string; type: 'dimmer' | 'led_strip' | 'relay'; onCommand: string; offCommand: string }> = {
  'study_lights': { name: 'Study Lights', type: 'dimmer', onCommand: 'set_brightness', offCommand: 'set_brightness' },
  'boiler_lights': { name: 'Boiler Lights', type: 'dimmer', onCommand: 'set_brightness', offCommand: 'set_brightness' },
  'lab_lights_squares': { name: 'Lab Ceiling Lights', type: 'led_strip', onCommand: 'set_squares_brightness', offCommand: 'set_squares_brightness' },
  'lab_lights_grates': { name: 'Lab Floor Grates', type: 'led_strip', onCommand: 'set_grates_brightness', offCommand: 'set_grates_brightness' },
  'sconces': { name: 'Sconces', type: 'relay', onCommand: 'sconces_on', offCommand: 'sconces_off' },
  'crawlspace_lights': { name: 'Crawlspace Lights', type: 'relay', onCommand: 'crawlspace_on', offCommand: 'crawlspace_off' },
};

export function LightingControl() {
  const [controller, setController] = useState<LightingController | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCommands, setPendingCommands] = useState<Set<string>>(new Set());
  const wsUrl = window.location.protocol === 'https:' ? 'wss://sentientengine.ai/ws' : 'ws://sentientengine.ai/ws';
  const { isConnected: connected, events } = useWebSocket({ url: wsUrl });

  // Fetch devices on mount
  useEffect(() => {
    const fetchDevices = async () => {
      const token = getAuthToken();

      try {
        // Fetch controller status
        const controllersResponse = await fetch(`${API_URL}/controllers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        let isOnline = false;
        if (controllersResponse.ok) {
          const controllers = await controllersResponse.json();
          const mainLighting = controllers.find((c: any) => c.id === 'main_lighting');
          isOnline = mainLighting?.status === 'online';
        }

        // Fetch devices for main_lighting controller
        const devicesResponse = await fetch(`${API_URL}/devices/controller/main_lighting`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (devicesResponse.ok) {
          const apiDevices = await devicesResponse.json();

          const devices: LightingDevice[] = apiDevices
            .filter((d: any) => LIGHTING_DEVICES[d.id])
            .map((d: any) => {
              const config = LIGHTING_DEVICES[d.id];
              return {
                device_id: d.id,
                name: config.name,
                type: config.type,
                state: d.current_state ?? false,
                brightness: d.properties?.brightness,
                color: d.properties?.color,
              };
            });

          setController({
            controller_id: 'main_lighting',
            name: 'Main Lighting Controller',
            online: isOnline,
            devices,
          });
        }
      } catch (error) {
        console.error('Failed to fetch lighting devices:', error);
      }

      setLoading(false);
    };

    fetchDevices();
  }, []);

  // Listen for WebSocket events
  useEffect(() => {
    if (events.length === 0 || !controller) return;

    const latestEvent = events[0];

    // Handle controller heartbeat
    if (latestEvent.type === 'controller_heartbeat' && latestEvent.controller_id === 'main_lighting') {
      setController(prev => prev ? { ...prev, online: true, lastHeartbeat: Date.now() } : null);
    }

    // Handle controller online/offline
    if ((latestEvent.type === 'controller_online' || latestEvent.type === 'controller_offline') &&
      latestEvent.controller_id === 'main_lighting') {
      setController(prev => prev ? { ...prev, online: latestEvent.type === 'controller_online' } : null);
    }

    // Handle device state changes / acknowledgements
    if (latestEvent.type === 'device_state_changed' && latestEvent.controller_id === 'main_lighting') {
      const deviceId = latestEvent.device_id;
      if (!deviceId) return;

      // Clear pending state on acknowledgement
      if (latestEvent.metadata?.is_acknowledgement) {
        setPendingCommands(prev => {
          const next = new Set(prev);
          next.delete(deviceId);
          return next;
        });
      }

      // Update device state based on payload
      setController(prev => {
        if (!prev) return null;
        const devices = prev.devices.map(d => {
          if (d.device_id === deviceId) {
            const payload = latestEvent.payload?.new_state || latestEvent.payload;
            // Determine state from brightness or explicit state
            let newState = d.state;
            if (payload?.brightness !== undefined) {
              newState = payload.brightness > 0;
            } else if (payload?.state !== undefined) {
              newState = payload.state === true || payload.state === 1;
            } else if (payload?.power !== undefined) {
              newState = payload.power === true;
            }
            return { ...d, state: newState, brightness: payload?.brightness };
          }
          return d;
        });
        return { ...prev, devices };
      });
    }
  }, [events, controller]);

  const handleToggle = async (device: LightingDevice) => {
    if (!controller?.online) return;

    const config = LIGHTING_DEVICES[device.device_id];
    if (!config) return;

    const newState = !device.state;
    const command = newState ? config.onCommand : config.offCommand;

    // Build payload based on device type
    let payload: Record<string, any> = {};
    if (config.type === 'dimmer' || config.type === 'led_strip') {
      payload.brightness = newState ? 255 : 0;
    }

    // Mark as pending
    setPendingCommands(prev => new Set(prev).add(device.device_id));

    // Optimistically update UI
    setController(prev => {
      if (!prev) return null;
      const devices = prev.devices.map(d =>
        d.device_id === device.device_id ? { ...d, state: newState } : d
      );
      return { ...prev, devices };
    });

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/devices/${device.device_id}/command`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_id: device.device_id,
          command,
          payload
        })
      });

      if (!response.ok) {
        console.error('Failed to send lighting command:', await response.text());
        // Revert on failure
        setController(prev => {
          if (!prev) return null;
          const devices = prev.devices.map(d =>
            d.device_id === device.device_id ? { ...d, state: device.state } : d
          );
          return { ...prev, devices };
        });
      }
    } catch (error) {
      console.error('Error sending lighting command:', error);
      setPendingCommands(prev => {
        const next = new Set(prev);
        next.delete(device.device_id);
        return next;
      });
    }
  };

  const handleAllOn = async () => {
    if (!controller?.online) return;
    for (const device of controller.devices) {
      if (!device.state) {
        await handleToggle(device);
        await new Promise(r => setTimeout(r, 100)); // Small delay between commands
      }
    }
  };

  const handleAllOff = async () => {
    if (!controller?.online) return;
    for (const device of controller.devices) {
      if (device.state) {
        await handleToggle(device);
        await new Promise(r => setTimeout(r, 100)); // Small delay between commands
      }
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-group">
          <Sun size={32} className="page-icon" />
          <div>
            <h1 className="page-title">Lighting Control</h1>
            <p className="page-subtitle">Room lighting for staff use</p>
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
          <p>Loading lighting devices...</p>
        </div>
      ) : !controller ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <p>No lighting controller found</p>
        </div>
      ) : (
        <>
          {/* Master Controls */}
          <div className="master-controls">
            <button
              className="master-btn on"
              onClick={handleAllOn}
              disabled={!controller.online}
            >
              <Power size={24} />
              ALL LIGHTS ON
            </button>
            <button
              className="master-btn off"
              onClick={handleAllOff}
              disabled={!controller.online}
            >
              <Power size={24} />
              ALL LIGHTS OFF
            </button>
          </div>

          {/* Controller Status */}
          <div className="controller-status">
            <span className={controller.online ? 'online' : 'offline'}>
              {controller.online ? '● Controller Online' : '○ Controller Offline'}
            </span>
            {controller.lastHeartbeat && (
              <span className="heartbeat">
                Last seen: {Math.floor((Date.now() - controller.lastHeartbeat) / 1000)}s ago
              </span>
            )}
          </div>

          {/* Lighting Grid */}
          <div className="lighting-grid">
            {controller.devices.map(device => (
              <button
                key={device.device_id}
                className={`light-card ${device.state ? 'on' : 'off'} ${pendingCommands.has(device.device_id) ? 'pending' : ''}`}
                onClick={() => handleToggle(device)}
                disabled={!controller.online}
              >
                <Lightbulb
                  size={48}
                  className={`light-icon ${device.state ? 'on' : 'off'}`}
                />
                <span className="light-name">{device.name}</span>
                <span className="light-state">{device.state ? 'ON' : 'OFF'}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <style>{`
        .master-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .master-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1.25rem 2rem;
          border: none;
          border-radius: 1rem;
          font-size: 1.25rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .master-btn.on {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }

        .master-btn.on:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
        }

        .master-btn.off {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(107, 114, 128, 0.4);
        }

        .master-btn.off:hover:not(:disabled) {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
        }

        .master-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .controller-status {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 0.75rem 1rem;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }

        .controller-status .online {
          color: #10b981;
          font-weight: 600;
        }

        .controller-status .offline {
          color: #ef4444;
          font-weight: 600;
        }

        .controller-status .heartbeat {
          color: #9ca3af;
          margin-left: auto;
        }

        .lighting-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .light-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 2rem 1.5rem;
          border: 2px solid transparent;
          border-radius: 1.5rem;
          background: rgba(30, 41, 59, 0.6);
          cursor: pointer;
          transition: all 0.25s ease;
          min-height: 200px;
        }

        .light-card:hover:not(:disabled) {
          transform: translateY(-4px);
        }

        .light-card.on {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%);
          border-color: #fbbf24;
          box-shadow: 0 8px 30px rgba(251, 191, 36, 0.3);
        }

        .light-card.off {
          background: rgba(30, 41, 59, 0.6);
          border-color: rgba(107, 114, 128, 0.3);
        }

        .light-card.pending {
          opacity: 0.7;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.4; }
        }

        .light-card:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .light-icon {
          transition: all 0.3s;
        }

        .light-icon.on {
          color: #fbbf24;
          filter: drop-shadow(0 0 15px rgba(251, 191, 36, 0.8));
        }

        .light-icon.off {
          color: #6b7280;
        }

        .light-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #e0e7ff;
          text-align: center;
        }

        .light-state {
          font-size: 0.875rem;
          font-weight: 700;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          letter-spacing: 0.05em;
        }

        .light-card.on .light-state {
          background: #fbbf24;
          color: #1f2937;
        }

        .light-card.off .light-state {
          background: #4b5563;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
