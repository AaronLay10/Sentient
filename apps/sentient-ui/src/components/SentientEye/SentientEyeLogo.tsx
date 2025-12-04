import { useEffect, useState } from 'react';

interface SentientEyeLogoProps {
  size?: number;
}

export function SentientEyeLogo({ size = 48 }: SentientEyeLogoProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('.eye-logo-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      const maxOffset = size * 0.08;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const scale = Math.min(1, maxOffset / Math.max(distance, 1));

      setMousePos({
        x: deltaX * scale,
        y: deltaY * scale,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [size]);

  const irisSize = size * 0.5;
  const pupilSize = size * 0.18;

  return (
    <div
      className="eye-logo-container"
      style={{
        width: size,
        height: size,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Outer ring */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="rgba(0, 217, 255, 0.3)"
          strokeWidth="1"
        />
        <g style={{ transformOrigin: '50% 50%', animation: 'spin 20s linear infinite' }}>
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="rgba(0, 217, 255, 0.8)"
            strokeWidth="2"
            strokeDasharray="33 33"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="rgba(255, 170, 50, 0.8)"
            strokeWidth="2"
            strokeDasharray="33 33"
            strokeDashoffset="-33"
          />
        </g>
      </svg>

      {/* Eye sclera */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: size * 0.7,
          height: size * 0.7,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 40% 40%, rgba(255, 255, 255, 0.1), rgba(10, 14, 26, 0.95))',
          boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Iris */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${mousePos.x}px), calc(-50% + ${mousePos.y}px))`,
            width: irisSize,
            height: irisSize,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%,
              rgba(0, 217, 255, 0.6),
              rgba(0, 217, 255, 0.4) 30%,
              rgba(0, 217, 255, 0.2) 60%,
              rgba(0, 0, 0, 0.9) 100%)`,
            boxShadow: '0 0 10px rgba(0, 217, 255, 0.4), inset 0 0 8px rgba(0, 0, 0, 0.8)',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Pupil */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: pupilSize,
              height: pupilSize,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, rgba(20, 20, 30, 0.9), rgba(0, 0, 0, 1))',
              boxShadow: '0 0 8px rgba(0, 217, 255, 0.6)',
            }}
          >
            {/* Highlight */}
            <div
              style={{
                position: 'absolute',
                top: '20%',
                left: '25%',
                width: pupilSize * 0.3,
                height: pupilSize * 0.3,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.7)',
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
