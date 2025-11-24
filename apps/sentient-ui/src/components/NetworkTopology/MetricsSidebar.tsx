import { useEffect, useState } from 'react';
import styles from './MetricsSidebar.module.css';

interface MetricsSidebarProps {
  metrics: {
    latency: string;
    cpu: string;
    memory: string;
    mqttClients: number;
    topics: number;
  };
}

export function MetricsSidebar({ metrics }: MetricsSidebarProps) {
  const [throughputData, setThroughputData] = useState<number[]>(
    Array(30)
      .fill(0)
      .map(() => Math.random() * 0.7 + 0.2)
  );
  const [audioLevels, setAudioLevels] = useState<number[]>(
    Array(14)
      .fill(0)
      .map(() => Math.random() * 0.7 + 0.2)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      // Update throughput
      setThroughputData((prev) => {
        const newData = [...prev];
        newData.shift();
        newData.push(Math.random() * 0.7 + 0.2);
        return newData;
      });

      // Update audio levels
      setAudioLevels((prev) =>
        prev.map((l) => Math.max(0.1, Math.min(1, l + (Math.random() - 0.5) * 0.1)))
      );
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside className={styles.sidebar}>
      {/* System Metrics */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>System Metrics</span>
        </div>

        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Latency</span>
          <span className={`${styles.metricValue} ${styles.good}`}>{metrics.latency}</span>
        </div>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>CPU Load</span>
          <span className={styles.metricValue}>{metrics.cpu}</span>
        </div>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Memory</span>
          <span className={`${styles.metricValue} ${styles.warning}`}>{metrics.memory}</span>
        </div>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>MQTT Clients</span>
          <span className={styles.metricValue}>{metrics.mqttClients}</span>
        </div>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Topics</span>
          <span className={styles.metricValue}>{metrics.topics}</span>
        </div>
      </div>

      {/* Message Throughput */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Message Throughput</span>
          <span className={styles.cardBadge}>14.2/s avg</span>
        </div>
        <div className={styles.miniBars}>
          {throughputData.map((value, i) => (
            <div
              key={i}
              className={styles.miniBar}
              style={{
                height: `${value * 100}%`,
                background: `rgba(34, 211, 238, ${0.4 + value * 0.6})`,
              }}
            />
          ))}
        </div>
        <div className={styles.metricRow} style={{ paddingTop: '12px' }}>
          <span className={styles.metricLabel}>Peak (60s)</span>
          <span className={styles.metricValue}>31/s</span>
        </div>
      </div>

      {/* Audio Zones */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Audio Zones</span>
          <span className={styles.cardBadge}>14 Active</span>
        </div>
        <div className={`${styles.miniBars} ${styles.audioBar}`}>
          {audioLevels.map((value, i) => (
            <div
              key={i}
              className={styles.miniBar}
              style={{
                height: `${value * 100}%`,
                background:
                  value > 0.8 ? 'rgba(249, 115, 22, 0.8)' : `rgba(167, 139, 250, ${0.5 + value * 0.5})`,
              }}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
