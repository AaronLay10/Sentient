import { HealthStatus } from '@sentient/core-domain';

export interface CreateRoomDto {
  venue_id: string;
  name: string;
  slug: string;
  description?: string;
  capacity?: number;
}

export interface UpdateRoomDto {
  name?: string;
  slug?: string;
  description?: string;
  capacity?: number;
  health_status?: HealthStatus;
  active?: boolean;
}

export interface RoomDto {
  id: string;
  venue_id: string;
  name: string;
  slug: string;
  description?: string;
  capacity?: number;
  active: boolean;
  health_status: HealthStatus;
  created_at: Date;
  updated_at: Date;
}

export interface RoomHealthDto {
  room_id: string;
  overall: HealthStatus;
  controllers: {
    total: number;
    online: number;
    offline: number;
    warnings: number;
    errors: number;
  };
  devices: {
    total: number;
    operational: number;
    warnings: number;
    errors: number;
  };
  issues: Array<{
    id: string;
    severity: 'warning' | 'critical';
    message: string;
    source: string;
    timestamp: string;
  }>;
}
