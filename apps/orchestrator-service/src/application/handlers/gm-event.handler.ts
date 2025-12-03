import {
  EventType,
  DomainEvent,
  HintUsedEvent,
  ManualOverrideEvent,
  GMCommandEvent,
} from '@sentient/core-domain';
import { Logger } from '@sentient/shared-logging';
import { EventPublisher } from '@sentient/shared-messaging';
import { OrchestratorService } from '../services/orchestrator.service';

/**
 * Handles Game Master (GM) events including hints, manual overrides, and commands.
 * These are operator-initiated actions that affect game flow.
 */
export class GMEventHandler {
  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly eventPublisher: EventPublisher,
    private readonly logger: Logger
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case EventType.HINT_USED:
        await this.handleHintUsed(event as HintUsedEvent);
        break;
      case EventType.MANUAL_OVERRIDE:
        await this.handleManualOverride(event as ManualOverrideEvent);
        break;
      case EventType.GM_COMMAND:
        await this.handleGMCommand(event as GMCommandEvent);
        break;
      default:
        this.logger.warn('Unknown GM event type', { type: event.type });
    }
  }

  private async handleHintUsed(event: HintUsedEvent): Promise<void> {
    const { session_id, room_id, data } = event;

    this.logger.info('Hint delivered', {
      session_id,
      room_id,
      hint_number: data.hint_number,
      delivered_by: data.delivered_by,
      initiated_by: data.initiated_by,
    });

    // Track hint usage in the session
    try {
      await this.orchestrator.useHint(session_id);
    } catch (error) {
      this.logger.error('Failed to record hint usage', error as Error, {
        session_id,
        room_id,
      });
    }

    // In production, hints would also:
    // - Be logged for analytics
    // - Affect final score/time calculations
    // - Trigger audio/video delivery systems
  }

  private async handleManualOverride(event: ManualOverrideEvent): Promise<void> {
    const { session_id, room_id, data } = event;

    this.logger.info('Manual override executed', {
      session_id,
      room_id,
      target_type: data.target_type,
      target_id: data.target_id,
      action: data.action,
      initiated_by: data.initiated_by,
      reason: data.reason,
    });

    // Handle different override types
    switch (data.target_type) {
      case 'puzzle':
        await this.handlePuzzleOverride(session_id, data);
        break;
      case 'device':
        await this.handleDeviceOverride(room_id, data);
        break;
      case 'scene':
        await this.handleSceneOverride(session_id, data);
        break;
      case 'effect':
        await this.handleEffectOverride(room_id, data);
        break;
      default:
        this.logger.warn('Unknown override target type', {
          target_type: data.target_type,
        });
    }
  }

  private async handlePuzzleOverride(
    sessionId: string | undefined,
    data: ManualOverrideEvent['data']
  ): Promise<void> {
    if (!sessionId) {
      this.logger.warn('Puzzle override requires session_id');
      return;
    }

    if (data.action === 'skip' || data.action === 'solve') {
      try {
        await this.orchestrator.skipPuzzle(sessionId, data.target_id, data.initiated_by);
        this.logger.info('Puzzle skipped via manual override', {
          session_id: sessionId,
          puzzle_id: data.target_id,
          initiated_by: data.initiated_by,
        });
      } catch (error) {
        this.logger.error('Failed to skip puzzle', error as Error, {
          session_id: sessionId,
          puzzle_id: data.target_id,
        });
      }
    } else if (data.action === 'reset') {
      // Puzzle reset would need additional orchestrator support
      this.logger.info('Puzzle reset requested', {
        session_id: sessionId,
        puzzle_id: data.target_id,
      });
    }
  }

  private async handleDeviceOverride(
    roomId: string,
    data: ManualOverrideEvent['data']
  ): Promise<void> {
    // Device overrides are handled by publishing commands through the normal channel
    // The MQTT gateway will pick these up and send to the controller
    this.logger.info('Device override requested', {
      room_id: roomId,
      device_id: data.target_id,
      action: data.action,
      parameters: data.parameters,
    });

    // In production, this would publish a device command event
    // await this.eventPublisher.publishDeviceCommand({...})
  }

  private async handleSceneOverride(
    sessionId: string | undefined,
    data: ManualOverrideEvent['data']
  ): Promise<void> {
    this.logger.info('Scene override requested', {
      session_id: sessionId,
      scene_id: data.target_id,
      action: data.action,
    });

    // Scene overrides could:
    // - Force advance to next scene
    // - Reset current scene
    // - Jump to specific scene
  }

  private async handleEffectOverride(
    roomId: string,
    data: ManualOverrideEvent['data']
  ): Promise<void> {
    this.logger.info('Effect override requested', {
      room_id: roomId,
      effect_id: data.target_id,
      action: data.action,
      parameters: data.parameters,
    });

    // Effect overrides trigger audio, lighting, or prop effects
    // outside of normal game flow
  }

  private async handleGMCommand(event: GMCommandEvent): Promise<void> {
    const { session_id, room_id, data } = event;

    this.logger.info('GM command received', {
      session_id,
      room_id,
      command: data.command,
      initiated_by: data.initiated_by,
    });

    // Handle common GM commands
    switch (data.command) {
      case 'pause':
        if (session_id) {
          await this.orchestrator.pauseSession(session_id, data.initiated_by, 'GM Command');
        }
        break;

      case 'resume':
        if (session_id) {
          await this.orchestrator.resumeSession(session_id, data.initiated_by);
        }
        break;

      case 'add_time':
        // Add extra time to session
        this.logger.info('Add time requested', {
          session_id,
          minutes: data.parameters?.minutes,
        });
        break;

      case 'subtract_time':
        // Subtract time from session
        this.logger.info('Subtract time requested', {
          session_id,
          minutes: data.parameters?.minutes,
        });
        break;

      case 'reset_room':
        // Trigger room reset sequence
        this.logger.info('Room reset requested', { room_id });
        break;

      case 'end_game':
        if (session_id) {
          const success = data.parameters?.success ?? false;
          await this.orchestrator.completeSession(session_id, success);
        }
        break;

      default:
        this.logger.warn('Unknown GM command', { command: data.command });
    }
  }
}
