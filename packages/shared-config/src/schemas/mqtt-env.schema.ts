import { z } from 'zod';

export const MqttEnvSchema = z.object({
  MQTT_URL: z.string().url(),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  MQTT_CLIENT_ID: z.string().optional(),
  MQTT_RECONNECT_PERIOD: z.coerce.number().int().positive().default(5000),
  MQTT_KEEPALIVE: z.coerce.number().int().positive().default(60),
});

export type MqttEnv = z.infer<typeof MqttEnvSchema>;
