import { useState } from 'react';
import { Boxes, Search, Activity, Power, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api, type Device } from '../lib/api';
import styles from './Devices.module.css';

type StatusFilter = 'all' | 'operational' | 'warning' | 'error' | 'offline';
type CategoryFilter = 'all' | 'sensor' | 'actuator' | 'output' | 'input';
type SortField = 'friendly_name' | 'status' | 'device_type' | 'controller_id' | 'device_category';
type SortDirection = 'asc' | 'desc';

export function Devices() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [sortField, setSortField] = useState<SortField>('friendly_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: devices = [], isLoading, error, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: api.getDevices,
    refetchInterval: 5000,
  });

  // Filter and sort devices
  let filteredDevices = devices.filter((device) => {
    const matchesSearch = device.friendly_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || device.device_category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Sort devices
  filteredDevices = [...filteredDevices].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Status counts
  const statusCounts = devices.reduce((acc, device) => {
    acc[device.status] = (acc[device.status] || 0) + 1;
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
      case 'operational':
        return <Activity size={14} className={styles.statusIconOperational} />;
      case 'offline':
        return <Power size={14} className={styles.statusIconOffline} />;
      case 'warning':
        return <AlertTriangle size={14} className={styles.statusIconWarning} />;
      case 'error':
        return <AlertTriangle size={14} className={styles.statusIconError} />;
      default:
        return <Activity size={14} />;
    }
  };

  const getDeviceIcon = (category?: string) => {
    switch (category) {
      case 'output':
      case 'actuator':
        return <Power size={16} className={styles.categoryIconOutput} />;
      case 'sensor':
      case 'input':
        return <Activity size={16} className={styles.categoryIconSensor} />;
      default:
        return <Boxes size={16} className={styles.categoryIconDefault} />;
    }
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
            <Boxes size={20} />
          </div>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Devices</h1>
            <p className={styles.subtitle}>
              {devices.length} device{devices.length !== 1 ? 's' : ''} • {statusCounts.operational || 0} operational
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.statsCompact}>
            <div className={`${styles.statBadge} ${styles.operational}`}>
              <Activity size={14} />
              {statusCounts.operational || 0}
            </div>
            <div className={`${styles.statBadge} ${styles.offline}`}>
              <Power size={14} />
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
            placeholder="Search devices..."
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
          <option value="operational">Operational</option>
          <option value="offline">Offline</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          className={styles.filterSelect}
        >
          <option value="all">All Categories</option>
          <option value="sensor">Sensors</option>
          <option value="actuator">Actuators</option>
          <option value="output">Outputs</option>
          <option value="input">Inputs</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        {isLoading && (
          <div className={styles.loading}>
            <Activity className={styles.loadingIcon} />
            <p>Loading devices...</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <AlertTriangle size={24} />
            <p>Failed to load devices</p>
          </div>
        )}

        {!isLoading && !error && filteredDevices.length === 0 && (
          <div className={styles.empty}>
            <Boxes size={48} />
            <p>No devices found</p>
          </div>
        )}

        {!isLoading && !error && filteredDevices.length > 0 && (
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
                <th onClick={() => handleSort('device_type')} className={styles.sortable}>
                  <div className={styles.thContent}>
                    Type <SortIcon field="device_type" />
                  </div>
                </th>
                <th onClick={() => handleSort('device_category')} className={styles.sortable}>
                  <div className={styles.thContent}>
                    Category <SortIcon field="device_category" />
                  </div>
                </th>
                <th onClick={() => handleSort('controller_id')} className={styles.sortable}>
                  <div className={styles.thContent}>
                    Controller <SortIcon field="controller_id" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => (
                <tr
                  key={device.id}
                  className={`${styles.row} ${selectedDevice?.id === device.id ? styles.selected : ''}`}
                  onClick={() => setSelectedDevice(device)}
                >
                  <td className={styles.nameCell}>
                    <div className={styles.nameContent}>
                      {getDeviceIcon(device.device_category)}
                      <div>
                        <div className={styles.name}>{device.friendly_name}</div>
                        <div className={styles.id}>{device.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={`${styles.statusBadge} ${styles[device.status]}`}>
                      {getStatusIcon(device.status)}
                      <span>{device.status}</span>
                    </div>
                  </td>
                  <td>{device.device_type}</td>
                  <td>
                    {device.device_category ? (
                      <span className={styles.categoryTag}>{device.device_category}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={styles.monoCell}>{device.controller_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Panel */}
      {selectedDevice && (
        <div className={styles.detailPanel}>
          <div className={styles.detailPanelHeader}>
            <h2>{selectedDevice.friendly_name}</h2>
            <button
              className={styles.closeButton}
              onClick={() => setSelectedDevice(null)}
            >
              ×
            </button>
          </div>
          <div className={styles.detailPanelContent}>
            <div className={styles.detailSection}>
              <h3>Device Information</h3>
              <dl className={styles.detailList}>
                <dt>Device ID</dt>
                <dd>{selectedDevice.id}</dd>
                <dt>Type</dt>
                <dd>{selectedDevice.device_type}</dd>
                {selectedDevice.device_category && (
                  <>
                    <dt>Category</dt>
                    <dd>{selectedDevice.device_category}</dd>
                  </>
                )}
                <dt>Status</dt>
                <dd className={styles[`text${selectedDevice.status}`]}>
                  {selectedDevice.status}
                </dd>
                <dt>Controller</dt>
                <dd>{selectedDevice.controller_id}</dd>
              </dl>
            </div>

            {selectedDevice.properties && Object.keys(selectedDevice.properties).length > 0 && (
              <div className={styles.detailSection}>
                <h3>Properties</h3>
                <dl className={styles.detailList}>
                  {Object.entries(selectedDevice.properties).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{JSON.stringify(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className={styles.detailSection}>
              <h3>Actions</h3>
              <div className={styles.actionButtons}>
                <button className={styles.actionButton}>
                  <Power size={16} />
                  Control Device
                </button>
                <button className={styles.actionButton}>
                  <Activity size={16} />
                  View Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
