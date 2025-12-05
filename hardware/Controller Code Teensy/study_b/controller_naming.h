#ifndef CONTROLLER_NAMING_H
#define CONTROLLER_NAMING_H

// Study B Puzzle Controller v2 — Canonical naming
#include "FirmwareMetadata.h"

namespace naming
{
    constexpr const char *CLIENT_ID = "paragon";
    constexpr const char *ROOM_ID = "clockwork";
    constexpr const char *CONTROLLER_ID = firmware::UNIQUE_ID; // "study_b"
    constexpr const char *CONTROLLER_FRIENDLY_NAME = "Study B Puzzle Controller";

    // Device IDs
    constexpr const char *STUDY_FAN = "study_fan";
    constexpr const char *WALL_GEAR_1 = "wall_gear_1";
    constexpr const char *WALL_GEAR_2 = "wall_gear_2";
    constexpr const char *WALL_GEAR_3 = "wall_gear_3";
    constexpr const char *TV_1 = "tv_1";
    constexpr const char *TV_2 = "tv_2";
    constexpr const char *MAKSERVO = "makservo";
    constexpr const char *FOG_MACHINE = "fog_machine";
    constexpr const char *STUDY_FAN_LIGHT = "study_fan_light";
    constexpr const char *BLACKLIGHTS = "blacklights";
    constexpr const char *NIXIE_LEDS = "nixie_leds";

    // Commands
    constexpr const char *CMD_START = "start";
    constexpr const char *CMD_STOP = "stop";
    constexpr const char *CMD_SLOW = "slow";
    constexpr const char *CMD_FAST = "fast";
    constexpr const char *CMD_ON = "on";
    constexpr const char *CMD_OFF = "off";
    constexpr const char *CMD_FOG_TRIGGER = "trigger";

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

    // Motors (wall gears, fan - motor control output)
    constexpr const char *ACTION_TYPE_MOTOR = "motor_control";
    // Fog machine (trigger output)
    constexpr const char *ACTION_TYPE_TRIGGER = "trigger";
    // Lights, TVs (digital relay output)
    constexpr const char *ACTION_TYPE_RELAY = "digital_relay";
    // Servo (position servo output)
    constexpr const char *ACTION_TYPE_SERVO = "position_servo";
    // LEDs (RGB LED output)
    constexpr const char *ACTION_TYPE_RGB = "rgb_led";

}

#endif // CONTROLLER_NAMING_H
