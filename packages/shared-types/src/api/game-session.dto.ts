import { GameSessionStatus } from '@sentient/core-domain';

export interface CreateGameSessionDto {
  room_id: string;
  team_name?: string;
  team_size?: number;
  metadata?: Record<string, any>;
}

export interface UpdateGameSessionDto {
  status?: GameSessionStatus;
  team_name?: string;
  team_size?: number;
  metadata?: Record<string, any>;
}

export interface GameSessionDto {
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

export interface StartSessionDto {
  session_id: string;
}

export interface PauseSessionDto {
  session_id: string;
  reason?: string;
}

export interface ResumeSessionDto {
  session_id: string;
}

export interface EndSessionDto {
  session_id: string;
  completed: boolean;
  reason?: string;
}
