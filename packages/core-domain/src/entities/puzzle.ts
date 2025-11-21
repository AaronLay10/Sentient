export interface Puzzle {
  id: string;
  room_id: string;
  scene_id?: string;
  name: string;
  description?: string;
  order: number;
  dependencies?: string[];
  timeout_seconds?: number;
  hint_text?: string;
  solution_config?: Record<string, any>;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PuzzleState {
  puzzle_id: string;
  session_id: string;
  status: 'not_started' | 'in_progress' | 'solved' | 'failed' | 'skipped';
  progress?: Record<string, any>;
  started_at?: Date;
  completed_at?: Date;
  attempts?: number;
}
