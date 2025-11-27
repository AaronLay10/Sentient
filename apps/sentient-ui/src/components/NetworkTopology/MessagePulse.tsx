import { useEffect, useState } from 'react';
import './MessagePulse.css';

export interface MessagePulseData {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: 'controller-to-eye' | 'device-to-controller';
  createdAt: number;
}

interface MessagePulseProps {
  pulse: MessagePulseData;
  onComplete: (id: string) => void;
}

export function MessagePulse({ pulse, onComplete }: MessagePulseProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = pulse.type === 'controller-to-eye' ? 800 : 600; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      
      setProgress(newProgress);

      if (newProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete(pulse.id);
      }
    };

    requestAnimationFrame(animate);
  }, [pulse.id, pulse.type, onComplete]);

  // Calculate current position
  const x = pulse.fromX + (pulse.toX - pulse.fromX) * progress;
  const y = pulse.fromY + (pulse.toY - pulse.fromY) * progress;

  const dotColor = pulse.type === 'controller-to-eye' ? '#10b981' : '#3b82f6';
  const dotSize = pulse.type === 'controller-to-eye' ? 6 : 4;

  return (
    <div
      className="message-pulse"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${dotSize}px`,
        height: `${dotSize}px`,
        backgroundColor: dotColor,
        boxShadow: `0 0 ${dotSize * 2}px ${dotColor}`,
      }}
    />
  );
}
