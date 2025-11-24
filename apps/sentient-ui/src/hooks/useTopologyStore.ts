import { create } from 'zustand';
import type {
  TopologyNode,
  TopologyEdge,
  TopologyEvent,
  RoomTopologyData,
  ServiceInfo,
  RoomTopologyResponse,
  TopologyFilters,
} from '../lib/topology/types';

interface TopologyState {
  // Data
  rooms: RoomTopologyData[];
  services: ServiceInfo[];
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  events: TopologyEvent[];

  // UI State
  selectedNode: TopologyNode | null;
  hoveredNode: TopologyNode | null;
  filters: TopologyFilters;
  paused: boolean;

  // Actions
  setTopology: (data: RoomTopologyResponse) => void;
  addEvent: (event: TopologyEvent) => void;
  applyEventToGraph: (event: TopologyEvent) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  setFilters: (filters: Partial<TopologyFilters>) => void;
  setPaused: (paused: boolean) => void;
  clearEvents: () => void;
}

const MAX_EVENTS = 500; // Keep last 500 events in memory

export const useTopologyStore = create<TopologyState>((set, get) => ({
  // Initial state
  rooms: [],
  services: [],
  nodes: [],
  edges: [],
  events: [],
  selectedNode: null,
  hoveredNode: null,
  filters: {},
  paused: false,

  // Set initial topology data
  setTopology: (data: RoomTopologyResponse) => {
    set({
      rooms: data.rooms,
      services: data.services,
      nodes: data.nodes,
      edges: data.edges,
    });
  },

  // Add a new event
  addEvent: (event: TopologyEvent) => {
    set((state) => {
      const newEvents = [event, ...state.events].slice(0, MAX_EVENTS);
      return { events: newEvents };
    });
  },

  // Apply event to graph (update node status, highlight edges, etc.)
  applyEventToGraph: (event: TopologyEvent) => {
    const { nodes, edges } = get();

    // Update node status based on event
    const updatedNodes = nodes.map((node) => {
      // Match node based on event type
      if (event.type === 'controller' && node.id === event.controllerId) {
        if (event.subtype === 'controller_offline') {
          return { ...node, status: 'offline' as const };
        } else if (event.subtype === 'heartbeat') {
          return { ...node, status: 'online' as const };
        }
      } else if (event.type === 'device' && node.id === event.deviceId) {
        if (event.subtype === 'state_update' && event.payload?.state) {
          return { ...node, status: 'online' as const };
        }
      } else if (event.type === 'service' && node.serviceName === event.serviceName) {
        // Update service status
        if (event.subtype === 'degraded') {
          return { ...node, status: 'degraded' as const };
        }
      }
      return node;
    });

    // Find relevant edges and update lastEvent
    const updatedEdges = edges.map((edge) => {
      // Determine if this edge is involved in the event
      let isRelevant = false;

      if (event.type === 'controller' && event.controllerId) {
        isRelevant = edge.sourceId === event.controllerId || edge.targetId === event.controllerId;
      } else if (event.type === 'device' && event.deviceId) {
        isRelevant = edge.sourceId === event.deviceId || edge.targetId === event.deviceId;
      }

      if (isRelevant) {
        return {
          ...edge,
          lastEvent: event,
          lastEventAt: event.timestamp,
        };
      }
      return edge;
    });

    set({ nodes: updatedNodes, edges: updatedEdges });
  },

  // Set selected node
  setSelectedNode: (nodeId: string | null) => {
    const { nodes } = get();
    const node = nodeId ? nodes.find((n) => n.id === nodeId) || null : null;
    set({ selectedNode: node });
  },

  // Set hovered node
  setHoveredNode: (nodeId: string | null) => {
    const { nodes } = get();
    const node = nodeId ? nodes.find((n) => n.id === nodeId) || null : null;
    set({ hoveredNode: node });
  },

  // Update filters
  setFilters: (newFilters: Partial<TopologyFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  // Pause/resume event processing
  setPaused: (paused: boolean) => {
    set({ paused });
  },

  // Clear all events
  clearEvents: () => {
    set({ events: [] });
  },
}));
