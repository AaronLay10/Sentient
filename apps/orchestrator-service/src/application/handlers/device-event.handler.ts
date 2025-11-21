import { DeviceStateChangedEvent, EventType } from '@sentient/core-domain';
import { OrchestratorService } from '../services/orchestrator.service';
import { Logger } from '@sentient/shared-logging';

export class DeviceEventHandler {
  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly logger: Logger
  ) {}

  async handle(event: DeviceStateChangedEvent): Promise<void> {
    try {
      this.logger.debug('Handling device state change', {
        device_id: event.device_id,
        controller_id: event.controller_id,
        room_id: event.room_id,
      });

      await this.orchestrator.handleDeviceStateChange(event);
    } catch (error) {
      this.logger.error('Failed to handle device event', error as Error, {
        event_id: event.event_id,
        device_id: event.device_id,
      });
    }
  }
}
