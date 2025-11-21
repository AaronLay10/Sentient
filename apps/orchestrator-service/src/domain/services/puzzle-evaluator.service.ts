import { Device, Puzzle } from '@sentient/core-domain';

export interface PuzzleEvaluationResult {
  solved: boolean;
  progress?: Record<string, any>;
  message?: string;
}

export class PuzzleEvaluatorService {
  evaluate(puzzle: Puzzle, deviceStates: Map<string, any>): PuzzleEvaluationResult {
    // Simple example - real logic would be more complex
    // This would evaluate puzzle.solution_config against device states

    if (!puzzle.solution_config) {
      return { solved: false, message: 'No solution config defined' };
    }

    // Example: Check if all required devices are in correct state
    const requiredDevices = puzzle.solution_config.required_devices || [];

    for (const deviceReq of requiredDevices) {
      const deviceState = deviceStates.get(deviceReq.device_id);

      if (!deviceState) {
        return {
          solved: false,
          message: `Device ${deviceReq.device_id} state not found`
        };
      }

      // Check if device state matches required state
      const matches = this.stateMatches(deviceState, deviceReq.required_state);
      if (!matches) {
        return {
          solved: false,
          progress: this.calculateProgress(requiredDevices, deviceStates)
        };
      }
    }

    return { solved: true, message: 'Puzzle solved!' };
  }

  private stateMatches(actualState: any, requiredState: any): boolean {
    // Deep comparison of state objects
    for (const key in requiredState) {
      if (actualState[key] !== requiredState[key]) {
        return false;
      }
    }
    return true;
  }

  private calculateProgress(requiredDevices: any[], deviceStates: Map<string, any>): Record<string, any> {
    const completed = requiredDevices.filter(req => {
      const state = deviceStates.get(req.device_id);
      return state && this.stateMatches(state, req.required_state);
    }).length;

    return {
      completed_devices: completed,
      total_devices: requiredDevices.length,
      completion_percentage: Math.floor((completed / requiredDevices.length) * 100),
    };
  }
}
