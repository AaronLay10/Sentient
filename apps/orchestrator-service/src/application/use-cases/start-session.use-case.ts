import { OrchestratorService } from '../services/orchestrator.service';
import { Logger } from '@sentient/shared-logging';

export interface StartSessionCommand {
  session_id: string;
}

export class StartSessionUseCase {
  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly logger: Logger
  ) {}

  async execute(command: StartSessionCommand): Promise<void> {
    this.logger.info('Starting session', { session_id: command.session_id });

    try {
      await this.orchestrator.startSession(command.session_id);
      this.logger.info('Session started successfully', { session_id: command.session_id });
    } catch (error) {
      this.logger.error('Failed to start session', error as Error, {
        session_id: command.session_id,
      });
      throw error;
    }
  }
}
