#ifndef CONTROLLER_NAMING_H
#define CONTROLLER_NAMING_H

// Lever Fan Safe Controller v2 — Canonical naming
#include "FirmwareMetadata.h"

namespace naming
{
    constexpr const char *CLIENT_ID = "paragon";
    constexpr const char *ROOM_ID = "clockwork";
    constexpr const char *CONTROLLER_ID = firmware::UNIQUE_ID; // "lever_fan_safe"
    constexpr const char *CONTROLLER_FRIENDLY_NAME = "Lever Fan Safe Controller";

    // Photocell sensors (input only)
    constexpr const char *PHOTOCELL_SAFE = "photocell_safe";
    constexpr const char *PHOTOCELL_FAN = "photocell_fan";

    // IR receivers (input only)
    constexpr const char *IR_SAFE = "ir_receiver_safe";
    constexpr const char *IR_FAN = "ir_receiver_fan";

    // Maglock (output device)
    constexpr const char *MAGLOCK_FAN = "maglock_fan";

    // Solenoid (output device)
    constexpr const char *SOLENOID_SAFE = "solenoid_safe";

    // Fan motor (output device)
    constexpr const char *FAN_MOTOR = "fan_motor";

    // Sensor types
    constexpr const char *SENSOR_LEVER_POSITION = "lever_position";
    constexpr const char *SENSOR_IR_CODE = "ir_code";

    // Commands
    constexpr const char *CMD_LOCK = "lock";
    constexpr const char *CMD_UNLOCK = "unlock";
    constexpr const char *CMD_OPEN = "open";
    constexpr const char *CMD_CLOSE = "close";
    constexpr const char *CMD_FAN_ON = "on";
    constexpr const char *CMD_FAN_OFF = "off";
    constexpr const char *CMD_IR_ENABLE = "enable";
    constexpr const char *CMD_IR_DISABLE = "disable";

    // Categories (fixed, lowercase)
    constexpr const char *CAT_COMMANDS = "commands";
    constexpr const char *CAT_SENSORS = "sensors";
    constexpr const char *CAT_STATUS = "status";
    constexpr const char *CAT_EVENTS = "events";
    constexpr const char *CAT_ACKNOWLEDGEMENT = "acknowledgement";
    constexpr const char *ITEM_HEARTBEAT = "heartbeat";
    constexpr const char *ITEM_HARDWARE = "hardware";
    constexpr const char *ITEM_COMMAND_ACK = "command_ack";

    // ========================================================================
    // ACTION TYPES (defines how devices interact - for UI categorization)
    // ========================================================================
    // Action type values:
    //   INPUT:  digital_switch, analog_sensor, counter, code_reader
    //   OUTPUT: digital_relay, analog_pwm, rgb_led, position_servo, position_stepper, motor_control, trigger

    // Photocell sensors (analog input)
    constexpr const char *ACTION_TYPE_ANALOG_SENSOR = "analog_sensor";
    // IR receivers (code input)
    constexpr const char *ACTION_TYPE_CODE_READER = "code_reader";
    // Maglock and solenoid (digital relay output)
    constexpr const char *ACTION_TYPE_RELAY = "digital_relay";
    // Fan motor (motor control)
    constexpr const char *ACTION_TYPE_MOTOR = "motor_control";

}

#endif // CONTROLLER_NAMING_H
