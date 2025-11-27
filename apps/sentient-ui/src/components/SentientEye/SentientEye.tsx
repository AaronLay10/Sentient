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

interface SentientEyeProps {
  health?: SystemHealth;
  onIssueClick?: (issueId: string) => void;
}

export function SentientEye({ health }: SentientEyeProps) {
  const effectiveHealth = health?.overall || 'offline';

  return (
    <div className="sentient-eye-container">

      {/* Eye Visualization */}
      <div className="hud-eye-container">
        {/* Outer HUD Rings */}
        <svg className="hud-rings" viewBox="0 0 500 500">
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00d9ff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#00d9ff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00d9ff" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Rotating outer ring with segments */}
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

        {/* Rotating ring around eye - renders BEFORE eye so it appears behind */}
        <svg viewBox="0 0 240 240" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '240px', height: '240px', pointerEvents: 'none', overflow: 'visible' }}>
          <defs>
            {/* Outer glow filter for the rotating ring */}
            <filter id="outerGlow">
              <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* 3D shadow/depth layer behind rings */}
          <circle
            cx="120"
            cy="120"
            r="100"
            fill="none"
            stroke="rgba(0, 0, 0, 0.6)"
            strokeWidth="6"
            transform="translate(2, 2)"
          />

          {/* Rotating ring with alternating segments - colors and speed change based on health status */}
          <g className={`rotating-outer-ring ${effectiveHealth === 'warning' ? 'status-warning' : effectiveHealth === 'critical' ? 'status-critical' : ''}`} style={{ filter: 'url(#outerGlow)' }}>
            {/* Primary segments - cyan (healthy), orange (warning), or red (critical) */}
            <circle
              cx="120"
              cy="120"
              r="100"
              fill="none"
              stroke={
                effectiveHealth === 'critical'
                  ? 'rgba(255, 51, 85, 1.0)'
                  : effectiveHealth === 'warning'
                  ? 'rgba(255, 170, 0, 1.0)'
                  : 'rgba(0, 217, 255, 1.0)'
              }
              strokeWidth="6"
              strokeDasharray="78.5 78.5"
              strokeDashoffset="0"
            />
            {/* Secondary segments - orange (healthy), yellow (warning), or dark red (critical) */}
            <circle
              cx="120"
              cy="120"
              r="100"
              fill="none"
              stroke={
                effectiveHealth === 'critical'
                  ? 'rgba(200, 30, 60, 1.0)'
                  : effectiveHealth === 'warning'
                  ? 'rgba(255, 200, 0, 1.0)'
                  : 'rgba(255, 170, 50, 1.0)'
              }
              strokeWidth="6"
              strokeDasharray="78.5 78.5"
              strokeDashoffset="-78.5"
            />
          </g>
        </svg>

        {/* Realistic Eye with HUD overlay */}
        <div className="realistic-eye">
          {/* Outer sclera (white of eye) */}
          <div className="eye-sclera">
            {/* Digital circuit traces - radiating outward from iris area */}
            <svg className="eye-vessels" viewBox="0 0 250 250">
              <defs>
                {/* Gradients for traces */}
                <linearGradient id="circuitCyanBright">
                  <stop offset="0%" stopColor="rgba(0, 217, 255, 0.7)" />
                  <stop offset="100%" stopColor="rgba(0, 217, 255, 0.25)" />
                </linearGradient>
                <linearGradient id="circuitCyanMedium">
                  <stop offset="0%" stopColor="rgba(0, 217, 255, 0.5)" />
                  <stop offset="100%" stopColor="rgba(0, 217, 255, 0.15)" />
                </linearGradient>
                <linearGradient id="circuitCyanDim">
                  <stop offset="0%" stopColor="rgba(0, 217, 255, 0.3)" />
                  <stop offset="100%" stopColor="rgba(0, 217, 255, 0.05)" />
                </linearGradient>
                <linearGradient id="circuitOrangeBright">
                  <stop offset="0%" stopColor="rgba(255, 170, 50, 0.7)" />
                  <stop offset="100%" stopColor="rgba(255, 170, 50, 0.25)" />
                </linearGradient>
                <linearGradient id="circuitOrangeMedium">
                  <stop offset="0%" stopColor="rgba(255, 170, 50, 0.5)" />
                  <stop offset="100%" stopColor="rgba(255, 170, 50, 0.15)" />
                </linearGradient>
                <linearGradient id="circuitOrangeDim">
                  <stop offset="0%" stopColor="rgba(255, 170, 50, 0.3)" />
                  <stop offset="100%" stopColor="rgba(255, 170, 50, 0.05)" />
                </linearGradient>
              </defs>

              {/* Generate circuit traces radiating outward in a circle with random spacing and colors */}
              {Array.from({ length: 48 }).map((_, i) => {
                // Add randomness to angle spacing
                const baseAngle = (i * 7.5);
                const randomOffset = (Math.sin(i * 2.5) * 3); // Random offset between angles
                const angle = (baseAngle + randomOffset) * (Math.PI / 180);

                const startR = 10; // Start from center so traces visible when iris moves
                const endR = 123; // End at edge of 250px eye-sclera (radius ~125)

                const startX = 125 + startR * Math.cos(angle);
                const startY = 125 + startR * Math.sin(angle);

                // Randomize color and brightness with 3 levels
                const isOrange = i % 4 === 0 || i % 6 === 0; // More traces are orange
                const brightnessRandom = (Math.sin(i * 1.1) + Math.cos(i * 1.7)) / 2; // -1 to 1
                const brightness = brightnessRandom > 0.3 ? 'bright' : brightnessRandom > -0.3 ? 'medium' : 'dim';

                const strokeColor = isOrange
                  ? (brightness === 'bright' ? 'url(#circuitOrangeBright)' : brightness === 'medium' ? 'url(#circuitOrangeMedium)' : 'url(#circuitOrangeDim)')
                  : (brightness === 'bright' ? 'url(#circuitCyanBright)' : brightness === 'medium' ? 'url(#circuitCyanMedium)' : 'url(#circuitCyanDim)');
                const fillColor = isOrange
                  ? (brightness === 'bright' ? 'rgba(255, 170, 50, 0.95)' : brightness === 'medium' ? 'rgba(255, 170, 50, 0.7)' : 'rgba(255, 170, 50, 0.4)')
                  : (brightness === 'bright' ? 'rgba(0, 217, 255, 0.95)' : brightness === 'medium' ? 'rgba(0, 217, 255, 0.7)' : 'rgba(0, 217, 255, 0.4)');

                // Create more variation in the traces with multiple kinks for jagged look
                const hasKink = i % 3 !== 0;

                // First kink at ~1/3 distance
                const kink1R = 42 + (Math.cos(i * 1.3) * 12);
                const kink1AngleOffset = (i % 2 === 0 ? 0.2 : -0.2) + (Math.sin(i * 2.1) * 0.15);
                const kink1X = 125 + kink1R * Math.cos(angle + kink1AngleOffset);
                const kink1Y = 125 + kink1R * Math.sin(angle + kink1AngleOffset);

                // Second kink at ~2/3 distance
                const kink2R = 83 + (Math.sin(i * 1.7) * 15);
                const kink2AngleOffset = (i % 2 === 0 ? -0.18 : 0.18) + (Math.cos(i * 1.9) * 0.12);
                const kink2X = 125 + kink2R * Math.cos(angle + kink2AngleOffset);
                const kink2Y = 125 + kink2R * Math.sin(angle + kink2AngleOffset);

                const endX = 125 + endR * Math.cos(angle);
                const endY = 125 + endR * Math.sin(angle);

                const pathD = hasKink
                  ? `M ${startX} ${startY} L ${kink1X} ${kink1Y} L ${kink2X} ${kink2Y} L ${endX} ${endY}`
                  : `M ${startX} ${startY} L ${endX} ${endY}`;

                // Random animation speeds around 1s
                const speedVariation = 0.7 + (Math.abs(Math.sin(i * 2.3)) * 0.6); // 0.7 to 1.3
                const animationDuration = isOrange
                  ? `${speedVariation * 1.1}s`  // Orange: 0.77s to 1.43s
                  : `${speedVariation * 0.9}s`; // Cyan: 0.63s to 1.17s
                // Random delays using different seeds to desynchronize
                const delay = `${(Math.abs(Math.sin(i * 3.7) * Math.cos(i * 1.9)) * 2)}s`;

                return (
                  <g key={i}>
                    <path
                      id={`path-${i}`}
                      d={pathD}
                      stroke={strokeColor}
                      strokeWidth={brightness === 'bright' ? "1.5" : "1"}
                      fill="none"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={endX}
                      cy={endY}
                      r="1.5"
                      fill={fillColor}
                    />
                    {hasKink && (
                      <>
                        <circle
                          cx={kink1X}
                          cy={kink1Y}
                          r="1"
                          fill={isOrange ? 'rgba(255, 170, 50, 0.6)' : 'rgba(0, 217, 255, 0.6)'}
                        />
                        <circle
                          cx={kink2X}
                          cy={kink2Y}
                          r="1"
                          fill={isOrange ? 'rgba(255, 170, 50, 0.6)' : 'rgba(0, 217, 255, 0.6)'}
                        />
                      </>
                    )}
                    {/* Traveling beam dot for bright traces - cyan goes IN, orange goes OUT */}
                    {brightness === 'bright' && (
                      <circle r="1.5" fill={isOrange ? 'rgba(255, 170, 50, 1)' : 'rgba(0, 217, 255, 1)'}>
                        <animateMotion dur={animationDuration} repeatCount="indefinite" begin={delay} keyPoints={isOrange ? "0;1" : "1;0"} keyTimes="0;1" calcMode="linear">
                          <mpath href={`#path-${i}`} />
                        </animateMotion>
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Digital colored iris with circuit-like texture */}
            <div className={`eye-iris ${effectiveHealth === 'warning' ? 'status-warning' : effectiveHealth === 'critical' ? 'status-critical' : ''}`} style={{
              background: effectiveHealth === 'critical'
                ? 'conic-gradient(from 0deg, #00d9ff 0deg, #ff9933 60deg, #00d9ff 120deg, #ff6644 180deg, #00aacc 240deg, #ffaa44 300deg, #00d9ff 360deg), radial-gradient(circle at 35% 35%, #88ddff 0%, #0099cc 50%, #003344 100%)'
                : effectiveHealth === 'warning'
                ? 'conic-gradient(from 0deg, #00d9ff 0deg, #ffaa33 60deg, #00d9ff 120deg, #ff8844 180deg, #00aacc 240deg, #ffcc44 300deg, #00d9ff 360deg), radial-gradient(circle at 35% 35%, #88ddff 0%, #0099cc 50%, #003344 100%)'
                : 'conic-gradient(from 0deg, #00d9ff 0deg, #ffaa33 60deg, #00d9ff 120deg, #ff8844 180deg, #00aacc 240deg, #ffcc44 300deg, #00d9ff 360deg), radial-gradient(circle at 35% 35%, #88ddff 0%, #0099cc 50%, #003344 100%)'
            }}>
              {/* Segmented iris pattern like circuit board */}
              <svg className="iris-circuits" viewBox="0 0 120 120">
                {/* Concentric segmented rings */}
                {[28, 35, 42, 49, 56].map((radius, ringIdx) => (
                  <g key={`ring-${ringIdx}`}>
                    {Array.from({ length: 24 }).map((_, i) => {
                      const startAngle = (i * 15) * (Math.PI / 180);
                      const endAngle = ((i * 15) + 14) * (Math.PI / 180);
                      const innerR = radius - 3;
                      const outerR = radius + 3;

                      const x1 = 60 + innerR * Math.cos(startAngle);
                      const y1 = 60 + innerR * Math.sin(startAngle);
                      const x2 = 60 + outerR * Math.cos(startAngle);
                      const y2 = 60 + outerR * Math.sin(startAngle);
                      const x3 = 60 + outerR * Math.cos(endAngle);
                      const y3 = 60 + outerR * Math.sin(endAngle);
                      const x4 = 60 + innerR * Math.cos(endAngle);
                      const y4 = 60 + innerR * Math.sin(endAngle);

                      const isOrange = (i + ringIdx) % 3 === 0;
                      const isCyan = (i + ringIdx) % 3 === 1;
                      const fillColor = isOrange
                        ? 'rgba(255, 170, 50, 0.15)'
                        : isCyan
                        ? 'rgba(0, 217, 255, 0.15)'
                        : 'rgba(150, 200, 230, 0.1)';
                      const strokeColor = isOrange
                        ? 'rgba(255, 170, 50, 0.4)'
                        : isCyan
                        ? 'rgba(0, 217, 255, 0.4)'
                        : 'rgba(200, 230, 255, 0.3)';

                      return (
                        <path
                          key={i}
                          d={`M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1} Z`}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth="0.3"
                        />
                      );
                    })}
                  </g>
                ))}

                {/* Radial dividing lines - sharp technical spokes */}
                {Array.from({ length: 36 }).map((_, i) => {
                  const angle = (i * 10) * (Math.PI / 180);
                  const x1 = 60 + 25 * Math.cos(angle);
                  const y1 = 60 + 25 * Math.sin(angle);
                  const x2 = 60 + 60 * Math.cos(angle);
                  const y2 = 60 + 60 * Math.sin(angle);

                  const isThick = i % 3 === 0;
                  const color = i % 4 === 0
                    ? 'rgba(255, 170, 50, 0.5)'
                    : i % 4 === 1
                    ? 'rgba(0, 217, 255, 0.5)'
                    : 'rgba(255, 255, 255, 0.4)';

                  return (
                    <line
                      key={`spoke-${i}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={color}
                      strokeWidth={isThick ? '0.6' : '0.3'}
                      strokeLinecap="square"
                    />
                  );
                })}
              </svg>

              {/* Iris texture details */}
              <div className="iris-texture"></div>

              {/* Pupil */}
              <div className="eye-pupil">
                {/* Pupil highlight */}
                <div className="pupil-highlight"></div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
