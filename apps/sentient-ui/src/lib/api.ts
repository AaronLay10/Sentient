import axios from 'axios';
import { getAuthToken } from '../components/ProtectedRoute';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
client.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add internal token for internal endpoints
    if (config.url?.includes('/internal/')) {
      config.headers['x-internal-token'] = 'dev-internal-token';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle 401 errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('sentient_token');
      sessionStorage.removeItem('sentient_token');
      localStorage.removeItem('sentient_user');
      sessionStorage.removeItem('sentient_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Controller {
  id: string;
  friendly_name: string;
  controller_type: string;
  hardware_type?: string;
  firmware_version?: string;
  ip_address?: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  device_count?: number;
  pending_devices?: number;
  heartbeat_interval_ms?: number;
  last_seen?: string;
  created_at: string;
}

export interface DeviceAction {
  action_id: string;
  mqtt_topic: string;
  friendly_name?: string;
}

export interface Device {
  id: string;
  friendly_name: string;
  device_type: string;
  device_category?: string;
  controller_id: string;
  status: 'operational' | 'warning' | 'error' | 'offline';
  properties?: Record<string, unknown>;
  actions?: DeviceAction[];
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  venue_id: string;
  tenant_id: string;
  photo_url?: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  description?: string;
  photo_url?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  photo_url?: string;
  created_at: string;
}

export interface SceneNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: string;
    subtype: string;
    icon: string;
    color: string;
    config?: Record<string, any>;
  };
}

export interface SceneEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface SceneGraph {
  nodes: SceneNode[];
  edges: SceneEdge[];
}

export interface Scene {
  id: string;
  clientId: string;
  roomId: string;
  name: string;
  description?: string;
  graph: SceneGraph;
  active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface PuzzleGraph {
  nodes: SceneNode[];
  edges: SceneEdge[];
}

export interface Puzzle {
  id: string;
  clientId: string;
  roomId: string;
  name: string;
  description?: string;
  graph: PuzzleGraph;
  timeout_seconds?: number;
  hint_text?: string;
  active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export const api = {
  // Controllers
  async getControllers(): Promise<Controller[]> {
    const response = await client.get('/controllers');
    // Add status field based on last_seen
    return response.data.map((controller: any) => {
      const lastSeen = controller.last_seen ? new Date(controller.last_seen) : null;
      const now = new Date();
      const diffMs = lastSeen ? now.getTime() - lastSeen.getTime() : Infinity;
      const diffSecs = diffMs / 1000;

      let status = 'offline';
      if (diffSecs < 30) {
        status = 'online';
      } else if (diffSecs < 120) {
        status = 'warning';
      }

      return {
        ...controller,
        status,
      };
    });
  },

  async getController(id: string): Promise<Controller> {
    const response = await client.get(`/internal/controllers/${id}`);
    return response.data;
  },

  // Devices
  async getDevices(): Promise<Device[]> {
    const response = await client.get('/admin/devices');
    return response.data;
  },

  async getDevice(id: string): Promise<Device> {
    const response = await client.get(`/internal/devices/${id}`);
    return response.data;
  },

  // Rooms
  async getRooms(): Promise<Room[]> {
    const response = await client.get('/admin/rooms');
    return response.data;
  },

  async getRoom(id: string): Promise<Room> {
    const response = await client.get(`/rooms/${id}`);
    return response.data;
  },

  async createRoom(data: Partial<Room>): Promise<Room> {
    const response = await client.post('/rooms', data);
    return response.data;
  },

  async updateRoom(id: string, data: Partial<Room>): Promise<Room> {
    const response = await client.patch(`/rooms/${id}`, data);
    return response.data;
  },

  async deleteRoom(id: string): Promise<void> {
    await client.delete(`/rooms/${id}`);
  },

  // Tenants
  async getTenants(): Promise<Tenant[]> {
    const response = await client.get('/tenants');
    return response.data;
  },

  async getTenant(id: string): Promise<Tenant> {
    const response = await client.get(`/tenants/${id}`);
    return response.data;
  },

  async createTenant(data: Partial<Tenant>): Promise<Tenant> {
    const response = await client.post('/tenants', data);
    return response.data;
  },

  async updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const response = await client.patch(`/tenants/${id}`, data);
    return response.data;
  },

  async deleteTenant(id: string): Promise<void> {
    await client.delete(`/tenants/${id}`);
  },

