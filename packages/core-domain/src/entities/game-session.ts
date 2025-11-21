import { GameSessionStatus } from '../enums';

export interface GameSession {
  id: string;
  room_id: string;
  status: GameSessionStatus;
  team_name?: string;
  team_size?: number;
  started_at?: Date;
  ended_at?: Date;
  duration_seconds?: number;
  completed: boolean;
  hints_used: number;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}
