import { loadEnv, OrchestratorEnvSchema, OrchestratorEnv } from '@sentient/shared-config';

export function loadOrchestratorConfig(): OrchestratorEnv {
  return loadEnv(OrchestratorEnvSchema);
}
