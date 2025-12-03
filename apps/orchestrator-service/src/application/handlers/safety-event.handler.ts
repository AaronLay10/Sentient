import {
  EventType,
  DomainEvent,
  EmergencyStopTriggeredEvent,
  EmergencyStopClearedEvent,
  MaglockReleasedEvent,
  SafetyAlertEvent,
} from '@sentient/core-domain';
import { Logger } from '@sentient/shared-logging';
import { EventPublisher } from '@sentient/shared-messaging';
import { OrchestratorService } from '../services/orchestrator.service';

/**
 * Handles safety-related events including emergency stops and maglock releases.
 * CRITICAL: Safety events always take priority over game logic.
 */
export class SafetyEventHandler {
  // Track rooms in emergency stop state
  private emergencyStopRooms: Set<string> = new Set();

  // Track released maglocks
  private releasedMaglocks: Map<string, { room_id: string; released_at: Date; reason: string }> = new Map();

  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly eventPublisher: EventPublisher,
    private readonly logger: Logger
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    // Safety events are CRITICAL - always log at info level or higher
    switch (event.type) {
      case EventType.EMERGENCY_STOP_TRIGGERED:
        await this.handleEmergencyStopTriggered(event as EmergencyStopTriggeredEvent);
        break;
      case EventType.EMERGENCY_STOP_CLEARED:
        await this.handleEmergencyStopCleared(event as EmergencyStopClearedEvent);
        break;
      case EventType.MAGLOCK_RELEASED:
        await this.handleMaglockReleased(event as MaglockReleasedEvent);
        break;
      case EventType.SAFETY_ALERT:
        await this.handleSafetyAlert(event as SafetyAlertEvent);
        break;
      default:
        this.logger.warn('Unknown safety event type', { type: event.type });
    }
  }

  private async handleEmergencyStopTriggered(event: EmergencyStopTriggeredEvent): Promise<void> {
    const { room_id, session_id, data } = event;

    // Mark room as in emergency stop state
    this.emergencyStopRooms.add(room_id);

    this.logger.warn('EMERGENCY STOP TRIGGERED', {
      room_id,
      session_id,
      triggered_by: data.triggered_by,
      trigger_source: data.trigger_source,
      reason: data.reason,
    });

    // Pause any active session in this room
    if (session_id) {
      try {
        await this.orchestrator.pauseSession(
          session_id,
          data.triggered_by ?? 'EMERGENCY_STOP',
          `Emergency stop: ${data.reason ?? 'No reason provided'}`
        );
        this.logger.info('Session paused due to emergency stop', { session_id, room_id });
      } catch (error) {
        this.logger.error('Failed to pause session during emergency stop', error as Error, {
          session_id,
          room_id,
        });
      }
    }

    // In production, this would also:
    // - Release all maglocks in the room
    // - Stop all audio/video
    // - Turn on emergency lighting
    // - Notify all connected clients immediately
    // - Log to audit trail
  }

  private async handleEmergencyStopCleared(event: EmergencyStopClearedEvent): Promise<void> {
    const { room_id, session_id, data } = event;

    // Remove room from emergency stop state
    this.emergencyStopRooms.delete(room_id);

    this.logger.info('Emergency stop cleared', {
      room_id,
      session_id,
      cleared_by: data.cleared_by,
    });

    // Note: We do NOT automatically resume the session
    // GM must explicitly resume after verifying safety
  }

  private async handleMaglockReleased(event: MaglockReleasedEvent): Promise<void> {
    const { device_id, controller_id, room_id, session_id, data } = event;

    // Track the maglock release
    this.releasedMaglocks.set(device_id, {
      room_id,
      released_at: new Date(),
      reason: data.reason,
    });

    this.logger.info('Maglock released', {
      device_id,
      controller_id,
      room_id,
      session_id,
      reason: data.reason,
      initiated_by: data.initiated_by,
    });

    // Maglocks can be released for various reasons:
    // - Puzzle solved (normal game flow)
    // - Emergency stop (safety)
    // - GM manual override (troubleshooting)
    // - Fire alarm integration (safety)

    // In production, track for analytics and ensure proper re-lock on reset
  }

  private async handleSafetyAlert(event: SafetyAlertEvent): Promise<void> {
    const { room_id, session_id, data } = event;

    // Critical alerts should trigger immediate action
    if (data.severity === 'critical') {
      this.logger.error('CRITICAL SAFETY ALERT', new Error(data.message), {
        room_id,
        session_id,
        alert_type: data.alert_type,
        source: data.source,
      });

      // For critical alerts, consider pausing the session
      if (session_id) {
        try {
          await this.orchestrator.pauseSession(
            session_id,
            'SAFETY_SYSTEM',
            `Critical safety alert: ${data.alert_type}`
          );
        } catch (error) {
          this.logger.error('Failed to pause session for critical alert', error as Error, {
            session_id,
          });
        }
      }
    } else {
      this.logger.warn('Safety alert', {
        room_id,
        session_id,
        severity: data.severity,
        alert_type: data.alert_type,
        message: data.message,
        source: data.source,
      });
    }

    // In production, safety alerts would be:
    // - Displayed on GM console
    // - Logged to audit trail
    // - Potentially sent to monitoring systems
  }

  /**
   * Check if a room is currently in emergency stop state.
   */
  isRoomInEmergencyStop(roomId: string): boolean {
    return this.emergencyStopRooms.has(roomId);
  }

  /**
   * Get all rooms currently in emergency stop state.
   */
  getRoomsInEmergencyStop(): string[] {
    return Array.from(this.emergencyStopRooms);
  }

  /**
   * Get status of a specific maglock.
   */
  getMaglockStatus(deviceId: string): { room_id: string; released_at: Date; reason: string } | undefined {
    return this.releasedMaglocks.get(deviceId);
  }
}
