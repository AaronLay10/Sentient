import { HealthStatus } from '../enums';

export interface Room {
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
