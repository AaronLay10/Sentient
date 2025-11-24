import type { RoomInfo } from '../../pages/NetworkTopology';
import styles from './NetworkSidebar.module.css';

interface NetworkSidebarProps {
  rooms: RoomInfo[];
  metrics: {
    nodesOnline: number;
    controllers: number;
    devices: number;
    warnings: number;
  };
}

export function NetworkSidebar({ rooms, metrics }: NetworkSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      {/* Active Rooms */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Active Rooms</span>
          <span className={styles.cardBadge}>
            {rooms.filter((r) => r.status === 'live').length} Live
          </span>
        </div>

        {rooms.map((room) => (
          <div key={room.name} className={styles.roomItem}>
            <div className={`${styles.roomIndicator} ${styles[room.status]}`} />
            <div className={styles.roomInfo}>
              <div className={styles.roomName}>{room.name}</div>
              <div className={styles.roomStatus}>{room.puzzles}</div>
            </div>
            <div className={`${styles.roomTimer} ${room.status !== 'live' ? styles.inactive : ''}`}>
              {room.timer}
            </div>
          </div>
        ))}
      </div>

      {/* Node Status */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Node Status</span>
        </div>
        <div className={styles.bigStat}>
          <div className={styles.bigStatValue}>{metrics.nodesOnline}</div>
          <div className={styles.bigStatLabel}>Nodes Online</div>
          <div className={styles.bigStatSub}>
            <div className={styles.bigStatItem}>
              <div className={styles.bigStatItemValue} style={{ color: '#22d3ee' }}>
                {metrics.controllers}
              </div>
              <div className={styles.bigStatItemLabel}>Controllers</div>
            </div>
            <div className={styles.bigStatItem}>
              <div className={styles.bigStatItemValue} style={{ color: '#a78bfa' }}>
                {metrics.devices}
              </div>
              <div className={styles.bigStatItemLabel}>Devices</div>
            </div>
            <div className={styles.bigStatItem}>
              <div className={styles.bigStatItemValue} style={{ color: '#34d399' }}>
                {metrics.warnings}
              </div>
              <div className={styles.bigStatItemLabel}>Warnings</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
