import { useState } from 'react';
import { Cpu, Search, Activity, Wifi, WifiOff, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api, type Controller } from '../lib/api';
import styles from './Controllers.module.css';

type StatusFilter = 'all' | 'online' | 'offline' | 'warning' | 'error';
type ControllerTypeFilter = 'all' | 'microcontroller' | 'pi' | 'pc';
type SortField = 'friendly_name' | 'status' | 'device_count' | 'last_seen' | 'controller_type';
type SortDirection = 'asc' | 'desc';

export function Controllers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<ControllerTypeFilter>('all');
  const [selectedController, setSelectedController] = useState<Controller | null>(null);
  const [sortField, setSortField] = useState<SortField>('friendly_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: controllers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['controllers'],
    queryFn: api.getControllers,
    refetchInterval: 5000,
  });

  // Filter and sort controllers
  let filteredControllers = controllers.filter((controller) => {
    const matchesSearch = controller.friendly_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         controller.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || controller.status === statusFilter;
    const matchesType = typeFilter === 'all' || controller.controller_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Sort controllers
  filteredControllers = [...filteredControllers].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'last_seen') {
      aVal = a.last_seen ? new Date(a.last_seen).getTime() : 0;
      bVal = b.last_seen ? new Date(b.last_seen).getTime() : 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Status counts
  const statusCounts = controllers.reduce((acc, controller) => {
    acc[controller.status] = (acc[controller.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi size={14} className={styles.statusIconOnline} />;
      case 'offline':
        return <WifiOff size={14} className={styles.statusIconOffline} />;
      case 'warning':
        return <AlertTriangle size={14} className={styles.statusIconWarning} />;
      case 'error':
        return <AlertTriangle size={14} className={styles.statusIconError} />;
      default:
        return <Activity size={14} />;
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.icon}>
            <Cpu size={20} />
          </div>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Controllers</h1>
            <p className={styles.subtitle}>
              {controllers.length} controller{controllers.length !== 1 ? 's' : ''} • {statusCounts.online || 0} online
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.statsCompact}>
            <div className={`${styles.statBadge} ${styles.online}`}>
              <Wifi size={14} />
              {statusCounts.online || 0}
            </div>
            <div className={`${styles.statBadge} ${styles.offline}`}>
              <WifiOff size={14} />
              {statusCounts.offline || 0}
            </div>
            <div className={`${styles.statBadge} ${styles.warning}`}>
              <AlertTriangle size={14} />
              {statusCounts.warning || 0}
            </div>
          </div>
          <button className={styles.refreshButton} onClick={() => refetch()}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search controllers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className={styles.filterSelect}
        >
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ControllerTypeFilter)}
          className={styles.filterSelect}
        >
          <option value="all">All Types</option>
          <option value="microcontroller">Microcontroller</option>
          <option value="pi">Raspberry Pi</option>
          <option value="pc">PC</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        {isLoading && (
          <div className={styles.loading}>
            <Activity className={styles.loadingIcon} />
            <p>Loading controllers...</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <AlertTriangle size={24} />
            <p>Failed to load controllers</p>
          </div>
        )}

        {!isLoading && !error && filteredControllers.length === 0 && (
          <div className={styles.empty}>
            <Cpu size={48} />
            <p>No controllers found</p>
          </div>
        )}

        {!isLoading && !error && filteredControllers.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th onClick={() => handleSort('friendly_name')} className={styles.sortable}>
                  <div className={styles.thContent}>
                    Name <SortIcon field="friendly_name" />
                  </div>
                </th>
                <th onClick={() => handleSort('status')} className={styles.sortable}>
                  <div className={styles.thContent}>
                    Status <SortIcon field="status" />
                  </div>
                </th>
                <th onClick={() => handleSort('controller_type')} className={styles.sortable}>
                  <div className={styles.thContent}>
                    Type <SortIcon field="controller_type" />
                  </div>
                </th>
                <th>Hardware</th>
                <th>Firmware</th>
                <th>IP Address</th>
                <th onClick={() => handleSort('device_count')} className={styles.sortable}>
                  <div className={styles.thContent}>
                    Devices <SortIcon field="device_count" />
                  </div>
                </th>
                <th onClick={() => handleSort('last_seen')} className={styles.sortable}>
                  <div className={styles.thContent}>
                    Last Seen <SortIcon field="last_seen" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredControllers.map((controller) => (
                <tr
                  key={controller.id}
                  className={`${styles.row} ${selectedController?.id === controller.id ? styles.selected : ''}`}
                  onClick={() => setSelectedController(controller)}
                >
                  <td className={styles.nameCell}>
                    <div className={styles.nameContent}>
                      <Cpu size={16} className={styles.cellIcon} />
                      <div>
                        <div className={styles.name}>{controller.friendly_name}</div>
                        <div className={styles.id}>{controller.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={`${styles.statusBadge} ${styles[controller.status]}`}>
                      {getStatusIcon(controller.status)}
                      <span>{controller.status}</span>
                    </div>
                  </td>
                  <td>{controller.controller_type}</td>
                  <td>{controller.hardware_type || '—'}</td>
                  <td className={styles.monoCell}>{controller.firmware_version || '—'}</td>
                  <td className={styles.monoCell}>{controller.ip_address || '—'}</td>
                  <td className={styles.centerCell}>
                    <span className={styles.badge}>{controller.device_count || 0}</span>
                  </td>
                  <td className={styles.monoCell}>{formatLastSeen(controller.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Panel */}
      {selectedController && (
        <div className={styles.detailPanel}>
          <div className={styles.detailPanelHeader}>
            <h2>{selectedController.friendly_name}</h2>
            <button
              className={styles.closeButton}
              onClick={() => setSelectedController(null)}
            >
              ×
            </button>
          </div>
          <div className={styles.detailPanelContent}>
            <div className={styles.detailSection}>
              <h3>Controller Information</h3>
              <dl className={styles.detailList}>
                <dt>Controller ID</dt>
                <dd>{selectedController.id}</dd>
                <dt>Type</dt>
                <dd>{selectedController.controller_type}</dd>
                <dt>Hardware</dt>
                <dd>{selectedController.hardware_type || 'Unknown'}</dd>
                <dt>Firmware Version</dt>
                <dd>{selectedController.firmware_version || 'N/A'}</dd>
                <dt>Status</dt>
                <dd className={styles[`text${selectedController.status}`]}>
                  {selectedController.status}
                </dd>
              </dl>
            </div>

            <div className={styles.detailSection}>
              <h3>Network Information</h3>
              <dl className={styles.detailList}>
                <dt>IP Address</dt>
                <dd>{selectedController.ip_address || 'N/A'}</dd>
                <dt>Heartbeat Interval</dt>
                <dd>{selectedController.heartbeat_interval_ms ? `${selectedController.heartbeat_interval_ms}ms` : 'N/A'}</dd>
                <dt>Last Seen</dt>
                <dd>{formatLastSeen(selectedController.last_seen)}</dd>
              </dl>
            </div>

            <div className={styles.detailSection}>
              <h3>Device Count</h3>
              <dl className={styles.detailList}>
                <dt>Total Devices</dt>
                <dd>{selectedController.device_count || 0}</dd>
                <dt>Pending Devices</dt>
                <dd>{selectedController.pending_devices || 0}</dd>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