  // File Upload
  async uploadPhoto(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Topology
  async getTopology() {
    const response = await client.get('/admin/rooms/topology');
    return response.data;
  },

  // System Version
  async getSystemVersion() {
    const response = await client.get('/health/version');
    return response.data;
  },

  // Scenes
  async getScenes(clientId: string, roomId: string): Promise<Scene[]> {
    const response = await client.get(`/clients/${clientId}/rooms/${roomId}/scenes`);
    return response.data;
  },

  async getScene(clientId: string, roomId: string, sceneId: string): Promise<Scene> {
    const response = await client.get(`/clients/${clientId}/rooms/${roomId}/scenes/${sceneId}`);
    return response.data;
  },

  async createScene(clientId: string, roomId: string, data: {
    name: string;
    description?: string;
    graph: SceneGraph;
    active?: boolean;
    order?: number;
  }): Promise<Scene> {
    const response = await client.post(`/clients/${clientId}/rooms/${roomId}/scenes`, data);
    return response.data;
  },

  async updateScene(clientId: string, roomId: string, sceneId: string, data: {
    name?: string;
    description?: string;
    graph?: SceneGraph;
    active?: boolean;
    order?: number;
  }): Promise<Scene> {
    const response = await client.patch(`/clients/${clientId}/rooms/${roomId}/scenes/${sceneId}`, data);
    return response.data;
  },

  async deleteScene(clientId: string, roomId: string, sceneId: string): Promise<void> {
    await client.delete(`/clients/${clientId}/rooms/${roomId}/scenes/${sceneId}`);
  },

  async duplicateScene(clientId: string, roomId: string, sceneId: string): Promise<Scene> {
    const response = await client.post(`/clients/${clientId}/rooms/${roomId}/scenes/${sceneId}/duplicate`);
    return response.data;
  },

  // Scene Execution
  async executeScene(clientId: string, roomId: string, sceneId: string): Promise<void> {
    await client.post(`/clients/${clientId}/rooms/${roomId}/scenes/${sceneId}/execute`);
  },

  async executeDeviceAction(deviceId: string, action: string): Promise<void> {
    await client.post(`/admin/devices/${deviceId}/execute`, { action });
  },

  // Device Command Execution
  async sendDeviceCommand(deviceId: string, command: string, payload?: Record<string, any>): Promise<{ success: boolean; device_id: string; command: string; payload?: any }> {
    const response = await client.post(`/devices/${deviceId}/command`, {
      device_id: deviceId,
      command,
      payload: payload || {},
    });
    return response.data;
  },

  // Puzzles
  async getPuzzles(clientId: string, roomId: string): Promise<Puzzle[]> {
    const response = await client.get(`/clients/${clientId}/rooms/${roomId}/puzzles`);
    return response.data;
  },

  async getPuzzle(clientId: string, roomId: string, puzzleId: string): Promise<Puzzle> {
    const response = await client.get(`/clients/${clientId}/rooms/${roomId}/puzzles/${puzzleId}`);
    return response.data;
  },

  async createPuzzle(clientId: string, roomId: string, data: {
    name: string;
    description?: string;
    graph: PuzzleGraph;
    timeout_seconds?: number;
    hint_text?: string;
    active?: boolean;
    order?: number;
  }): Promise<Puzzle> {
    const response = await client.post(`/clients/${clientId}/rooms/${roomId}/puzzles`, data);
    return response.data;
  },

  async updatePuzzle(clientId: string, roomId: string, puzzleId: string, data: {
    name?: string;
    description?: string;
    graph?: PuzzleGraph;
    timeout_seconds?: number;
    hint_text?: string;
    active?: boolean;
    order?: number;
  }): Promise<Puzzle> {
    const response = await client.patch(`/clients/${clientId}/rooms/${roomId}/puzzles/${puzzleId}`, data);
    return response.data;
  },

  async deletePuzzle(clientId: string, roomId: string, puzzleId: string): Promise<void> {
    await client.delete(`/clients/${clientId}/rooms/${roomId}/puzzles/${puzzleId}`);
  },

  async duplicatePuzzle(clientId: string, roomId: string, puzzleId: string): Promise<Puzzle> {
    const response = await client.post(`/clients/${clientId}/rooms/${roomId}/puzzles/${puzzleId}/duplicate`);
    return response.data;
  },
};
