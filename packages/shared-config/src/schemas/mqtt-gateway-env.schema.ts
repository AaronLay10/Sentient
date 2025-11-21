import { z } from 'zod';
import { BaseEnvSchema } from './base-env.schema';
import { MqttEnvSchema } from './mqtt-env.schema';

export const MqttGatewayEnvSchema = BaseEnvSchema.merge(MqttEnvSchema).extend({
  API_URL: z.string().url(),
  INTERNAL_REG_TOKEN: z.string().min(32),
});

export type MqttGatewayEnv = z.infer<typeof MqttGatewayEnvSchema>;
