import {
  EventType,
  DomainEvent,
  SessionCreatedEvent,
  SessionStartedEvent,
  SessionPausedEvent,
  SessionResumedEvent,
  SessionCompletedEvent,
  SessionAbandonedEvent,
} from '@sentient/core-domain';
import { Logger } from '@sentient/shared-logging';
import { OrchestratorService } from '../services/orchestrator.service';
import { EventPublisher } from '@sentient/shared-messaging';

/**
 * Handles session lifecycle events from external sources (API, GM console).
 * These events come INTO the orchestrator to trigger session state changes.
 */
export class SessionEventHandler {
  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly eventPublisher: EventPublisher,
    private readonly logger: Logger
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case EventType.SESSION_CREATED:
        await this.handleSessionCreated(event as SessionCreatedEvent);
        break;
      case EventType.SESSION_STARTED:
        await this.handleSessionStarted(event as SessionStartedEvent);
        break;
      case EventType.SESSION_PAUSED:
        await this.handleSessionPaused(event as SessionPausedEvent);
        break;
      case EventType.SESSION_RESUMED:
        await this.handleSessionResumed(event as SessionResumedEvent);
        break;
      case EventType.SESSION_COMPLETED:
        await this.handleSessionCompleted(event as SessionCompletedEvent);
        break;
      case EventType.SESSION_ABANDONED:
        await this.handleSessionAbandoned(event as SessionAbandonedEvent);
        break;
      default:
        this.logger.warn('Unknown session event type', { type: event.type });
    }
  }

  private async handleSessionCreated(event: SessionCreatedEvent): Promise<void> {
    const { session_id, room_id, data } = event;

    this.logger.info('Session created', {
      session_id,
      room_id,
      team_name: data.team_name,
      team_size: data.team_size,
    });

    // Load the session into active memory for the orchestrator
    try {
      await this.orchestrator.loadActiveSessions(room_id);
    } catch (error) {
      this.logger.error('Failed to load session after creation', error as Error, {
        session_id,
        room_id,
      });
    }
  }

  private async handleSessionStarted(event: SessionStartedEvent): Promise<void> {
    const { session_id, room_id } = event;

    this.logger.info('Session start requested', { session_id, room_id });

    try {
      await this.orchestrator.startSession(session_id);
    } catch (error) {
      this.logger.error('Failed to start session', error as Error, {
        session_id,
        room_id,
      });
    }
  }

  private async handleSessionPaused(event: SessionPausedEvent): Promise<void> {
    const { session_id, room_id, data } = event;

    this.logger.info('Session pause requested', {
      session_id,
      room_id,
      initiated_by: data.initiated_by,
      reason: data.reason,
    });

    try {
      await this.orchestrator.pauseSession(session_id, data.initiated_by, data.reason);
    } catch (error) {
      this.logger.error('Failed to pause session', error as Error, {
        session_id,
        room_id,
      });
    }
  }

  private async handleSessionResumed(event: SessionResumedEvent): Promise<void> {
    const { session_id, room_id, data } = event;

    this.logger.info('Session resume requested', {
      session_id,
      room_id,
      initiated_by: data.initiated_by,
    });

    try {
      await this.orchestrator.resumeSession(session_id, data.initiated_by);
    } catch (error) {
      this.logger.error('Failed to resume session', error as Error, {
        session_id,
        room_id,
      });
    }
  }

  private async handleSessionCompleted(event: SessionCompletedEvent): Promise<void> {
    const { session_id, room_id, data } = event;

    this.logger.info('Session completed', {
      session_id,
      room_id,
      duration_seconds: data.duration_seconds,
      hints_used: data.hints_used,
      completed: data.completed,
    });

    try {
      await this.orchestrator.completeSession(session_id, data.completed);
    } catch (error) {
      this.logger.error('Failed to complete session', error as Error, {
        session_id,
        room_id,
      });
    }
  }

  private async handleSessionAbandoned(event: SessionAbandonedEvent): Promise<void> {
    const { session_id, room_id, data } = event;

    this.logger.warn('Session abandoned', {
      session_id,
      room_id,
      reason: data.reason,
      initiated_by: data.initiated_by,
    });

    try {
      // Complete session as unsuccessful
      await this.orchestrator.completeSession(session_id, false);
    } catch (error) {
      this.logger.error('Failed to handle abandoned session', error as Error, {
        session_id,
        room_id,
      });
    }
  }
}
