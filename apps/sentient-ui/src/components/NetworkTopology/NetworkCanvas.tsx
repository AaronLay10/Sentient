import { useEffect, useRef, useState } from 'react';
import type { NetworkNode } from '../../pages/Overview';
import styles from './NetworkCanvas.module.css';

interface NetworkCanvasProps {
  controllers: NetworkNode[];
  devices: NetworkNode[];
  onNodesUpdate?: (controllers: NetworkNode[], devices: NetworkNode[]) => void;
}

interface Pulse {
  x: number;
  y: number;
  tx: number;
  ty: number;
  progress: number;
  color: string;
  chain?: NetworkNode;
}

const ROOM_COLORS: Record<string, string> = {
  Infrastructure: '#34d399',
  Pharaohs: '#22d3ee',
  Clockwork: '#f59e0b',
  Quantum: '#a78bfa',
  Haunting: '#f472b6',
};

const NETWORK_DEFINITION = [
  {
    id: 'MQTT',
    name: 'MQTT Broker',
    type: 'Server',
    room: 'Infrastructure',
    devices: [
      { id: 'MQTT-WS', name: 'WebSocket', type: 'Service' },
      { id: 'MQTT-LOG', name: 'Logger', type: 'Service' },
    ],
  },
  {
    id: 'PHR-M',
    name: 'Pharaohs Main',
    type: 'Teensy 4.1',
    room: 'Pharaohs',
    devices: [
      { id: 'PHR-SARC', name: 'Sarcophagus', type: 'Servo' },
      { id: 'PHR-T1', name: 'Torch 1', type: 'LED' },
      { id: 'PHR-T2', name: 'Torch 2', type: 'LED' },
      { id: 'PHR-DOOR', name: 'Door', type: 'Lock' },
    ],
  },
  {
    id: 'PHR-J',
    name: 'Canopic Jars',
    type: 'Teensy 4.0',
    room: 'Pharaohs',
    devices: [
      { id: 'PHR-J1', name: 'Jar 1', type: 'Scale' },
      { id: 'PHR-J2', name: 'Jar 2', type: 'Scale' },
      { id: 'PHR-J3', name: 'Jar 3', type: 'Scale' },
      { id: 'PHR-J4', name: 'Jar 4', type: 'Scale' },
    ],
  },
  {
    id: 'CLK-M',
    name: 'Clockwork Main',
    type: 'Teensy 4.1',
    room: 'Clockwork',
    devices: [
      { id: 'CLK-G1', name: 'Gear 1', type: 'Stepper' },
      { id: 'CLK-G2', name: 'Gear 2', type: 'Stepper' },
      { id: 'CLK-PEN', name: 'Pendulum', type: 'Servo' },
    ],
  },
  {
    id: 'CLK-B',
    name: 'Buttons',
    type: 'Teensy 4.0',
    room: 'Clockwork',
    devices: [
      { id: 'CLK-D1', name: 'Dial 1', type: 'Encoder' },
      { id: 'CLK-D2', name: 'Dial 2', type: 'Encoder' },
      { id: 'CLK-KEY', name: 'Keypad', type: 'Matrix' },
    ],
  },
  {
    id: 'QTM-M',
    name: 'Quantum Main',
    type: 'Teensy 4.1',
    room: 'Quantum',
    devices: [
      { id: 'QTM-L1', name: 'Laser A', type: 'Array' },
      { id: 'QTM-L2', name: 'Laser B', type: 'Array' },
      { id: 'QTM-POR', name: 'Portal', type: 'LED' },
    ],
  },
  {
    id: 'HNT-M',
    name: 'Haunting Main',
    type: 'Teensy 4.1',
    room: 'Haunting',
    devices: [
      { id: 'HNT-FOG', name: 'Fog', type: 'Relay' },
      { id: 'HNT-STR', name: 'Strobe', type: 'DMX' },
      { id: 'HNT-GHO', name: 'Ghost', type: 'Servo' },
    ],
  },
];

