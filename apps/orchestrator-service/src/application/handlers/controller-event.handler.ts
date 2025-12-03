import {
  EventType,
  DomainEvent,
  ControllerHeartbeatEvent,
  ControllerOnlineEvent,
  ControllerOfflineEvent,
  ControllerErrorEvent,
  ControllerRegisteredEvent,
} from '@sentient/core-domain';
import { Logger } from '@sentient/shared-logging';
import { EventPublisher } from '@sentient/shared-messaging';

/**
 * Handles controller-related events including heartbeats, online/offline status, and errors.
 * Primary responsibilities:
 * - Track controller health and connectivity
 * - Detect controller failures and trigger alerts
 * - Update room readiness based on controller status
 */
export class ControllerEventHandler {
  // Track last heartbeat times for each controller
  private controllerHeartbeats: Map<string, Date> = new Map();

  // Track controller status
  private controllerStatus: Map<string, 'online' | 'offline' | 'error'> = new Map();

  constructor(
    private readonly eventPublisher: EventPublisher,
    private readonly logger: Logger
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case EventType.CONTROLLER_HEARTBEAT:
        await this.handleHeartbeat(event as ControllerHeartbeatEvent);
        break;
      case EventType.CONTROLLER_ONLINE:
        await this.handleOnline(event as ControllerOnlineEvent);
        break;
      case EventType.CONTROLLER_OFFLINE:
        await this.handleOffline(event as ControllerOfflineEvent);
        break;
      case EventType.CONTROLLER_ERROR:
        await this.handleError(event as ControllerErrorEvent);
        break;
      case EventType.CONTROLLER_REGISTERED:
        await this.handleRegistered(event as ControllerRegisteredEvent);
        break;
      default:
        this.logger.warn('Unknown controller event type', { type: event.type });
    }
  }

  private async handleHeartbeat(event: ControllerHeartbeatEvent): Promise<void> {
    const { controller_id, room_id, data } = event;

    this.controllerHeartbeats.set(controller_id, new Date());

    // If controller was previously offline, mark it as back online
    const previousStatus = this.controllerStatus.get(controller_id);
    if (previousStatus === 'offline' || previousStatus === 'error') {
      this.controllerStatus.set(controller_id, 'online');
      this.logger.info('Controller recovered', {
        controller_id,
        room_id,
        previous_status: previousStatus,
      });
    }

    this.logger.debug('Controller heartbeat received', {
      controller_id,
      room_id,
      uptime_seconds: data.uptime_seconds,
      free_memory_bytes: data.free_memory_bytes,
      cpu_usage_percent: data.cpu_usage_percent,
      temperature_celsius: data.temperature_celsius,
    });

    // Check for resource warnings
    if (data.free_memory_bytes !== undefined && data.free_memory_bytes < 1024 * 1024) {
      this.logger.warn('Controller low memory warning', {
        controller_id,
        room_id,
        free_memory_bytes: data.free_memory_bytes,
      });
    }

    if (data.temperature_celsius !== undefined && data.temperature_celsius > 70) {
      this.logger.warn('Controller high temperature warning', {
        controller_id,
        room_id,
        temperature_celsius: data.temperature_celsius,
      });
    }
  }

  private async handleOnline(event: ControllerOnlineEvent): Promise<void> {
    const { controller_id, room_id } = event;

    this.controllerStatus.set(controller_id, 'online');
    this.controllerHeartbeats.set(controller_id, new Date());

    this.logger.info('Controller online', { controller_id, room_id });
  }

  private async handleOffline(event: ControllerOfflineEvent): Promise<void> {
    const { controller_id, room_id, data } = event;

    this.controllerStatus.set(controller_id, 'offline');

    this.logger.warn('Controller offline', {
      controller_id,
      room_id,
      last_seen: data.last_seen,
      reason: data.reason,
    });

    // In production, this would:
    // - Alert GM console about controller failure
    // - Check if any active sessions are affected
    // - Potentially trigger safety protocols if critical controllers go offline
  }

  private async handleError(event: ControllerErrorEvent): Promise<void> {
    const { controller_id, room_id, data } = event;

    this.controllerStatus.set(controller_id, 'error');

    this.logger.error('Controller error', new Error(data.error_message), {
      controller_id,
      room_id,
      error_code: data.error_code,
      error_details: data.error_details,
    });

    // In production, this would:
    // - Record error for diagnostics
    // - Alert operators if error is critical
    // - Potentially trigger fallback modes
  }

  private async handleRegistered(event: ControllerRegisteredEvent): Promise<void> {
    const { controller_id, room_id, data } = event;

    this.controllerStatus.set(controller_id, 'online');
    this.controllerHeartbeats.set(controller_id, new Date());

    this.logger.info('Controller registered', {
      controller_id,
      room_id,
      controller_type: data.controller_type,
      firmware_version: data.firmware_version,
      ip_address: data.ip_address,
    });
  }

  /**
   * Check for stale controllers that haven't sent heartbeats recently.
   * Should be called periodically (e.g., every 30 seconds).
   */
  checkStaleControllers(timeoutMs: number = 60000): string[] {
    const now = Date.now();
    const staleControllers: string[] = [];

    for (const [controllerId, lastHeartbeat] of this.controllerHeartbeats.entries()) {
      const elapsed = now - lastHeartbeat.getTime();
      if (elapsed > timeoutMs) {
        staleControllers.push(controllerId);

        // Mark as offline if not already
        if (this.controllerStatus.get(controllerId) === 'online') {
          this.controllerStatus.set(controllerId, 'offline');
          this.logger.warn('Controller marked stale due to missing heartbeats', {
            controller_id: controllerId,
            last_heartbeat: lastHeartbeat.toISOString(),
            elapsed_ms: elapsed,
          });
        }
      }
    }

    return staleControllers;
  }

  /**
   * Get the current status of a controller.
   */
  getControllerStatus(controllerId: string): 'online' | 'offline' | 'error' | 'unknown' {
    return this.controllerStatus.get(controllerId) ?? 'unknown';
  }

  /**
   * Get all online controllers.
   */
  getOnlineControllers(): string[] {
    return Array.from(this.controllerStatus.entries())
      .filter(([, status]) => status === 'online')
      .map(([id]) => id);
  }
}
