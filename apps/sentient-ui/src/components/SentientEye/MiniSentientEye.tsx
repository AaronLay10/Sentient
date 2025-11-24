/**
 * Mini Sentient Eye - Scaled down version of the main eye for sidebar logo
 * Maintains full complexity of the main eye
 */
import './SentientEye.css';
import './MiniSentientEye.css';

interface MiniSentientEyeProps {
  size?: number; // Overall size in pixels (default 100)
}

export function MiniSentientEye({ size = 100 }: MiniSentientEyeProps) {
  return (
    <div style={{ width: `${size}px`, height: `${size}px`, position: 'relative' }}>
      {/* Outer rotating ring */}
      <svg viewBox="0 0 360 360" style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${size}px`,
        height: `${size}px`,
        overflow: 'visible'
      }}>
        <defs>
          <filter id="miniGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* 3D shadow layer */}
        <circle
          cx="180"
          cy="180"
          r="150"
          fill="none"
          stroke="rgba(0, 0, 0, 0.8)"
          strokeWidth="8"
          transform="translate(3, 3)"
        />

        {/* Rotating ring with cyan and orange segments - BRIGHTER AND THICKER */}
        <g className="rotating-outer-ring" style={{ filter: 'url(#miniGlow)' }}>
          <circle
            cx="180"
            cy="180"
            r="150"
            fill="none"
            stroke="rgba(0, 217, 255, 1.0)"
            strokeWidth="8"
            strokeDasharray="117.75 117.75"
            strokeDashoffset="0"
          />
          <circle
            cx="180"
            cy="180"
            r="150"
            fill="none"
            stroke="rgba(255, 200, 50, 1.0)"
            strokeWidth="8"
            strokeDasharray="117.75 117.75"
            strokeDashoffset="-117.75"
          />
        </g>
      </svg>

      {/* The Eye itself - 83% to touch the ring */}
      <div className="realistic-eye" style={{
        width: `${size * 0.83}px`,
        height: `${size * 0.83}px`,
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}>
        {/* Sclera with 3D depth */}
        <div className="eye-sclera" style={{
          background: 'radial-gradient(circle at 40% 40%, #0a0a0a, #000000 50%, #000000 100%)',
          boxShadow: 'inset 0 -10px 25px rgba(0, 0, 0, 0.9), inset 0 10px 20px rgba(255, 255, 255, 0.08), inset -8px 0 20px rgba(0, 0, 0, 0.6), inset 8px 0 15px rgba(255, 255, 255, 0.04), 0 8px 25px rgba(0, 0, 0, 0.7), 0 3px 10px rgba(0, 0, 0, 0.8)'
        }}>
          {/* Digital circuit traces - FULL COMPLEXITY with jagged paths */}
          <svg className="eye-vessels" viewBox="0 0 250 250" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}>
            <defs>
              {/* Gradients for traces */}
              <linearGradient id="miniCircuitCyanBright">
                <stop offset="0%" stopColor="rgba(0, 255, 255, 1.0)" />
                <stop offset="100%" stopColor="rgba(0, 255, 255, 0.4)" />
              </linearGradient>
              <linearGradient id="miniCircuitCyanMedium">
                <stop offset="0%" stopColor="rgba(0, 217, 255, 0.7)" />
                <stop offset="100%" stopColor="rgba(0, 217, 255, 0.2)" />
              </linearGradient>
              <linearGradient id="miniCircuitCyanDim">
                <stop offset="0%" stopColor="rgba(0, 180, 220, 0.4)" />
                <stop offset="100%" stopColor="rgba(0, 180, 220, 0.08)" />
              </linearGradient>
              <linearGradient id="miniCircuitOrangeBright">
                <stop offset="0%" stopColor="rgba(255, 220, 80, 1.0)" />
                <stop offset="100%" stopColor="rgba(255, 220, 80, 0.5)" />
              </linearGradient>
              <linearGradient id="miniCircuitOrangeMedium">
                <stop offset="0%" stopColor="rgba(255, 190, 50, 0.8)" />
                <stop offset="100%" stopColor="rgba(255, 190, 50, 0.25)" />
              </linearGradient>
              <linearGradient id="miniCircuitOrangeDim">
                <stop offset="0%" stopColor="rgba(220, 150, 40, 0.5)" />
                <stop offset="100%" stopColor="rgba(220, 150, 40, 0.1)" />
              </linearGradient>
            </defs>

            {/* Generate 48 circuit traces with jagged paths - 50% orange, 50% cyan */}
            {Array.from({ length: 48 }).map((_, i) => {
              const baseAngle = (i * 7.5);
              const randomOffset = (Math.sin(i * 2.5) * 3);
              const angle = (baseAngle + randomOffset) * (Math.PI / 180);

              const startR = 10; // Start from center
              const endR = 123; // End at edge

              const startX = 125 + startR * Math.cos(angle);
              const startY = 125 + startR * Math.sin(angle);

              // 50% orange, 50% cyan
              const isOrange = i % 2 === 0;
              // Wider brightness distribution for more variability
              const brightnessRandom = (Math.sin(i * 1.1) * 1.2 + Math.cos(i * 1.7) * 0.8 + Math.sin(i * 2.3) * 0.5) / 2.5;
              const brightness = brightnessRandom > 0.5 ? 'bright' : brightnessRandom > -0.2 ? 'medium' : 'dim';

              const strokeColor = isOrange
                ? (brightness === 'bright' ? 'url(#miniCircuitOrangeBright)' : brightness === 'medium' ? 'url(#miniCircuitOrangeMedium)' : 'url(#miniCircuitOrangeDim)')
                : (brightness === 'bright' ? 'url(#miniCircuitCyanBright)' : brightness === 'medium' ? 'url(#miniCircuitCyanMedium)' : 'url(#miniCircuitCyanDim)');

              const fillColor = isOrange
                ? (brightness === 'bright' ? 'rgba(255, 220, 80, 1.0)' : brightness === 'medium' ? 'rgba(255, 190, 50, 0.8)' : 'rgba(220, 150, 40, 0.5)')
                : (brightness === 'bright' ? 'rgba(0, 255, 255, 1.0)' : brightness === 'medium' ? 'rgba(0, 217, 255, 0.7)' : 'rgba(0, 180, 220, 0.4)');

              // Create jagged paths with multiple kinks
              const hasKink = i % 3 !== 0;

              const kink1R = 42 + (Math.cos(i * 1.3) * 12);
              const kink1AngleOffset = (i % 2 === 0 ? 0.2 : -0.2) + (Math.sin(i * 2.1) * 0.15);
              const kink1X = 125 + kink1R * Math.cos(angle + kink1AngleOffset);
              const kink1Y = 125 + kink1R * Math.sin(angle + kink1AngleOffset);

              const kink2R = 83 + (Math.sin(i * 1.7) * 15);
              const kink2AngleOffset = (i % 2 === 0 ? -0.18 : 0.18) + (Math.cos(i * 1.9) * 0.12);
              const kink2X = 125 + kink2R * Math.cos(angle + kink2AngleOffset);
              const kink2Y = 125 + kink2R * Math.sin(angle + kink2AngleOffset);

              const endX = 125 + endR * Math.cos(angle);
              const endY = 125 + endR * Math.sin(angle);

              const pathData = hasKink
                ? `M ${startX} ${startY} L ${kink1X} ${kink1Y} L ${kink2X} ${kink2Y} L ${endX} ${endY}`
                : `M ${startX} ${startY} L ${endX} ${endY}`;

              return (
                <g key={i}>
                  <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={brightness === 'bright' ? "1.5" : brightness === 'medium' ? "1.2" : "1"}
                  />
                  {/* Add nodes at connection points for circuit board look */}
                  {hasKink && (
                    <>
                      <circle cx={kink1X} cy={kink1Y} r="1.5" fill={fillColor} />
                      <circle cx={kink2X} cy={kink2Y} r="1.5" fill={fillColor} />
                    </>
                  )}
                  <circle cx={endX} cy={endY} r="2" fill={fillColor} />
                </g>
              );
            })}
          </svg>

          {/* Iris - FULL COMPLEXITY */}
          <div
            className="eye-iris mini-eye-iris"
            style={{
              width: `${size * 0.40}px`,
              height: `${size * 0.40}px`,
              background: 'conic-gradient(from 0deg, #00d9ff 0deg, #ffaa33 60deg, #00d9ff 120deg, #ff8844 180deg, #00aacc 240deg, #ffcc44 300deg, #00d9ff 360deg), radial-gradient(circle at 35% 35%, #88ddff 0%, #0099cc 50%, #003344 100%)'
            }}
          >
            {/* Full complexity iris circuits */}
            <svg className="iris-circuits" viewBox="0 0 120 120" style={{ opacity: 0.2 }}>
              {[28, 35, 42, 49, 56].map((radius, ringIdx) => (
                <g key={`ring-${ringIdx}`}>
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, segIdx) => {
                    const gap = 8;
                    const arcLength = 18;
                    const x = 60;
                    const y = 60;

                    return (
                      <g key={`${ringIdx}-${segIdx}`}>
                        <circle
                          cx={x}
                          cy={y}
                          r={radius}
                          fill="none"
                          stroke="rgba(0, 255, 255, 1.0)"
                          strokeWidth="1"
                          strokeDasharray={`${arcLength} ${gap}`}
                          strokeDashoffset={-(angle * (Math.PI * radius) / 180)}
                          transform={`rotate(${angle} ${x} ${y})`}
                        />
                        {/* Add connection nodes on some segments for circuit board appearance */}
                        {(segIdx % 2 === 0 || ringIdx === 2) && (
                          <circle
                            cx={x + radius * Math.cos((angle * Math.PI) / 180)}
                            cy={y + radius * Math.sin((angle * Math.PI) / 180)}
                            r="0.8"
                            fill="rgba(0, 255, 255, 1.0)"
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              ))}
            </svg>

            {/* Pupil */}
            <div
              className="eye-pupil"
              style={{
                width: `${size * 0.16}px`,
                height: `${size * 0.16}px`
              }}
            >
              {/* Pupil highlight - shiny spot */}
              <div
                className="pupil-highlight"
                style={{
                  width: `${size * 0.04}px`,
                  height: `${size * 0.04}px`,
                  position: 'absolute',
                  top: `${size * 0.025}px`,
                  left: `${size * 0.035}px`,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.3))'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
