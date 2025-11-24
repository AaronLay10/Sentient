export type NodeType = 'room' | 'controller' | 'device' | 'service' | 'infra';

export interface TopologyNode {
  id: string;
  type: NodeType;
  label: string;
  roomId?: string;
  controllerId?: string;
  deviceId?: string;
  serviceName?: string;
  status?: 'online' | 'offline' | 'degraded' | 'unknown';
  metadata?: Record<string, any>;
  // Calculated layout properties
  x?: number;
  y?: number;
  layer?: number;
}

export interface TopologyEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  lastEvent?: TopologyEvent;
  lastEventAt?: string;
}

export interface TopologyEvent {
  id: string;
  type: NodeType | 'service' | 'infra';
  subtype: string;
  timestamp: string;
  roomId?: string;
  controllerId?: string;
  deviceId?: string;
  serviceName?: string;
  payload?: any;
}

export interface RoomTopologyData {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'maintenance';
  controllers: Array<{
    id: string;
    name: string;
    status: 'online' | 'offline';
    devices: Array<{
      id: string;
      name: string;
      type: string;
      status: 'online' | 'offline' | 'unknown';
    }>;
  }>;
}

export interface ServiceInfo {
  name: string;
  type: 'core' | 'infra';
  status: 'online' | 'degraded' | 'offline';
}

export interface RoomTopologyResponse {
  rooms: RoomTopologyData[];
  services: ServiceInfo[];
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface TopologyFilters {
  roomId?: string | null;
  nodeType?: NodeType | null;
  eventType?: string | null;
  severity?: 'critical' | 'warning' | 'info' | null;
}
