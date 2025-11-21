import { GameSession, GameSessionStatus, Puzzle, Scene, DomainEvent, EventType } from '@sentient/core-domain';
import { v4 as uuid } from 'uuid';

export interface PuzzleProgress {
  puzzle_id: string;
  status: 'not_started' | 'in_progress' | 'solved' | 'failed' | 'skipped';
  started_at?: Date;
  completed_at?: Date;
  attempts: number;
  progress?: Record<string, any>;
}

export interface SceneProgress {
  scene_id: string;
  status: 'not_started' | 'active' | 'completed';
  started_at?: Date;
  completed_at?: Date;
}

export class GameSessionAggregate {
  private session: GameSession;
  private puzzles: Map<string, PuzzleProgress> = new Map();
  private scenes: Map<string, SceneProgress> = new Map();
  private currentSceneId?: string;
  private events: DomainEvent[] = [];

  constructor(session: GameSession) {
    this.session = session;
  }

  start(): void {
    if (this.session.status !== GameSessionStatus.CREATED && this.session.status !== GameSessionStatus.READY) {
      throw new Error(`Cannot start session in ${this.session.status} status`);
    }

    this.session.status = GameSessionStatus.RUNNING;
    this.session.started_at = new Date();

    this.addEvent({
      event_id: uuid(),
      type: EventType.SESSION_STARTED,
      timestamp: new Date(),
      session_id: this.session.id,
      room_id: this.session.room_id,
      data: {},
    });
  }

  pause(initiatedBy: string, reason?: string): void {
    if (this.session.status !== GameSessionStatus.RUNNING) {
      throw new Error(`Cannot pause session in ${this.session.status} status`);
    }

    this.session.status = GameSessionStatus.PAUSED;

    this.addEvent({
      event_id: uuid(),
      type: EventType.SESSION_PAUSED,
      timestamp: new Date(),
      session_id: this.session.id,
      room_id: this.session.room_id,
      data: { initiated_by: initiatedBy, reason },
    });
  }

  resume(initiatedBy: string): void {
    if (this.session.status !== GameSessionStatus.PAUSED) {
      throw new Error(`Cannot resume session in ${this.session.status} status`);
    }

    this.session.status = GameSessionStatus.RUNNING;

    this.addEvent({
      event_id: uuid(),
      type: EventType.SESSION_RESUMED,
      timestamp: new Date(),
      session_id: this.session.id,
      room_id: this.session.room_id,
      data: { initiated_by: initiatedBy },
    });
  }

  complete(completed: boolean): void {
    if (this.session.status !== GameSessionStatus.RUNNING) {
      throw new Error(`Cannot complete session in ${this.session.status} status`);
    }

    this.session.status = GameSessionStatus.COMPLETED;
    this.session.ended_at = new Date();
    this.session.completed = completed;

    if (this.session.started_at) {
      const duration = this.session.ended_at.getTime() - this.session.started_at.getTime();
      this.session.duration_seconds = Math.floor(duration / 1000);
    }

    this.addEvent({
      event_id: uuid(),
      type: EventType.SESSION_COMPLETED,
      timestamp: new Date(),
      session_id: this.session.id,
      room_id: this.session.room_id,
      data: {
        duration_seconds: this.session.duration_seconds || 0,
        hints_used: this.session.hints_used,
        completed,
      },
    });
  }

  startScene(sceneId: string): void {
    const scene: SceneProgress = this.scenes.get(sceneId) || {
      scene_id: sceneId,
      status: 'not_started' as const,
    };

    scene.status = 'active';
    scene.started_at = new Date();
    this.scenes.set(sceneId, scene);
    this.currentSceneId = sceneId;

    this.addEvent({
      event_id: uuid(),
      type: EventType.SCENE_STARTED,
      timestamp: new Date(),
      session_id: this.session.id,
      room_id: this.session.room_id,
      scene_id: sceneId,
      data: {},
    });
  }

  completeScene(sceneId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene ${sceneId} not found`);
    }

    scene.status = 'completed';
    scene.completed_at = new Date();
    this.scenes.set(sceneId, scene);

    const durationSeconds = scene.started_at
      ? Math.floor((scene.completed_at.getTime() - scene.started_at.getTime()) / 1000)
      : 0;

    this.addEvent({
      event_id: uuid(),
      type: EventType.SCENE_COMPLETED,
      timestamp: new Date(),
      session_id: this.session.id,
      room_id: this.session.room_id,
      scene_id: sceneId,
      data: { duration_seconds: durationSeconds },
    });
  }

  startPuzzle(puzzleId: string): void {
    const puzzle = this.puzzles.get(puzzleId) || {
      puzzle_id: puzzleId,
      status: 'not_started' as const,
      attempts: 0,
    };

    puzzle.status = 'in_progress';
    puzzle.started_at = new Date();
    this.puzzles.set(puzzleId, puzzle);

    this.addEvent({
      event_id: uuid(),
      type: EventType.PUZZLE_STARTED,
      timestamp: new Date(),
      session_id: this.session.id,
      room_id: this.session.room_id,
      puzzle_id: puzzleId,
      data: {},
    });
  }

  solvePuzzle(puzzleId: string): void {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle) {
      throw new Error(`Puzzle ${puzzleId} not found`);
    }

    puzzle.status = 'solved';
    puzzle.completed_at = new Date();
    this.puzzles.set(puzzleId, puzzle);

    const durationSeconds = puzzle.started_at
      ? Math.floor((puzzle.completed_at.getTime() - puzzle.started_at.getTime()) / 1000)
      : 0;

    this.addEvent({
      event_id: uuid(),
      type: EventType.PUZZLE_SOLVED,
      timestamp: new Date(),
      session_id: this.session.id,
      room_id: this.session.room_id,
      puzzle_id: puzzleId,
      data: {
        duration_seconds: durationSeconds,
        attempts: puzzle.attempts,
      },
    });
  }

  skipPuzzle(puzzleId: string, initiatedBy: string): void {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle) {
      throw new Error(`Puzzle ${puzzleId} not found`);
    }

    puzzle.status = 'skipped';
    puzzle.completed_at = new Date();
    this.puzzles.set(puzzleId, puzzle);

    this.addEvent({
      event_id: uuid(),
      type: EventType.PUZZLE_SKIPPED,
      timestamp: new Date(),
      session_id: this.session.id,
      room_id: this.session.room_id,
      puzzle_id: puzzleId,
      data: { initiated_by: initiatedBy },
    });
  }

  useHint(): void {
    this.session.hints_used++;

    this.addEvent({
      event_id: uuid(),
      type: EventType.HINT_USED,
      timestamp: new Date(),
      session_id: this.session.id,
      room_id: this.session.room_id,
      data: { hints_used: this.session.hints_used },
    });
  }

  getSession(): GameSession {
    return this.session;
  }

  getPuzzleProgress(puzzleId: string): PuzzleProgress | undefined {
    return this.puzzles.get(puzzleId);
  }

  getSceneProgress(sceneId: string): SceneProgress | undefined {
    return this.scenes.get(sceneId);
  }

  getCurrentSceneId(): string | undefined {
    return this.currentSceneId;
  }

  getEvents(): DomainEvent[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }

  private addEvent(event: DomainEvent): void {
    this.events.push(event);
  }
}
