#ifndef CONTROLLER_NAMING_H
#define CONTROLLER_NAMING_H

// Vault Puzzle Controller v2 — Canonical naming
#include "FirmwareMetadata.h"

namespace naming
{
    constexpr const char *CLIENT_ID = "paragon";
    constexpr const char *ROOM_ID = "clockwork";
    constexpr const char *CONTROLLER_ID = firmware::UNIQUE_ID; // "vault"
    constexpr const char *CONTROLLER_FRIENDLY_NAME = "Vault Puzzle Controller";

    // RFID Reader (sensor only)
    constexpr const char *DEV_RFID_READER = "rfid_reader";
    constexpr const char *FRIENDLY_RFID_READER = "RFID Reader";

    // Sensors
    constexpr const char *SENSOR_VAULT_NUMBER = "vault_number";
    constexpr const char *SENSOR_TAG_ID = "tag_id";

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

    // RFID reader (code reader input)
    constexpr const char *ACTION_TYPE_CODE_READER = "code_reader";

}

#endif // CONTROLLER_NAMING_H
