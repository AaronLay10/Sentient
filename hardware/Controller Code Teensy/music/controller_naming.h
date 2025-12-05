#ifndef CONTROLLER_NAMING_H
#define CONTROLLER_NAMING_H

// Music Controller v2 — Canonical naming
#include "FirmwareMetadata.h"

namespace naming
{
    constexpr const char *CLIENT_ID = "paragon";
    constexpr const char *ROOM_ID = "clockwork";
    constexpr const char *CONTROLLER_ID = firmware::UNIQUE_ID; // "music"
    constexpr const char *CONTROLLER_FRIENDLY_NAME = "Music Controller";

    // Device identifiers (6 music buttons)
    constexpr const char *BUTTON_1 = "button_1";
    constexpr const char *FRIENDLY_BUTTON_1 = "Music Button 1";

    constexpr const char *BUTTON_2 = "button_2";
    constexpr const char *FRIENDLY_BUTTON_2 = "Music Button 2";

    constexpr const char *BUTTON_3 = "button_3";
    constexpr const char *FRIENDLY_BUTTON_3 = "Music Button 3";

    constexpr const char *BUTTON_4 = "button_4";
    constexpr const char *FRIENDLY_BUTTON_4 = "Music Button 4";

    constexpr const char *BUTTON_5 = "button_5";
    constexpr const char *FRIENDLY_BUTTON_5 = "Music Button 5";

    constexpr const char *BUTTON_6 = "button_6";
    constexpr const char *FRIENDLY_BUTTON_6 = "Music Button 6";

    // Sensor identifiers (button press states)
    constexpr const char *SENSOR_BUTTON_1_PRESSED = "button_1_pressed";
    constexpr const char *SENSOR_BUTTON_2_PRESSED = "button_2_pressed";
    constexpr const char *SENSOR_BUTTON_3_PRESSED = "button_3_pressed";
    constexpr const char *SENSOR_BUTTON_4_PRESSED = "button_4_pressed";
    constexpr const char *SENSOR_BUTTON_5_PRESSED = "button_5_pressed";
    constexpr const char *SENSOR_BUTTON_6_PRESSED = "button_6_pressed";

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

    // Button inputs (digital switch input)
    constexpr const char *ACTION_TYPE_DIGITAL_SWITCH = "digital_switch";
    // Relay output (digital on/off)
    constexpr const char *ACTION_TYPE_RELAY = "digital_relay";

}

#endif // CONTROLLER_NAMING_H
