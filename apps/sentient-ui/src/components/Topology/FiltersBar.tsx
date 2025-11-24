import { Play, Pause, Trash2, Filter } from 'lucide-react';
import { useTopologyStore } from '../../hooks/useTopologyStore';
import type { NodeType } from '../../lib/topology/types';
import './FiltersBar.css';

export function FiltersBar() {
  const filters = useTopologyStore((s) => s.filters);
  const paused = useTopologyStore((s) => s.paused);
  const rooms = useTopologyStore((s) => s.rooms);
  const setFilters = useTopologyStore((s) => s.setFilters);
  const setPaused = useTopologyStore((s) => s.setPaused);
  const clearEvents = useTopologyStore((s) => s.clearEvents);

  const nodeTypes: Array<{ value: NodeType; label: string }> = [
    { value: 'room', label: 'Rooms' },
    { value: 'controller', label: 'Controllers' },
    { value: 'device', label: 'Devices' },
    { value: 'service', label: 'Services' },
    { value: 'infra', label: 'Infrastructure' },
  ];

  const eventTypes = [
    { value: 'heartbeat', label: 'Heartbeats' },
    { value: 'state_update', label: 'State Updates' },
    { value: 'controller_offline', label: 'Controller Offline' },
    { value: 'device_state_changed', label: 'Device State' },
    { value: 'puzzle_solved', label: 'Puzzle Solved' },
  ];

  return (
    <div className="filters-bar">
      <div className="filters-section">
        <Filter size={16} className="filter-icon" />
        <span className="filter-label">Filters:</span>

        <select
          value={filters.roomId || ''}
          onChange={(e) => setFilters({ roomId: e.target.value || null })}
          className="filter-select"
        >
          <option value="">All Rooms</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>

        <select
          value={filters.nodeType || ''}
          onChange={(e) => setFilters({ nodeType: (e.target.value || null) as NodeType | null })}
          className="filter-select"
        >
          <option value="">All Node Types</option>
          {nodeTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={filters.eventType || ''}
          onChange={(e) => setFilters({ eventType: e.target.value || null })}
          className="filter-select"
        >
          <option value="">All Event Types</option>
          {eventTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="controls-section">
        <button
          onClick={() => setPaused(!paused)}
          className={`control-btn ${paused ? 'paused' : 'playing'}`}
          title={paused ? 'Resume' : 'Pause'}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
          <span>{paused ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          onClick={clearEvents}
          className="control-btn clear"
          title="Clear Events"
        >
          <Trash2 size={16} />
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
}
