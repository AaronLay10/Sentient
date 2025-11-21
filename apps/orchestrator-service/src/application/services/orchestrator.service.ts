import { GameSessionAggregate } from '../../domain/aggregates/game-session.aggregate';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { PuzzleEvaluatorService } from '../../domain/services/puzzle-evaluator.service';
import { EventPublisher } from '@sentient/shared-messaging';
import { DeviceStateChangedEvent, DomainEvent } from '@sentient/core-domain';
import { Logger } from '@sentient/shared-logging';

export class OrchestratorService {
  private activeSessions: Map<string, GameSessionAggregate> = new Map();

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly puzzleEvaluator: PuzzleEvaluatorService,
    private readonly eventPublisher: EventPublisher,
    private readonly logger: Logger
  ) {}

  async loadActiveSessions(roomId: string): Promise<void> {
    const sessions = await this.sessionRepository.findActiveByRoomId(roomId);

    for (const session of sessions) {
      this.activeSessions.set(session.getSession().id, session);
      this.logger.info(`Loaded active session`, {
        session_id: session.getSession().id,
        room_id: roomId,
      });
    }
  }

  async startSession(sessionId: string): Promise<void> {
    let session = this.activeSessions.get(sessionId);

    if (!session) {
      const loadedSession = await this.sessionRepository.findById(sessionId);
      if (!loadedSession) {
        throw new Error(`Session ${sessionId} not found`);
      }
      session = loadedSession;
      this.activeSessions.set(sessionId, session);
    }

    session.start();
    await this.sessionRepository.save(session);
    await this.publishEvents(session);

    this.logger.info('Session started', { session_id: sessionId });
  }

  async pauseSession(sessionId: string, initiatedBy: string, reason?: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not active`);
    }

    session.pause(initiatedBy, reason);
    await this.sessionRepository.save(session);
    await this.publishEvents(session);

    this.logger.info('Session paused', { session_id: sessionId, initiated_by: initiatedBy });
  }

  async resumeSession(sessionId: string, initiatedBy: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not active`);
    }

    session.resume(initiatedBy);
    await this.sessionRepository.save(session);
    await this.publishEvents(session);

    this.logger.info('Session resumed', { session_id: sessionId, initiated_by: initiatedBy });
  }

  async completeSession(sessionId: string, completed: boolean): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not active`);
    }

    session.complete(completed);
    await this.sessionRepository.save(session);
    await this.publishEvents(session);

    this.activeSessions.delete(sessionId);
    this.logger.info('Session completed', { session_id: sessionId, completed });
  }

  async handleDeviceStateChange(event: DeviceStateChangedEvent): Promise<void> {
    // Find sessions in the room where this device changed
    const roomId = event.room_id;
    if (!roomId) return;

    const sessions = Array.from(this.activeSessions.values()).filter(
      s => s.getSession().room_id === roomId && s.getSession().status === 'running'
    );

    for (const session of sessions) {
      await this.evaluatePuzzles(session, event);
    }
  }

  async skipPuzzle(sessionId: string, puzzleId: string, initiatedBy: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not active`);
    }

    session.skipPuzzle(puzzleId, initiatedBy);
    await this.sessionRepository.save(session);
    await this.publishEvents(session);

    this.logger.info('Puzzle skipped', {
      session_id: sessionId,
      puzzle_id: puzzleId,
      initiated_by: initiatedBy,
    });
  }

  async useHint(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not active`);
    }

    session.useHint();
    await this.sessionRepository.save(session);
    await this.publishEvents(session);

    this.logger.info('Hint used', { session_id: sessionId });
  }

  private async evaluatePuzzles(session: GameSessionAggregate, event: DeviceStateChangedEvent): Promise<void> {
    // In a real implementation, this would:
    // 1. Load puzzle definitions for active scene
    // 2. Get current device states
    // 3. Evaluate each in-progress puzzle
    // 4. Mark puzzles as solved if conditions met

    this.logger.debug('Evaluating puzzles', {
      session_id: session.getSession().id,
      device_id: event.device_id,
    });

    // Placeholder for puzzle evaluation logic
  }

  private async publishEvents(session: GameSessionAggregate): Promise<void> {
    const events = session.getEvents();

    for (const event of events) {
      await this.eventPublisher.publishDomainEvent(event);
      this.logger.debug('Published event', { event_type: event.type, event_id: event.event_id });
    }

    session.clearEvents();
  }
}
