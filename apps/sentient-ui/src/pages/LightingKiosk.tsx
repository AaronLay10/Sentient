import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { SentientEye } from '../components/SentientEye/SentientEye';

// Production URLs for kiosk - always use sentientengine.ai
// The kiosk runs locally but needs to connect to the production server
const API_URL = 'https://sentientengine.ai/api';
const WS_URL = 'wss://sentientengine.ai/ws';

interface LightingDevice {
  id: string;
  name: string;
  state: boolean;
  onCommand: string;
  offCommand: string;
  type: 'dimmer' | 'led_strip' | 'relay';
}

// Lighting device configurations
const LIGHTING_DEVICES: LightingDevice[] = [
  { id: 'study_lights', name: 'STUDY', type: 'dimmer', onCommand: 'set_brightness', offCommand: 'set_brightness', state: false },
  { id: 'boiler_lights', name: 'BOILER', type: 'dimmer', onCommand: 'set_brightness', offCommand: 'set_brightness', state: false },
  { id: 'lab_lights_squares', name: 'LAB CEILING', type: 'led_strip', onCommand: 'set_squares_brightness', offCommand: 'set_squares_brightness', state: false },
  { id: 'lab_lights_grates', name: 'LAB GRATES', type: 'led_strip', onCommand: 'set_grates_brightness', offCommand: 'set_grates_brightness', state: false },
  { id: 'sconces', name: 'SCONCES', type: 'relay', onCommand: 'sconces_on', offCommand: 'sconces_off', state: false },
  { id: 'crawlspace_lights', name: 'CRAWLSPACE', type: 'relay', onCommand: 'crawlspace_on', offCommand: 'crawlspace_off', state: false },
];

