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

  // Subscribe to registration topics (new Sentient v4 format)
  const sentientTopics = [
    'sentient/system/register/controller',
    'sentient/system/register/device',
    // Subscribe to all device state changes
    'sentient/room/+/controller/+/device/+/state',
    // Subscribe to all controller heartbeats
    'sentient/room/+/controller/+/heartbeat',
    // Subscribe to all controller status updates
    'sentient/room/+/controller/+/status',
  ];

  // Subscribe to legacy Paragon/Clockwork operational topics
  const legacyTopics = [
    'paragon/clockwork/status/#',    // All status messages (connection, heartbeat)
    'paragon/clockwork/sensors/#',   // All sensor data
    'paragon/clockwork/commands/#',  // All commands
  ];

  [...sentientTopics, ...legacyTopics].forEach(topic => {
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

    // Handle Sentient v4 registration topics
    if (topic === 'sentient/system/register/controller') {
      console.log(`📥 Controller registration:`, JSON.stringify(payload, null, 2));
      await registerController(payload);
    } else if (topic === 'sentient/system/register/device') {
      console.log(`📥 Device registration:`, JSON.stringify(payload, null, 2));
      await registerDevice(payload);
    }
    // Handle Sentient v4 operational topics
    else if (topic.startsWith('sentient/room/') && topic.includes('/device/') && topic.endsWith('/state')) {
      console.log(`📥 Device state change on ${topic}`);
      await handleDeviceStateChange(topic, payload);
    } else if (topic.startsWith('sentient/room/') && topic.endsWith('/heartbeat')) {
      console.log(`💓 Controller heartbeat on ${topic}`);
      await handleControllerHeartbeat(topic, payload);
    } else if (topic.startsWith('sentient/room/') && topic.endsWith('/status')) {
      console.log(`📊 Controller status on ${topic}`);
      await handleControllerStatus(topic, payload);
    }
    // Handle legacy Paragon/Clockwork topics
    else if (topic.startsWith('paragon/clockwork/')) {
      await handleLegacyTopic(topic, payload);
    }
  } catch (error) {
    console.error(`❌ Error processing message from ${topic}:`, error);
  }
});

async function handleLegacyTopic(topic: string, payload: any): Promise<void> {
  try {
    // Parse legacy topic: paragon/clockwork/{type}/{puzzle_id}/{device_id}/{message_type}
    const topicParts = topic.split('/');

    if (topicParts.length < 5) {
      return; // Skip malformed topics
    }

    const tenant = topicParts[0];      // 'paragon'
    const room_id = topicParts[1];     // 'clockwork'
    const messageCategory = topicParts[2]; // 'status' or 'sensors'
    const puzzle_id = topicParts[3];   // e.g., 'riddle', 'clock', 'gear'
    const device_id = topicParts[4];   // e.g., 'riddle', 'clock', device name
    const messageType = topicParts[5]; // e.g., 'connection', 'heartbeat', 'button_1'

    // Map puzzle_id to controller_id (they're often the same in legacy format)
    const controller_id = puzzle_id;

    let eventType: EventType | null = null;
    let eventPayload: any = payload;

    // Determine event type based on topic structure
    if (messageCategory === 'status') {
      if (messageType === 'heartbeat') {
        eventType = EventType.CONTROLLER_HEARTBEAT;
        console.log(`💓 Legacy heartbeat: ${controller_id}`);
      } else if (messageType === 'connection') {
        // Connection status indicates online/offline
        eventType = payload.state === 'online' ? EventType.CONTROLLER_ONLINE : EventType.CONTROLLER_OFFLINE;
        console.log(`📡 Legacy connection status: ${controller_id} -> ${payload.state}`);
      }
    } else if (messageCategory === 'sensors') {
      // Sensor data = device state change
      eventType = EventType.DEVICE_STATE_CHANGED;
      console.log(`📊 Legacy sensor data: ${device_id}/${messageType}`);

      // Reformat payload to match new structure
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
        device_id: device_id,
        puzzle_id: puzzle_id,
        payload: eventPayload,
        timestamp: new Date(payload.timestamp || Date.now()),
        metadata: {
          source: 'mqtt-gateway',
          mqtt_topic: topic,
          legacy_format: true,
        },
      };

      await redisPublisher.publish(REDIS_CHANNELS.DOMAIN_EVENTS, JSON.stringify(domainEvent));
      console.log(`✅ Published legacy event: ${eventType} for ${controller_id}/${device_id}`);
    }
  } catch (error) {
    console.error('❌ Error handling legacy topic:', error);
  }
}

async function handleDeviceStateChange(topic: string, payload: any): Promise<void> {
  try {
    // Parse topic to extract room_id, controller_id, device_id
    const topicParts = topic.split('/');
    const room_id = topicParts[2];
    const controller_id = topicParts[4];
    const device_id = topicParts[6];

    // Create domain event
    const domainEvent = {
      event_id: uuidv4(),
      type: EventType.DEVICE_STATE_CHANGED,
      room_id,
      controller_id,
      device_id,
      payload: {
        previous_state: null, // We don't track previous state in this simple implementation
        new_state: payload.state,
        raw_mqtt_payload: payload,
      },
      timestamp: new Date(payload.timestamp || Date.now()),
      metadata: {
        source: 'mqtt-gateway',
        mqtt_topic: topic,
      },
    };

    // Publish to Redis domain events channel
    await redisPublisher.publish(REDIS_CHANNELS.DOMAIN_EVENTS, JSON.stringify(domainEvent));

    console.log(`✅ Published DEVICE_STATE_CHANGED event: ${device_id} in room ${room_id}`);
  } catch (error) {
    console.error('❌ Error handling device state change:', error);
  }
}

async function handleControllerHeartbeat(topic: string, payload: any): Promise<void> {
  try {
    const topicParts = topic.split('/');
    const room_id = topicParts[2];
    const controller_id = topicParts[4];

    const domainEvent = {
      event_id: uuidv4(),
      type: EventType.CONTROLLER_HEARTBEAT,
      room_id,
      controller_id,
      payload: payload,
      timestamp: new Date(payload.timestamp || Date.now()),
      metadata: {
        source: 'mqtt-gateway',
        mqtt_topic: topic,
      },
    };

    await redisPublisher.publish(REDIS_CHANNELS.DOMAIN_EVENTS, JSON.stringify(domainEvent));

    console.log(`💓 Published CONTROLLER_HEARTBEAT event: ${controller_id} in room ${room_id}`);
  } catch (error) {
    console.error('❌ Error handling controller heartbeat:', error);
  }
}

async function handleControllerStatus(topic: string, payload: any): Promise<void> {
  try {
    const topicParts = topic.split('/');
    const room_id = topicParts[2];
    const controller_id = topicParts[4];

    // Determine if controller is online or offline based on status
    const eventType = payload.online ? EventType.CONTROLLER_ONLINE : EventType.CONTROLLER_OFFLINE;

    const domainEvent = {
      event_id: uuidv4(),
      type: eventType,
      room_id,
      controller_id,
      payload: payload,
      timestamp: new Date(payload.timestamp || Date.now()),
      metadata: {
        source: 'mqtt-gateway',
        mqtt_topic: topic,
      },
    };

    await redisPublisher.publish(REDIS_CHANNELS.DOMAIN_EVENTS, JSON.stringify(domainEvent));

    console.log(`📊 Published ${eventType} event: ${controller_id} in room ${room_id}`);
  } catch (error) {
    console.error('❌ Error handling controller status:', error);
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

console.log('✅ MQTT Gateway ready and listening for messages');
