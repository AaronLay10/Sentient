#ifndef CONTROLLER_NAMING_H
#define CONTROLLER_NAMING_H

// Lab Room Cage B Controller v2 — Canonical naming
#include "FirmwareMetadata.h"

namespace naming
{
    constexpr const char *CLIENT_ID = "paragon";
    constexpr const char *ROOM_ID = "clockwork";
    constexpr const char *CONTROLLER_ID = firmware::UNIQUE_ID; // "lab_rm_cage_b"
    constexpr const char *CONTROLLER_FRIENDLY_NAME = "Lab Room Cage B Controller";

    // Door devices
    constexpr const char *DOOR_THREE = "door_three";
    constexpr const char *DOOR_FOUR = "door_four";
    constexpr const char *DOOR_FIVE = "door_five";

    // Sensor types
    constexpr const char *SENSOR_OPEN_A = "open_sensor_a";
    constexpr const char *SENSOR_OPEN_B = "open_sensor_b";
    constexpr const char *SENSOR_CLOSED_A = "closed_sensor_a";
    constexpr const char *SENSOR_CLOSED_B = "closed_sensor_b";

    // Commands
    constexpr const char *CMD_DOOR_OPEN = "open";
    constexpr const char *CMD_DOOR_CLOSE = "close";
    constexpr const char *CMD_DOOR_STOP = "stop";

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
    // Doors (stepper motors - position control output)
    constexpr const char *ACTION_TYPE_MOTOR = "motor_control";

}

#endif // CONTROLLER_NAMING_H
