#ifndef CONTROLLER_NAMING_H
#define CONTROLLER_NAMING_H

// Vern Controller v2 — Canonical naming
#include "FirmwareMetadata.h"

namespace naming
{
    constexpr const char *CLIENT_ID = "paragon";
    constexpr const char *ROOM_ID = "clockwork";
    constexpr const char *CONTROLLER_ID = firmware::UNIQUE_ID; // "vern"
    constexpr const char *CONTROLLER_FRIENDLY_NAME = "Vern Controller";

    // Output devices
    constexpr const char *OUTPUT_ONE = "output_one";
    constexpr const char *OUTPUT_TWO = "output_two";
    constexpr const char *OUTPUT_THREE = "output_three";
    constexpr const char *OUTPUT_FOUR = "output_four";
    constexpr const char *OUTPUT_FIVE = "output_five";
    constexpr const char *OUTPUT_SIX = "output_six";
    constexpr const char *OUTPUT_SEVEN = "output_seven";
    constexpr const char *OUTPUT_EIGHT = "output_eight";
    constexpr const char *POWER_SWITCH = "power_switch";

    // Commands
    constexpr const char *CMD_OUTPUT_ON = "on";
    constexpr const char *CMD_OUTPUT_OFF = "off";

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

    // Output devices (digital relay output)
    constexpr const char *ACTION_TYPE_RELAY = "digital_relay";

}

#endif // CONTROLLER_NAMING_H
