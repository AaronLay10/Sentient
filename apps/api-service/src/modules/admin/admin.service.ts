import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TopologyNode {
  id: string;
  type: 'room' | 'controller' | 'device' | 'service' | 'infra';
  label: string;
  roomId?: string;
  controllerId?: string;
  deviceId?: string;
  serviceName?: string;
  status?: 'online' | 'offline' | 'degraded' | 'unknown';
  metadata?: Record<string, any>;
}

export interface TopologyEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface RoomTopologyData {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'maintenance';
  controllers: Array<{
    id: string;
    name: string;
    status: 'online' | 'offline' | 'unknown';
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

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemTopology(): Promise<RoomTopologyResponse> {
    // Helper function to determine status based on last_seen
    const getStatusFromLastSeen = (lastSeen: Date | null): 'online' | 'offline' | 'unknown' => {
      if (!lastSeen) return 'unknown';
      const now = new Date();
      const diff = now.getTime() - lastSeen.getTime();
      // Consider offline if no heartbeat in last 30 seconds
      return diff < 30000 ? 'online' : 'offline';
    };

    // Fetch all rooms with their controllers and devices
    const rooms = await this.prisma.room.findMany({
      include: {
        controllers: {
          include: {
            devices: true,
          },
        },
      },
    });

    // Map rooms to topology format
    const roomsData: RoomTopologyData[] = rooms.map((room) => ({
      id: room.id,
      name: room.name,
      status: 'online', // TODO: Determine actual room status
      controllers: room.controllers.map((controller) => ({
        id: controller.id,
        name: controller.friendly_name,
        status: getStatusFromLastSeen(controller.last_seen),
        devices: controller.devices.map((device) => ({
          id: device.id,
          name: device.friendly_name,
          type: device.device_type,
          status: getStatusFromLastSeen(device.last_seen),
        })),
      })),
    }));

    // Define core services and infrastructure
    const services: ServiceInfo[] = [
      { name: 'api-service', type: 'core', status: 'online' },
      { name: 'orchestrator-service', type: 'core', status: 'online' },
      { name: 'mqtt-gateway', type: 'core', status: 'online' },
      { name: 'realtime-gateway', type: 'core', status: 'online' },
      { name: 'mosquitto', type: 'infra', status: 'online' },
      { name: 'redis', type: 'infra', status: 'online' },
      { name: 'postgres', type: 'infra', status: 'online' },
    ];

    // Build nodes and edges for graph visualization
    const nodes: TopologyNode[] = [];
    const edges: TopologyEdge[] = [];

    // Add infrastructure nodes
    nodes.push(
      { id: 'postgres', type: 'infra', label: 'PostgreSQL', serviceName: 'postgres', status: 'online' },
      { id: 'redis', type: 'infra', label: 'Redis', serviceName: 'redis', status: 'online' },
      { id: 'mosquitto', type: 'infra', label: 'MQTT Broker', serviceName: 'mosquitto', status: 'online' }
    );

    // Add core service nodes
    nodes.push(
      { id: 'api-service', type: 'service', label: 'API Service', serviceName: 'api-service', status: 'online' },
      { id: 'orchestrator-service', type: 'service', label: 'Orchestrator', serviceName: 'orchestrator-service', status: 'online' },
      { id: 'mqtt-gateway', type: 'service', label: 'MQTT Gateway', serviceName: 'mqtt-gateway', status: 'online' },
      { id: 'realtime-gateway', type: 'service', label: 'Realtime Gateway', serviceName: 'realtime-gateway', status: 'online' }
    );

    // Service to infrastructure edges
    edges.push(
      { id: 'api-postgres', sourceId: 'api-service', targetId: 'postgres', label: 'SQL' },
      { id: 'api-redis', sourceId: 'api-service', targetId: 'redis', label: 'Cache' },
      { id: 'orch-postgres', sourceId: 'orchestrator-service', targetId: 'postgres', label: 'SQL' },
      { id: 'orch-redis', sourceId: 'orchestrator-service', targetId: 'redis', label: 'Pub/Sub' },
      { id: 'mqtt-gw-mosquitto', sourceId: 'mqtt-gateway', targetId: 'mosquitto', label: 'MQTT' },
      { id: 'mqtt-gw-redis', sourceId: 'mqtt-gateway', targetId: 'redis', label: 'Pub/Sub' },
      { id: 'rt-gw-redis', sourceId: 'realtime-gateway', targetId: 'redis', label: 'Pub/Sub' }
    );

    // Add room, controller, and device nodes
    for (const room of roomsData) {
      const roomStatus: 'online' | 'offline' | 'degraded' | 'unknown' =
        room.status === 'maintenance' ? 'degraded' : room.status;

      nodes.push({
        id: room.id,
        type: 'room',
        label: room.name,
        roomId: room.id,
        status: roomStatus,
      });

      // Room connects to orchestrator
      edges.push({
        id: `${room.id}-orchestrator`,
        sourceId: 'orchestrator-service',
        targetId: room.id,
        label: 'Controls',
      });

      for (const controller of room.controllers) {
        nodes.push({
          id: controller.id,
          type: 'controller',
          label: controller.name,
          roomId: room.id,
          controllerId: controller.id,
          status: controller.status,
        });

        // Controller connects to room
        edges.push({
          id: `${controller.id}-${room.id}`,
          sourceId: controller.id,
          targetId: room.id,
        });

        // Controller connects to MQTT Gateway
        edges.push({
          id: `${controller.id}-mqtt-gw`,
          sourceId: controller.id,
          targetId: 'mqtt-gateway',
          label: 'MQTT',
        });

        for (const device of controller.devices) {
          nodes.push({
            id: device.id,
            type: 'device',
            label: device.name,
            roomId: room.id,
            controllerId: controller.id,
            deviceId: device.id,
            status: device.status,
            metadata: { deviceType: device.type },
          });

          // Device connects to controller
          edges.push({
            id: `${device.id}-${controller.id}`,
            sourceId: device.id,
            targetId: controller.id,
          });
        }
      }
    }

    return {
      rooms: roomsData,
      services,
      nodes,
      edges,
    };
  }

  async getAllRooms() {
    return this.prisma.room.findMany({
      select: {
        id: true,
        name: true,
        clientId: true,
        venueId: true,
        created_at: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAllDevices() {
    const devices = await this.prisma.device.findMany({
      include: {
        actions: true,
      },
      orderBy: { friendly_name: 'asc' },
    });

    return devices.map(device => ({
      id: device.id,
      friendly_name: device.friendly_name,
      device_type: device.device_type,
      device_category: device.device_category,
      controller_id: device.controllerId,
      status: 'operational' as const,
      properties: device.properties,
      current_state: device.current_state,
      state_updated_at: device.state_updated_at?.toISOString(),
      actions: device.actions.map(action => ({
        action_id: action.action_id,
        mqtt_topic: action.mqtt_topic,
        friendly_name: action.action_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      })),
      created_at: device.created_at.toISOString(),
    }));
  }
}
