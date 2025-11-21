import { MqttEnv } from './schemas';

export interface MqttConfig {
  url: string;
  username?: string;
  password?: string;
  clientId?: string;
  reconnectPeriod: number;
  keepalive: number;
}

export function createMqttConfig(env: MqttEnv): MqttConfig {
  return {
    url: env.MQTT_URL,
    username: env.MQTT_USERNAME,
    password: env.MQTT_PASSWORD,
    clientId: env.MQTT_CLIENT_ID,
    reconnectPeriod: env.MQTT_RECONNECT_PERIOD,
    keepalive: env.MQTT_KEEPALIVE,
  };
}
