import * as mqtt from 'mqtt';
import axios from 'axios';
import * as dotenv from 'dotenv';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { EventType } from '@sentient/core-domain';
import { REDIS_CHANNELS } from '@sentient/shared-messaging';

dotenv.config();

const MQTT_URL = process.env.MQTT_URL || 'mqtt://mqtt:1883';
const API_URL = process.env.API_URL || 'http://api-service:3000';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const INTERNAL_TOKEN = process.env.INTERNAL_REG_TOKEN;

// In-memory cache for device actions with TTL and max size
interface CacheEntry {
  actions: any[];
  timestamp: number;
}

class DeviceActionsCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 1000, ttlMinutes = 60) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  get(deviceId: string): any[] | undefined {
    const entry = this.cache.get(deviceId);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(deviceId);
      return undefined;
    }

    return entry.actions;
  }

  set(deviceId: string, actions: any[]): void {
    // Enforce max size - remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(deviceId)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(deviceId, {
      actions,
      timestamp: Date.now(),
    });
  }

  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`🧹 Cache cleanup: removed ${expiredCount} expired entries, ${this.cache.size} remaining`);
    }
  }

  get size(): number {
    return this.cache.size;
  }
}

// Device actions cache: max 1000 devices, 60 minute TTL
const deviceActionsCache = new DeviceActionsCache(1000, 60);

if (!INTERNAL_TOKEN) {
  console.error('❌ INTERNAL_REG_TOKEN not set in environment');
  process.exit(1);
}

console.log('🚀 MQTT Gateway starting...');
console.log(`📡 MQTT Broker: ${MQTT_URL}`);
console.log(`🌐 API Service: ${API_URL}`);
console.log(`📮 Redis: ${REDIS_URL}`);

// Connect to Redis for publishing domain events
const redisPublisher = new Redis(REDIS_URL);

redisPublisher.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redisPublisher.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