export function LightingKiosk() {
  const [devices, setDevices] = useState<LightingDevice[]>(LIGHTING_DEVICES);
  const [controllerOnline, setControllerOnline] = useState(false);
  const [pendingCommands, setPendingCommands] = useState<Set<string>>(new Set());
  const { isConnected: wsConnected, events } = useWebSocket({ url: WS_URL });

  // Listen for WebSocket events
  useEffect(() => {
    if (events.length === 0) return;
    const latestEvent = events[0];

    if (latestEvent.type === 'controller_heartbeat' && latestEvent.controller_id === 'main_lighting') {
      setControllerOnline(true);
    }

    if (latestEvent.controller_id === 'main_lighting') {
      if (latestEvent.type === 'controller_online') setControllerOnline(true);
      if (latestEvent.type === 'controller_offline') setControllerOnline(false);
    }

    if (latestEvent.type === 'device_state_changed' && latestEvent.controller_id === 'main_lighting') {
      const deviceId = latestEvent.device_id;
      if (!deviceId) return;

      if (latestEvent.metadata?.is_acknowledgement) {
        setPendingCommands(prev => { const n = new Set(prev); n.delete(deviceId); return n; });
      }

      setDevices(prev => prev.map(d => {
        if (d.id === deviceId) {
          const payload = latestEvent.payload?.new_state || latestEvent.payload;
          let newState = d.state;
          if (payload?.brightness !== undefined) newState = payload.brightness > 0;
          else if (payload?.state !== undefined) newState = payload.state === true || payload.state === 1;
          else if (payload?.power !== undefined) newState = payload.power === true;
          return { ...d, state: newState };
        }
        return d;
      }));
    }
  }, [events]);

  const sendCommand = async (deviceId: string, command: string, payload: Record<string, any>) => {
    try {
      const response = await fetch(`${API_URL}/kiosk/lighting/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, command, payload })
      });
      return response.ok;
    } catch (error) {
      console.error('Command failed:', error);
      return false;
    }
  };

  const handleToggle = async (device: LightingDevice) => {
    const newState = !device.state;
    const command = newState ? device.onCommand : device.offCommand;
    const payload: Record<string, any> = {};

    if (device.type === 'dimmer' || device.type === 'led_strip') {
      payload.brightness = newState ? 255 : 0;
    }

    setPendingCommands(prev => new Set(prev).add(device.id));
    setDevices(prev => prev.map(d => d.id === device.id ? { ...d, state: newState } : d));

    const success = await sendCommand(device.id, command, payload);
    if (!success) {
      setDevices(prev => prev.map(d => d.id === device.id ? { ...d, state: device.state } : d));
      setPendingCommands(prev => { const n = new Set(prev); n.delete(device.id); return n; });
    }
  };

  const handleAllOn = async () => {
    for (const device of devices) {
      if (!device.state) {
        await handleToggle(device);
        await new Promise(r => setTimeout(r, 50));
      }
    }
  };

  const handleAllOff = async () => {
    for (const device of devices) {
      if (device.state) {
        await handleToggle(device);
        await new Promise(r => setTimeout(r, 50));
      }
    }
  };

  return (
    <div className="kiosk-root">
      {/* Background effects */}
      <div className="neural-grid" />
      <div className="scan-line" />

      {/* Header */}
      <header className="kiosk-header">
        <div className="header-left">
          <h1 className="logo-text">SENTIENT ENGINE</h1>
          <span className="subtitle">LIGHTING CONTROL</span>
        </div>
        <div className={`status-pill ${wsConnected && controllerOnline ? 'online' : 'offline'}`}>
          <span className="status-dot" />
          {wsConnected && controllerOnline ? 'SYSTEM ONLINE' : 'OFFLINE'}
        </div>
      </header>

      {/* Main Content */}
      <main className="kiosk-main">
        {/* Eye Section - spinning rings but no outer tick marks */}
        <div className="eye-section">
          <SentientEye hideTickMarks />
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          <div className={`status-badge ${wsConnected && controllerOnline ? 'healthy' : 'offline'}`}>
            <span className="badge-dot" />
            SYSTEM {wsConnected && controllerOnline ? 'HEALTHY' : 'OFFLINE'}
          </div>
        </div>

        {/* Master Controls */}
        <div className="master-controls">
          <button className="master-btn all-on" onClick={handleAllOn}>
            ALL ON
          </button>
          <button className="master-btn all-off" onClick={handleAllOff}>
            ALL OFF
          </button>
        </div>

        {/* Light Buttons */}
        <div className="lights-grid">
          {devices.map(device => (
            <button
              key={device.id}
              className={`light-btn ${device.state ? 'on' : 'off'} ${pendingCommands.has(device.id) ? 'pending' : ''}`}
              onClick={() => handleToggle(device)}
            >
              <span className="light-name">{device.name}</span>
              <span className="light-status">{device.state ? 'ON' : 'OFF'}</span>
            </button>
          ))}
        </div>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }

        .kiosk-root {
          width: 1280px;
          height: 800px;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-primary) 100%);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
        }

        .neural-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--border-color) 1px, transparent 1px),
            linear-gradient(90deg, var(--border-color) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
        }

        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--border-glow), transparent);
          animation: scan 4s linear infinite;
          pointer-events: none;
        }

        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        .kiosk-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          border-bottom: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 10;
        }

        .header-left {
          display: flex;
          flex-direction: column;
        }

        .logo-text {
          font-size: 24px;
          font-weight: 700;
          color: var(--accent-primary);
          letter-spacing: 6px;
          text-shadow: var(--glow-primary);
        }

        .subtitle {
          font-size: 12px;
          color: var(--text-muted);
          letter-spacing: 4px;
          margin-top: 2px;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        .status-pill.online {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: var(--status-success);
        }

        .status-pill.offline {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: var(--status-error);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .kiosk-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-evenly;
          padding: 10px 60px 30px;
          position: relative;
          z-index: 5;
        }

        .eye-section {
          width: 280px;
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-bar {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 32px;
          border-radius: 28px;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 2px;
        }

        .status-badge.healthy {
          background: rgba(16, 185, 129, 0.15);
          border: 2px solid var(--status-success);
          color: var(--status-success);
        }

        .status-badge.offline {
          background: rgba(107, 114, 128, 0.15);
          border: 2px solid var(--status-offline);
          color: var(--status-offline);
        }

        .badge-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        .master-controls {
          display: flex;
          gap: 24px;
        }

        .master-btn {
          padding: 18px 64px;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 3px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .master-btn:active {
          transform: scale(0.97);
        }

        .master-btn.all-on {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
        }

        .master-btn.all-off {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          color: white;
          box-shadow: 0 4px 20px rgba(107, 114, 128, 0.3);
        }

        .master-btn.all-off:hover {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
        }

        .lights-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 20px;
          width: 100%;
          max-width: 1160px;
        }

        .light-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 24px 16px;
          border: 2px solid transparent;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .light-btn:active {
          transform: scale(0.96);
        }

        .light-btn.on {
          background: var(--gradient-primary);
          background-size: 200% 200%;
          opacity: 0.9;
          border-color: var(--accent-primary);
          box-shadow: var(--glow-primary);
        }

        .light-btn.off {
          background: var(--bg-card);
          border-color: var(--border-color);
        }

        .light-btn.pending {
          opacity: 0.5;
          animation: pulse-btn 0.6s infinite;
        }

        @keyframes pulse-btn {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.25; }
        }

        .light-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 1.5px;
          text-align: center;
        }

        .light-status {
          font-size: 14px;
          font-weight: 800;
          padding: 6px 16px;
          border-radius: 14px;
          letter-spacing: 1.5px;
        }

        .light-btn.on .light-status {
          background: var(--accent-primary);
          color: var(--bg-primary);
        }

        .light-btn.off .light-status {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
