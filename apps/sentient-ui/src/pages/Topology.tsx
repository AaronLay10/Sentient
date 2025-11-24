import { useEffect } from 'react';
import { useTopologyStore } from '../hooks/useTopologyStore';
import { useTopologyWebSocket } from '../hooks/useTopologyWebSocket';
import { FiltersBar } from '../components/Topology/FiltersBar';
import { TopologyGraph } from '../components/Topology/TopologyGraph';
import { EventsPanel } from '../components/Topology/EventsPanel';
import { NodeDetailsPanel } from '../components/Topology/NodeDetailsPanel';
import type { RoomTopologyResponse } from '../lib/topology/types';
import './Topology.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function Topology() {
  const setTopology = useTopologyStore((s) => s.setTopology);
  const { isConnected } = useTopologyWebSocket();

  useEffect(() => {
    async function loadTopology() {
      try {
        // Get auth token
        const token = localStorage.getItem('sentient_token') || sessionStorage.getItem('sentient_token');

        const response = await fetch(`${API_URL}/admin/rooms/topology`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch topology');
        }

        const data: RoomTopologyResponse = await response.json();
        setTopology(data);
      } catch (error) {
        console.error('Error loading topology:', error);
      }
    }

    loadTopology();
  }, [setTopology]);

  return (
    <div className="topology-page">
      <div className="topology-header">
        <div className="header-content">
          <h1>System Topology & Live Flows</h1>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
            <span className="status-text">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <FiltersBar />
      </div>

      <div className="topology-content">
        {/* Left: Topology Graph (70%) */}
        <div className="graph-section">
          <TopologyGraph />
        </div>

        {/* Right: Events and Node Details (30%) */}
        <div className="sidebar-section">
          <EventsPanel />
          <NodeDetailsPanel />
        </div>
      </div>
    </div>
  );
}
