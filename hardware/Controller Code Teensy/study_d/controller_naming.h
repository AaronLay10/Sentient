#ifndef CONTROLLER_NAMING_H
#define CONTROLLER_NAMING_H

// Study D Puzzle Controller v2 — Canonical naming
#include "FirmwareMetadata.h"

namespace naming
{
    constexpr const char *CLIENT_ID = "paragon";
    constexpr const char *ROOM_ID = "clockwork";
    constexpr const char *CONTROLLER_ID = firmware::UNIQUE_ID; // "study_d"
    constexpr const char *CONTROLLER_FRIENDLY_NAME = "Study D Puzzle Controller";

    // Device IDs
    constexpr const char *MOTOR_LEFT = "motor_left";
    constexpr const char *MOTOR_RIGHT = "motor_right";
    constexpr const char *PROXIMITY_SENSORS = "proximity_sensors";
    constexpr const char *FOG_DMX = "fog_dmx";

    // Sensor types
    constexpr const char *SENSOR_LEFT_TOP_1 = "left_top_1";
    constexpr const char *SENSOR_LEFT_TOP_2 = "left_top_2";
    constexpr const char *SENSOR_LEFT_BOTTOM_1 = "left_bottom_1";
    constexpr const char *SENSOR_LEFT_BOTTOM_2 = "left_bottom_2";
    constexpr const char *SENSOR_RIGHT_TOP_1 = "right_top_1";
    constexpr const char *SENSOR_RIGHT_TOP_2 = "right_top_2";
    constexpr const char *SENSOR_RIGHT_BOTTOM_1 = "right_bottom_1";
    constexpr const char *SENSOR_RIGHT_BOTTOM_2 = "right_bottom_2";

    // Commands
    constexpr const char *CMD_UP = "up";
    constexpr const char *CMD_DOWN = "down";
    constexpr const char *CMD_STOP = "stop";
    constexpr const char *CMD_SET_VOLUME = "set_volume";
    constexpr const char *CMD_SET_TIMER = "set_timer";
    constexpr const char *CMD_SET_FAN_SPEED = "set_fan_speed";

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

    // Proximity sensors (digital switch input)
    constexpr const char *ACTION_TYPE_DIGITAL_SWITCH = "digital_switch";
    // Stepper motors (position control)
    constexpr const char *ACTION_TYPE_MOTOR = "motor_control";
    // DMX fog machine (analog PWM output)
    constexpr const char *ACTION_TYPE_PWM = "analog_pwm";

}

#endif // CONTROLLER_NAMING_H
