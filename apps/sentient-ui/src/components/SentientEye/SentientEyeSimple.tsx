import { useEffect, useState } from 'react';
import './SentientEye.css';

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical' | 'offline';
  controllers: {
    total: number;
    online: number;
    offline: number;
    warnings: number;
    errors: number;
  };
  devices: {
    total: number;
    operational: number;
    warnings: number;
    errors: number;
  };
  issues: Array<{
    id: string;
    severity: 'warning' | 'critical';
    message: string;
    source: string;
    timestamp: string;
  }>;
}

interface SentientEyeSimpleProps {
  health: SystemHealth;
}

export function SentientEyeSimple({ health }: SentientEyeSimpleProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [devOverrideHealth, setDevOverrideHealth] = useState<SystemHealth['overall'] | null>(null);

  // Use dev override if set, otherwise use actual health
  const effectiveHealth = devOverrideHealth || health.overall;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('.simple-eye-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Limit the movement range
      const maxOffset = 15;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const scale = Math.min(1, maxOffset / Math.max(distance, 1));

      setMousePos({
        x: deltaX * scale,
        y: deltaY * scale,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getHealthColor = (status: SystemHealth['overall']) => {
    switch (status) {
      case 'healthy':
        return 'var(--status-healthy)';
      case 'warning':
        return 'var(--status-warning)';
      case 'critical':
        return 'var(--status-critical)';
      case 'offline':
        return 'var(--status-offline)';
      default:
        return 'var(--status-unknown)';
    }
  };

  const healthColor = getHealthColor(effectiveHealth);

  return (
    <div className="simple-eye-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Developer Controls */}
      <div style={{
        position: 'absolute',
        bottom: '-60px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'rgba(10, 14, 20, 0.95)',
        border: '1px solid rgba(0, 217, 255, 0.3)',
        borderRadius: '4px',
        padding: '8px',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginRight: '6px' }}>DEV:</span>
        {(['actual', 'healthy', 'warning', 'critical'] as const).map((status) => {
          const isActive = status === 'actual' ? devOverrideHealth === null : devOverrideHealth === status;
          const statusColor = status === 'actual' ? 'rgba(0, 217, 255, 0.3)' :
            status === 'healthy' ? 'var(--status-healthy)' :
            status === 'warning' ? 'var(--status-warning)' : 'var(--status-critical)';

          return (
            <button
              key={status}
              onClick={() => setDevOverrideHealth(status === 'actual' ? null : status)}
              style={{
                padding: '4px 8px',
                fontSize: '0.65rem',
                background: isActive ? `${statusColor}33` : `${statusColor}11`,
                border: `1px solid ${statusColor}`,
                color: statusColor,
                cursor: 'pointer',
                borderRadius: '2px',
                textTransform: 'uppercase',
              }}
            >
              {status === 'actual' ? 'ACT' : status.substring(0, 4)}
            </button>
          );
        })}
      </div>

      {/* Outer HUD Rings */}
      <svg className="hud-rings" viewBox="0 0 500 500" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%' }}>
        <circle cx="250" cy="250" r="220" fill="none" stroke="rgba(0, 217, 255, 0.2)" strokeWidth="1" />
        <circle cx="250" cy="250" r="180" fill="none" stroke="rgba(0, 217, 255, 0.15)" strokeWidth="1" />

        {/* Tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const isLarge = i % 5 === 0;
          const r1 = isLarge ? 195 : 205;
          const r2 = 215;
          return (
            <line
              key={i}
              x1={250 + r1 * Math.cos(angle)}
              y1={250 + r1 * Math.sin(angle)}
              x2={250 + r2 * Math.cos(angle)}
              y2={250 + r2 * Math.sin(angle)}
              stroke="rgba(0, 217, 255, 0.4)"
              strokeWidth={isLarge ? "2" : "1"}
            />
          );
        })}
      </svg>

      {/* Rotating ring around eye */}
      <svg viewBox="0 0 360 360" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '80%', pointerEvents: 'none' }}>
        <g className={`rotating-outer-ring ${effectiveHealth === 'warning' ? 'status-warning' : effectiveHealth === 'critical' ? 'status-critical' : ''}`}>
          <circle
            cx="180"
            cy="180"
            r="150"
            fill="none"
            stroke={
              effectiveHealth === 'critical'
                ? 'rgba(255, 51, 85, 1.0)'
                : effectiveHealth === 'warning'
                ? 'rgba(255, 170, 0, 1.0)'
                : 'rgba(0, 217, 255, 1.0)'
            }
            strokeWidth="6"
            strokeDasharray="117.75 117.75"
            strokeDashoffset="0"
          />
          <circle
            cx="180"
            cy="180"
            r="150"
            fill="none"
            stroke={
              effectiveHealth === 'critical'
                ? 'rgba(200, 30, 60, 1.0)'
                : effectiveHealth === 'warning'
                ? 'rgba(255, 200, 0, 1.0)'
                : 'rgba(255, 170, 50, 1.0)'
            }
            strokeWidth="6"
            strokeDasharray="117.75 117.75"
            strokeDashoffset="-117.75"
          />
        </g>
      </svg>

      {/* The Eye */}
      <div className="realistic-eye" style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '250px',
        height: '250px',
      }}>
        <div className="eye-sclera" style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 40% 40%, rgba(255, 255, 255, 0.15), rgba(20, 25, 35, 0.95))',
        }}>
          {/* Iris */}
          <div className="eye-iris" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${mousePos.x}px), calc(-50% + ${mousePos.y}px))`,
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            transition: 'transform 0.1s ease-out',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%,
                ${healthColor}88,
                ${healthColor}55 30%,
                ${healthColor}33 60%,
                rgba(0, 0, 0, 0.9) 100%)`,
              boxShadow: `0 0 30px ${healthColor}66, inset 0 0 20px rgba(0, 0, 0, 0.8)`,
            }}>
              {/* Pupil */}
              <div className="eye-pupil" style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, rgba(30, 30, 40, 0.9), rgba(0, 0, 0, 1))',
                boxShadow: `0 0 20px ${healthColor}99, inset 0 0 10px rgba(0, 0, 0, 1)`,
              }}>
                {/* Highlight */}
                <div style={{
                  position: 'absolute',
                  top: '20%',
                  left: '20%',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 0 5px rgba(255, 255, 255, 0.6)',
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