export function NetworkCanvas({ onNodesUpdate }: NetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [controllers, setControllers] = useState<NetworkNode[]>([]);
  const [devices, setDevices] = useState<NetworkNode[]>([]);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      initializeNetwork();
    };

    const initializeNetwork = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const circleRadius = Math.min(width, height) / 2 - 40;

      const newControllers: NetworkNode[] = [];
      const newDevices: NetworkNode[] = [];

      NETWORK_DEFINITION.forEach((ctrl, i) => {
        const angle = (i / NETWORK_DEFINITION.length) * Math.PI * 2 - Math.PI / 2;
        const r = circleRadius * 0.65;

        const controller: NetworkNode = {
          ...ctrl,
          x: centerX + Math.cos(angle) * r,
          y: centerY + Math.sin(angle) * r,
          radius: Math.max(10, circleRadius * 0.035),
          isController: true,
          pulseIntensity: 0,
          angle,
          deviceNodes: [],
        };
        newControllers.push(controller);

        const devCount = ctrl.devices.length;
        const devRadius = circleRadius * 0.18 + devCount * 4;
        ctrl.devices.forEach((dev, j) => {
          const spread = Math.PI * 0.35;
          const devAngle = devCount === 1 ? angle : angle - spread / 2 + (j / (devCount - 1)) * spread;

          const device: NetworkNode = {
            ...dev,
            room: ctrl.room,
            controllerId: ctrl.id,
            x: controller.x! + Math.cos(devAngle) * devRadius,
            y: controller.y! + Math.sin(devAngle) * devRadius,
            radius: Math.max(4, circleRadius * 0.015),
            isController: false,
            pulseIntensity: 0,
          };
          newDevices.push(device);
          controller.deviceNodes!.push(device);
        });
      });

      setControllers(newControllers);
      setDevices(newDevices);
      onNodesUpdate?.(newControllers, newDevices);
    };

    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [onNodesUpdate]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const circleRadius = Math.min(width, height) / 2 - 40;

      ctx.clearRect(0, 0, width, height);

      // Draw outer glow ring
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        circleRadius * 0.8,
        centerX,
        centerY,
        circleRadius * 1.1
      );
      glowGrad.addColorStop(0, 'transparent');
      glowGrad.addColorStop(0.5, 'rgba(255, 140, 66, 0.08)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius * 1.05, 0, Math.PI * 2);
      ctx.fill();

      // Main ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 140, 66, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner rings
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 140, 66, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius * 0.25, 0, Math.PI * 2);
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw connections
      controllers.forEach((ctrl) => {
        const color = ROOM_COLORS[ctrl.room] || '#6366f1';

        // To center
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(ctrl.x!, ctrl.y!);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.1 + ctrl.pulseIntensity * 0.4;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // To devices
        ctrl.deviceNodes?.forEach((dev) => {
          ctx.beginPath();
          ctx.moveTo(ctrl.x!, ctrl.y!);
          ctx.lineTo(dev.x!, dev.y!);
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.06 + dev.pulseIntensity * 0.3;
          ctx.stroke();
          ctx.globalAlpha = 1;
        });
      });

      // Draw pulses
      pulses.forEach((p) => {
        const px = p.x + (p.tx - p.x) * p.progress;
        const py = p.y + (p.ty - p.y) * p.progress;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 8);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, p.color + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw devices
      devices.forEach((dev) => {
        const color = ROOM_COLORS[dev.room] || '#6366f1';
        const hovered = hoveredNode === dev;

        if (dev.pulseIntensity > 0) {
          ctx.fillStyle = color + '30';
          ctx.beginPath();
          ctx.arc(dev.x!, dev.y!, dev.radius! * (2 + dev.pulseIntensity * 2), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(dev.x!, dev.y!, dev.radius! * (hovered ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw controllers
      controllers.forEach((ctrl) => {
        const color = ROOM_COLORS[ctrl.room] || '#6366f1';
        const hovered = hoveredNode === ctrl;

        if (ctrl.pulseIntensity > 0) {
          ctx.fillStyle = color + '25';
          ctx.beginPath();
          ctx.arc(ctrl.x!, ctrl.y!, ctrl.radius! * (1.8 + ctrl.pulseIntensity), 0, Math.PI * 2);
          ctx.fill();
        }

        // Outer ring
        ctx.strokeStyle = color + '40';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ctrl.x!, ctrl.y!, ctrl.radius! + 4, 0, Math.PI * 2);
        ctx.stroke();

        // Main node
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(ctrl.x!, ctrl.y!, ctrl.radius! * (hovered ? 1.1 : 1), 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(ctrl.x! - ctrl.radius! * 0.3, ctrl.y! - ctrl.radius! * 0.3, ctrl.radius! * 0.25, 0, Math.PI * 2);
        ctx.fill();
      });

      // Center eye
      const eyeGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, circleRadius * 0.18);
      eyeGrad.addColorStop(0, 'rgba(255, 180, 100, 0.5)');
      eyeGrad.addColorStop(0.4, 'rgba(255, 140, 66, 0.3)');
      eyeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = eyeGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius * 0.18, 0, Math.PI * 2);
      ctx.fill();

      // Update animation
      setPulses((prev) =>
        prev
          .map((p) => ({ ...p, progress: p.progress + 0.035 }))
          .filter((p) => {
            if (p.progress >= 1 && p.chain) {
              p.chain.pulseIntensity = 0.7;
              setPulses((current) => [
                ...current,
                {
                  x: p.chain!.x!,
                  y: p.chain!.y!,
                  tx: centerX,
                  ty: centerY,
                  progress: 0,
                  color: p.color,
                },
              ]);
            }
            return p.progress < 1;
          })
      );

      setControllers((prev) =>
        prev.map((c) => ({
          ...c,
          pulseIntensity: c.pulseIntensity * 0.92,
        }))
      );
      setDevices((prev) =>
        prev.map((d) => ({
          ...d,
          pulseIntensity: d.pulseIntensity * 0.92,
        }))
      );

      // Random pulses
      if (Math.random() < 0.012) {
        const ctrl = controllers[Math.floor(Math.random() * controllers.length)];
        if (ctrl) createPulse(ctrl, 'heartbeat');
      }
      if (Math.random() < 0.02) {
        const dev = devices[Math.floor(Math.random() * devices.length)];
        if (dev) createPulse(dev, Math.random() < 0.7 ? 'sensor' : 'heartbeat');
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const createPulse = (node: NetworkNode, type: string) => {
      const pulseColors: Record<string, string> = {
        heartbeat: '#34d399',
        sensor: '#f59e0b',
        command: '#6366f1',
        warning: '#f87171',
      };

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      if (node.isController) {
        setPulses((prev) => [
          ...prev,
          {
            x: node.x!,
            y: node.y!,
            tx: centerX,
            ty: centerY,
            progress: 0,
            color: pulseColors[type],
          },
        ]);
      } else {
        const ctrl = controllers.find((c) => c.id === node.controllerId);
        if (ctrl) {
          setPulses((prev) => [
            ...prev,
            {
              x: node.x!,
              y: node.y!,
              tx: ctrl.x!,
              ty: ctrl.y!,
              progress: 0,
              color: pulseColors[type],
              chain: ctrl,
            },
          ]);
        }
      }

      setDevices((prev) =>
        prev.map((d) => (d.id === node.id ? { ...d, pulseIntensity: 1 } : d))
      );
      setControllers((prev) =>
        prev.map((c) => (c.id === node.id ? { ...c, pulseIntensity: 1 } : c))
      );
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [controllers, devices, pulses, hoveredNode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: NetworkNode | null = null;

    for (const c of controllers) {
      if (Math.hypot(mx - c.x!, my - c.y!) < c.radius! + 6) {
        found = c;
        break;
      }
    }

    if (!found) {
      for (const d of devices) {
        if (Math.hypot(mx - d.x!, my - d.y!) < d.radius! + 5) {
          found = d;
          break;
        }
      }
    }

    setHoveredNode(found);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleClick = () => {
    if (hoveredNode) {
      // Trigger command pulse on click
      // Node clicked - implement detail view here
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{ cursor: hoveredNode ? 'pointer' : 'default' }}
      />
      {hoveredNode && (
        <div
          className={styles.tooltip}
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y + 12,
          }}
        >
          <div className={styles.tooltipName}>{hoveredNode.name}</div>
          <div className={styles.tooltipRow}>
            <span>Type</span>
            <span>{hoveredNode.type}</span>
          </div>
          <div className={styles.tooltipRow}>
            <span>Room</span>
            <span>{hoveredNode.room}</span>
          </div>
          <div className={styles.tooltipRow}>
            <span>Status</span>
            <span>Online</span>
          </div>
        </div>
      )}
    </>
  );
}