// Connect to MQTT broker
const client = mqtt.connect(MQTT_URL, {
  clientId: `mqtt-gateway-${Date.now()}`,
  clean: true,
  reconnectPeriod: 1000,
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');

  // Subscribe to registration topics (Sentient v4 system-level)
  const registrationTopics = [
    'sentient/system/register/controller',
    'sentient/system/register/device',
  ];

  // Subscribe to Sentient v4 operational topics (category-first structure)
  // Pattern: <tenant>/<room_id>/<category>/<controller_id>/<device_id>/<action_or_sensor>
  const sentientTopics = [
    'sentient/+/commands/#',        // All commands across all Sentient rooms
    'sentient/+/sensors/#',         // All sensor data across all Sentient rooms
    'sentient/+/status/#',          // All status messages across all Sentient rooms
    'sentient/+/acknowledgement/#', // Command acknowledgements from controllers
  ];

  // Subscribe to Paragon operational topics (uses same category-first structure)
  const paragonTopics = [
    'paragon/+/commands/#',         // All commands across all Paragon rooms
    'paragon/+/sensors/#',          // All sensor data across all Paragon rooms
    'paragon/+/status/#',           // All status messages across all Paragon rooms
    'paragon/+/acknowledgement/#',  // Command acknowledgements from controllers
  ];

  [...registrationTopics, ...sentientTopics, ...paragonTopics].forEach(topic => {
    client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${topic}:`, err);
      } else {
        console.log(`📬 Subscribed to: ${topic}`);
      }
    });
  });
});

client.on('error', (error) => {
  console.error('❌ MQTT connection error:', error);
});

client.on('reconnect', () => {
  console.log('🔄 Reconnecting to MQTT broker...');
});

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    
    // Debug: Log all acknowledgement messages
    if (topic.includes('/acknowledgement/')) {
      console.log(`🔔 ACK message received on topic: ${topic}`);
    }

    // Handle registration topics
    if (topic === 'sentient/system/register/controller') {
      console.log(`📥 Controller registration:`, JSON.stringify(payload, null, 2));
      await registerController(payload);
    } else if (topic === 'sentient/system/register/device') {
      console.log(`📥 Device registration:`, JSON.stringify(payload, null, 2));
      await registerDevice(payload);
    }
    // Handle category-first operational topics
    // Pattern: <tenant>/<room_id>/<category>/<controller_id>/<device_id>/<action_or_sensor>
    else if (topic.includes('/acknowledgement/')) {
      // Command acknowledgements from controllers - high priority for immediate UI feedback
      await handleAcknowledgement(topic, payload);
    } else if (topic.includes('/sensors/')) {
      await handleCategoryFirstTopic(topic, payload, 'sensors');
    } else if (topic.includes('/status/')) {
      // Check if this is a full status response
      if (topic.endsWith('/full')) {
        await handleFullStatusResponse(topic, payload);
      } else {
        await handleCategoryFirstTopic(topic, payload, 'status');
      }
    } else if (topic.includes('/commands/')) {
      // Commands are handled by controllers, not gateway (except for logging)
      console.log(`📥 Command published on ${topic}:`, payload);
    }
  } catch (error) {
    console.error(`❌ Error processing message from ${topic}:`, error);
  }
});

async function handleCategoryFirstTopic(topic: string, payload: any, category: string): Promise<void> {
  try {
    // Parse category-first topic: <tenant>/<room_id>/<category>/<controller_id>/<device_id?>/<action_or_sensor?>
    const topicParts = topic.split('/');

    if (topicParts.length < 4) {
      return; // Skip malformed topics
    }

    const tenant = topicParts[0];           // 'paragon' or 'sentient'
    const room_id = topicParts[1];          // 'clockwork', etc.
    const messageCategory = topicParts[2];  // 'sensors', 'status', 'commands'
    const controller_id = topicParts[3];    // 'power_control_upper_right', etc.
    const device_id = topicParts[4];        // 'main_lighting_24v', etc. (optional for status)
    const messageType = topicParts[5];      // 'state', 'heartbeat', 'connection', etc. (optional)

    // Debug logging for intro_video_player
    if (controller_id === 'intro_video_player') {
      console.log(`🔍 DEBUG intro_video_player topic: ${topic}`);
      console.log(`   Parts: controller=${controller_id}, device=${device_id}, type=${messageType}`);
      console.log(`   Payload:`, JSON.stringify(payload));
    }

    let eventType: EventType | null = null;
    let eventPayload: any = payload;

    // Determine event type based on category
    if (category === 'status') {
      if (messageType === 'heartbeat' || topic.endsWith('/heartbeat')) {
        eventType = EventType.CONTROLLER_HEARTBEAT;
        console.log(`💓 Heartbeat: ${controller_id}`);
      } else if (messageType === 'connection' || topic.endsWith('/connection')) {
        eventType = payload.state === 'online' ? EventType.CONTROLLER_ONLINE : EventType.CONTROLLER_OFFLINE;
        console.log(`📡 Connection status: ${controller_id} -> ${payload.state}`);
      } else if (messageType === 'state' || topic.endsWith('/state')) {
        // Device state updates on status topics (from Teensy firmware acknowledgements)
        eventType = EventType.DEVICE_STATE_CHANGED;
        console.log(`📊 Device state update: ${controller_id}/${device_id}/${messageType || 'state'}`);

        // Normalize payload structure
        eventPayload = {
          previous_state: null,
          new_state: payload,
          raw_mqtt_payload: payload,
        };
      }
    } else if (category === 'sensors') {
      // Sensor data = device state change
      eventType = EventType.DEVICE_STATE_CHANGED;
      console.log(`📊 Sensor data: ${controller_id}/${device_id}/${messageType || 'state'}`);

      // Normalize payload structure
      eventPayload = {
        previous_state: null,
        new_state: payload,
        raw_mqtt_payload: payload,
      };
    }

    // Only publish events we recognize
    if (eventType) {
      const domainEvent = {
        event_id: uuidv4(),
        type: eventType,
        tenant_id: tenant,
        room_id: room_id,
        controller_id: controller_id,
        device_id: device_id || controller_id, // Use controller_id if no device_id
        payload: eventPayload,
        timestamp: new Date(payload.timestamp || Date.now()),
        metadata: {
          source: 'mqtt-gateway',
          mqtt_topic: topic,
        },
      };

      await redisPublisher.publish(REDIS_CHANNELS.DOMAIN_EVENTS, JSON.stringify(domainEvent));
      console.log(`✅ Published event: ${eventType} for ${controller_id}${device_id ? '/' + device_id : ''}`);
    }
  } catch (error) {
    console.error('❌ Error handling category-first topic:', error);
  }
}

/**
 * Handle command acknowledgements from controllers
 * Topic format: <tenant>/<room_id>/acknowledgement/<controller_id>/<device_id>/<command>
 *
 * This provides immediate UI feedback when a controller confirms command execution,
 * separate from periodic status updates which can be noisy with heartbeats.
 */
async function handleAcknowledgement(topic: string, payload: any): Promise<void> {
  try {
    const topicParts = topic.split('/');

    if (topicParts.length < 6) {
      console.warn(`⚠️ Malformed acknowledgement topic: ${topic}`);
      return;
    }

    const tenant = topicParts[0];           // 'paragon' or 'sentient'
    const room_id = topicParts[1];          // 'clockwork', etc.
    // topicParts[2] = 'acknowledgement'
    const controller_id = topicParts[3];    // 'power_control_upper_right', etc.
    const device_id = topicParts[4];        // 'main_lighting_24v', etc.
    const command = topicParts[5];          // 'power_on' or 'power_off'

    // Fetch device actions from cache or API to get friendly name
    let stateValue = payload.state;
    if (stateValue === undefined) {
      try {
        // Check cache first
        let actions = deviceActionsCache.get(device_id);
        
        // If not in cache, fetch from API
        if (!actions) {
          const response = await axios.get(`${API_URL}/internal/devices/${device_id}/actions`, {
            headers: { 'x-internal-token': INTERNAL_TOKEN }
          });
          const fetchedActions = response.data.actions || [];
          actions = fetchedActions;
          deviceActionsCache.set(device_id, fetchedActions);
        }
        
        // Find the action matching this command
        const action = actions?.find((a: any) => a.action_id === command);
        
        if (action && action.friendly_name) {
          stateValue = action.friendly_name;
        } else {
          // Fallback: format command as Title Case
          stateValue = command
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      } catch (error: any) {
        console.warn(`⚠️ Could not fetch action friendly name for ${device_id}/${command}:`, error?.message);
        // Fallback: format command as Title Case
        stateValue = command
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }

    console.log(`⚡ Command ACK: ${controller_id}/${device_id}/${command} -> state="${stateValue}"`);

    // Create normalized state payload
    const normalizedState = {
      ...payload,
      state: stateValue,
      command: command,
    };

    // Create domain event for command acknowledgement
    const domainEvent = {
      event_id: uuidv4(),
      type: EventType.DEVICE_STATE_CHANGED,
      tenant_id: tenant,
      room_id: room_id,
      controller_id: controller_id,
      device_id: device_id,
      payload: {
        previous_state: null,
        new_state: normalizedState,
        command_acknowledged: command,
        raw_mqtt_payload: payload,
      },
      timestamp: new Date(payload.timestamp_ms || payload.ts || Date.now()),
      metadata: {
        source: 'mqtt-gateway',
        mqtt_topic: topic,
        is_acknowledgement: true,
      },
    };

    const serializedEvent = JSON.stringify(domainEvent);
    await redisPublisher.publish(REDIS_CHANNELS.DOMAIN_EVENTS, serializedEvent);
    
    console.log(`✅ Published ACK event: ${device_id} -> ${command} (state="${stateValue}")`);
    console.log(`📦 ACK Event Details:`, {
      event_id: domainEvent.event_id,
      type: domainEvent.type,
      device_id: domainEvent.device_id,
      room_id: domainEvent.room_id,
      is_ack: domainEvent.metadata.is_acknowledgement,
      channel: REDIS_CHANNELS.DOMAIN_EVENTS
    });
  } catch (error) {
    console.error('❌ Error handling acknowledgement:', error);
  }
}

/**
 * Handle full status response from controllers
 * Topic format: <tenant>/<room_id>/status/<controller_id>/full
 *
 * This is triggered when the UI requests current state on page load.
 * The payload contains all device states which we emit as individual device state events.
 */
async function handleFullStatusResponse(topic: string, payload: any): Promise<void> {
  try {
    const topicParts = topic.split('/');

    if (topicParts.length < 5) {
      console.warn(`⚠️ Malformed full status topic: ${topic}`);
      return;
    }

    const tenant = topicParts[0];           // 'paragon' or 'sentient'
    const room_id = topicParts[1];          // 'clockwork', etc.
    // topicParts[2] = 'status'
    const controller_id = topicParts[3];    // 'power_control_upper_right', etc.
    // topicParts[4] = 'full'

    console.log(`📋 Full status received from ${controller_id}:`, Object.keys(payload).length, 'fields');

    // Extract device states from payload (exclude metadata fields)
    const metadataFields = ['uptime', 'ts', 'uid', 'fw', 'timestamp'];
    const deviceStates = Object.entries(payload).filter(
      ([key]) => !metadataFields.includes(key)
    );

    // Emit individual device state events for each device
    for (const [device_id, state] of deviceStates) {
      const domainEvent = {
        event_id: uuidv4(),
        type: EventType.DEVICE_STATE_CHANGED,
        tenant_id: tenant,
        room_id: room_id,
        controller_id: controller_id,
        device_id: device_id,
        payload: {
          previous_state: null,
          new_state: { power: state, state: state ? 1 : 0 },
          raw_mqtt_payload: payload,
        },
        timestamp: new Date(payload.ts || Date.now()),
        metadata: {
          source: 'mqtt-gateway',
          mqtt_topic: topic,
          is_full_status: true,
        },
      };

      await redisPublisher.publish(REDIS_CHANNELS.DOMAIN_EVENTS, JSON.stringify(domainEvent));
    }

    console.log(`✅ Published ${deviceStates.length} device state events from full status`);
  } catch (error) {
    console.error('❌ Error handling full status response:', error);
  }
}

async function registerController(data: any) {
  try {
    const response = await axios.post(
      `${API_URL}/internal/controllers/register`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': INTERNAL_TOKEN
        },
        timeout: 5000
      }
    );

    console.log(`✅ Controller registered: ${data.controller_id}`, response.data);
  } catch (error: any) {
    if (error.response) {
      console.error(`❌ API error registering controller ${data.controller_id}:`,
        error.response.status, error.response.data);
    } else {
      console.error(`❌ Network error registering controller ${data.controller_id}:`, error.message);
    }
  }
}

async function registerDevice(data: any) {
  try {
    await axios.post(
      `${API_URL}/internal/devices/register`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': INTERNAL_TOKEN
        },
        timeout: 5000
      }
    );

    console.log(`✅ Device registered: ${data.device_id} (controller: ${data.controller_id})`);
  } catch (error: any) {
    if (error.response) {
      console.error(`❌ API error registering device ${data.device_id}:`,
        error.response.status, error.response.data);
    } else {
      console.error(`❌ Network error registering device ${data.device_id}:`, error.message);
    }
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log('\n👋 Shutting down MQTT Gateway...');

  client.end(false, {}, async () => {
    console.log('✅ MQTT connection closed');
    await redisPublisher.quit();
    console.log('✅ Redis connection closed');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Subscribe to device command events from Redis
const redisSubscriber = new Redis(REDIS_URL);
redisSubscriber.subscribe('sentient:commands:device', 'sentient:commands:device_generic', 'sentient:commands:status_request', (err) => {
  if (err) {
    console.error('❌ Failed to subscribe to command channels:', err);
  } else {
    console.log('📬 Subscribed to Redis device commands, generic commands, and status request channels');
  }
});

redisSubscriber.on('message', async (channel, message) => {
  if (channel === 'sentient:commands:device') {
    try {
      const commandEvent = JSON.parse(message);
      console.log(`📤 Received device command:`, commandEvent);

      const { controller_id, room_id, command } = commandEvent;

      // Determine the action based on state (power_on or power_off)
      const action = command.state ? 'power_on' : 'power_off';

      // Publish to legacy Paragon MQTT topic matching Teensy firmware expectations
      // Format: paragon/{room_id}/commands/{controller_id}/{device_id}/{action}
      const topic = `paragon/${room_id}/commands/${controller_id}/${command.device_id}/${action}`;
      const payload = {
        device_id: command.device_id,
      };

      client.publish(topic, JSON.stringify(payload), { qos: 1, retain: false }, (err) => {
        if (err) {
          console.error(`❌ Failed to publish command to ${topic}:`, err);
        } else {
          console.log(`✅ Published command to ${topic}:`, payload);
        }
      });
    } catch (error) {
      console.error('❌ Error processing device command:', error);
    }
  } else if (channel === 'sentient:commands:device_generic') {
    // Handle generic device commands (lighting, brightness, color, etc.)
    try {
      const commandEvent = JSON.parse(message);
      console.log(`📤 Received generic device command:`, commandEvent);

      const { controller_id, device_id, room_id, command, payload: cmdPayload } = commandEvent;

      // Publish to Paragon MQTT topic with device-specific command routing
      // Format: paragon/{room_id}/commands/{controller_id}/{device_id}/{command}
      const topic = `paragon/${room_id}/commands/${controller_id}/${device_id}/${command}`;

      client.publish(topic, JSON.stringify(cmdPayload || {}), { qos: 1, retain: false }, (err) => {
        if (err) {
          console.error(`❌ Failed to publish generic command to ${topic}:`, err);
        } else {
          console.log(`✅ Published generic command to ${topic}:`, cmdPayload);
        }
      });
    } catch (error) {
      console.error('❌ Error processing generic device command:', error);
    }
  } else if (channel === 'sentient:commands:status_request') {
    try {
      const requestEvent = JSON.parse(message);
      console.log(`📤 Received status request:`, requestEvent);

      const { controller_id, room_id } = requestEvent;

      // Publish request_status command to the controller
      // Format: paragon/{room_id}/commands/{controller_id}/controller/request_status
      const topic = `paragon/${room_id}/commands/${controller_id}/controller/request_status`;
      const payload = {
        command: 'request_status',
        ts: Date.now(),
      };

      client.publish(topic, JSON.stringify(payload), { qos: 1, retain: false }, (err) => {
        if (err) {
          console.error(`❌ Failed to publish status request to ${topic}:`, err);
        } else {
          console.log(`✅ Published status request to ${topic}`);
        }
      });
    } catch (error) {
      console.error('❌ Error processing status request:', error);
    }
  }
});

console.log('✅ MQTT Gateway ready and listening for messages');
