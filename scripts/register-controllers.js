#!/usr/bin/env node

/**
 * Register physical Teensy 4.1 controllers with the Sentient Engine
 *
 * This script publishes controller registration messages to the MQTT broker,
 * which the MQTT Gateway will forward to the API Service for database registration.
 */

const mqtt = require('mqtt');

const MQTT_BROKER = 'mqtt://localhost:1883';
const REGISTRATION_TOPIC = 'sentient/system/register/controller';

// Use Room A for Paragon Escape Games
const CLIENT_ID = 'cmiakfa770000h0z6xhz6qy4b'; // Paragon Escape Games
const ROOM_ID = 'cmiajmlz60004knud7lo2jyhv';   // Room A

const controllers = [
  {
    controller_id: 'power_control_upper_right',
    room_id: ROOM_ID,
    controller_type: 'power_controller',
    friendly_name: 'Upper Right Power Controller',
    description: 'Teensy 4.1 power distribution controller - upper right position',
    hardware_type: 'Teensy',
    hardware_version: '4.1',
    firmware_version: '1.0.0',
    heartbeat_interval_ms: 30000,
    mcu_model: 'Teensy 4.1',
    clock_speed_mhz: 600,
    digital_pins_total: 55,
    analog_pins_total: 18,
  },
  {
    controller_id: 'power_control_lower_right',
    room_id: ROOM_ID,
    controller_type: 'power_controller',
    friendly_name: 'Lower Right Power Controller',
    description: 'Teensy 4.1 power distribution controller - lower right position',
    hardware_type: 'Teensy',
    hardware_version: '4.1',
    firmware_version: '1.0.0',
    heartbeat_interval_ms: 30000,
    mcu_model: 'Teensy 4.1',
    clock_speed_mhz: 600,
    digital_pins_total: 55,
    analog_pins_total: 18,
  },
  {
    controller_id: 'power_control_lower_left',
    room_id: ROOM_ID,
    controller_type: 'power_controller',
    friendly_name: 'Lower Left Power Controller',
    description: 'Teensy 4.1 power distribution controller - lower left position',
    hardware_type: 'Teensy',
    hardware_version: '4.1',
    firmware_version: '1.0.0',
    heartbeat_interval_ms: 30000,
    mcu_model: 'Teensy 4.1',
    clock_speed_mhz: 600,
    digital_pins_total: 55,
    analog_pins_total: 18,
  },
];

async function registerControllers() {
  console.log('🔌 Connecting to MQTT broker:', MQTT_BROKER);

  const client = mqtt.connect(MQTT_BROKER);

  client.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
    console.log(`📝 Registering ${controllers.length} controllers...\n`);

    controllers.forEach((controller, index) => {
      setTimeout(() => {
        console.log(`📤 Publishing registration for: ${controller.controller_id}`);
        console.log(`   Room: ${controller.room_id}`);
        console.log(`   Type: ${controller.controller_type}`);
        console.log(`   Name: ${controller.friendly_name}\n`);

        client.publish(
          REGISTRATION_TOPIC,
          JSON.stringify(controller),
          { qos: 1 },
          (err) => {
            if (err) {
              console.error(`❌ Error publishing ${controller.controller_id}:`, err);
            } else {
              console.log(`✅ Published registration for ${controller.controller_id}`);
            }

            // Close connection after last controller
            if (index === controllers.length - 1) {
              setTimeout(() => {
                console.log('\n🎉 All controllers registered. Closing connection...');
                client.end();
              }, 1000);
            }
          }
        );
      }, index * 500); // Stagger registrations by 500ms
    });
  });

  client.on('error', (err) => {
    console.error('❌ MQTT connection error:', err);
    process.exit(1);
  });
}

registerControllers();
