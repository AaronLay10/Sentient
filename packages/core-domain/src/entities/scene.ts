export interface Scene {
  id: string;
  room_id: string;
  name: string;
  description?: string;
  order: number;
  entry_conditions?: Record<string, any>;
  exit_conditions?: Record<string, any>;
  effects?: Record<string, any>;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SceneState {
  scene_id: string;
  session_id: string;
  status: 'not_started' | 'active' | 'completed';
  started_at?: Date;
  completed_at?: Date;
}
