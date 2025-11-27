#ifndef CONTROLLER_NAMING_H
#define CONTROLLER_NAMING_H

// Boiler Room Subpanel v2.1 — Canonical naming
// Purpose: single source of truth for identifiers used in MQTT topics and manifests.
// This file does NOT change behavior until included by the sketch; safe to edit iteratively.

#include "FirmwareMetadata.h" // Provides firmware::UNIQUE_ID (must equal controller_id)

namespace naming
{
    // Tenant and room identifiers (snake_case, DB-sourced)
    constexpr const char *CLIENT_ID = "paragon";
    constexpr const char *ROOM_ID = "clockwork";

    // Controller identifier: must match DB controllers.controller_id
    // By convention, this equals firmware::UNIQUE_ID
    constexpr const char *CONTROLLER_ID = firmware::UNIQUE_ID; // "boiler_room_subpanel"

    // Friendly names (UI-only; never used in MQTT topics)
    constexpr const char *CONTROLLER_FRIENDLY_NAME = "Boiler Room Subpanel";

    // ════════════════════════════════════════════════════════════════════════
    // DEVICE: Intro TV
    // ════════════════════════════════════════════════════════════════════════
    constexpr const char *DEV_INTRO_TV = "intro_tv";
    constexpr const char *FRIENDLY_INTRO_TV = "Intro TV";
    constexpr const char *TYPE_INTRO_TV = "TV";
    // Commands
    constexpr const char *CMD_TV_POWER_ON = "power_on";
    constexpr const char *CMD_TV_POWER_OFF = "power_off";
    constexpr const char *CMD_TV_LIFT_UP = "lift_up";
    constexpr const char *CMD_TV_LIFT_DOWN = "lower_down";
    // Command friendly names
    constexpr const char *FRIENDLY_CMD_TV_POWER_ON = "Intro TV Power On";
    constexpr const char *FRIENDLY_CMD_TV_POWER_OFF = "Intro TV Power Off";
    constexpr const char *FRIENDLY_CMD_TV_LIFT_UP = "Intro TV Lift Up";
    constexpr const char *FRIENDLY_CMD_TV_LIFT_DOWN = "Intro TV Lift Down";

    // ════════════════════════════════════════════════════════════════════════
    // DEVICE: Fog Machine (Boiler Room)
    // ════════════════════════════════════════════════════════════════════════
    constexpr const char *DEV_BOILER_FOG_MACHINE = "boiler_room_fog_machine";
    constexpr const char *FRIENDLY_BOILER_FOG_MACHINE = "Fog Machine (Boiler Room)";
    constexpr const char *TYPE_BOILER_FOG_MACHINE = "fog_machine";
    // Commands
    constexpr const char *CMD_FOG_POWER_ON = "fog_power_on";
    constexpr const char *CMD_FOG_POWER_OFF = "fog_power_off";
    constexpr const char *CMD_FOG_TRIGGER = "trigger_fog";
    constexpr const char *CMD_ULTRASONIC_ON = "ultrasonic_on";
    constexpr const char *CMD_ULTRASONIC_OFF = "ultrasonic_off";
    // Command friendly names
    constexpr const char *FRIENDLY_CMD_FOG_POWER_ON = "Power On";
    constexpr const char *FRIENDLY_CMD_FOG_POWER_OFF = "Power Off";
    constexpr const char *FRIENDLY_CMD_FOG_TRIGGER = "Trigger Fog";
    constexpr const char *FRIENDLY_CMD_ULTRASONIC_ON = "Ultrasonic On";
    constexpr const char *FRIENDLY_CMD_ULTRASONIC_OFF = "Ultrasonic Off";

    // ════════════════════════════════════════════════════════════════════════
    // DEVICE: Barrel Maglock
    // ════════════════════════════════════════════════════════════════════════
    constexpr const char *DEV_BOILER_ROOM_BARREL = "boiler_room_barrel";
    constexpr const char *FRIENDLY_BOILER_ROOM_BARREL = "Barrel Maglock";
    constexpr const char *TYPE_BOILER_ROOM_BARREL = "maglock";
    // Commands
    constexpr const char *CMD_BARREL_LOCK = "lock";
    constexpr const char *CMD_BARREL_UNLOCK = "unlock";
    // Command friendly names
    constexpr const char *FRIENDLY_CMD_BARREL_LOCK = "Lock Barrel";
    constexpr const char *FRIENDLY_CMD_BARREL_UNLOCK = "Unlock Barrel";

    // ════════════════════════════════════════════════════════════════════════
    // DEVICE: IR Sensor (Gun Detection)
    // ════════════════════════════════════════════════════════════════════════
    constexpr const char *DEV_IR_SENSOR = "ir_sensor";
    constexpr const char *FRIENDLY_IR_SENSOR = "IR Sensor (Barrel Gun Detection)";
    constexpr const char *TYPE_IR_SENSOR = "sensor";
    // Commands
    constexpr const char *CMD_IR_ACTIVATE = "activate";
    constexpr const char *CMD_IR_DEACTIVATE = "deactivate";
    // Command friendly names
    constexpr const char *FRIENDLY_CMD_IR_ACTIVATE = "Activate IR Sensor";
    constexpr const char *FRIENDLY_CMD_IR_DEACTIVATE = "Deactivate IR Sensor";

    // ════════════════════════════════════════════════════════════════════════
    // DEVICE: Study Door
    // ════════════════════════════════════════════════════════════════════════
    constexpr const char *DEV_STUDY_DOOR = "study_door";
    constexpr const char *FRIENDLY_STUDY_DOOR = "Study Door";
    constexpr const char *TYPE_STUDY_DOOR = "maglock_group";
    // Commands
    constexpr const char *CMD_DOOR_LOCK = "lock";
    constexpr const char *CMD_DOOR_UNLOCK = "unlock";
    // Command friendly names
    constexpr const char *FRIENDLY_CMD_DOOR_LOCK = "Lock Study Room Door";
    constexpr const char *FRIENDLY_CMD_DOOR_UNLOCK = "Unlock Study Room Door";

    // ════════════════════════════════════════════════════════════════════════
    // DEVICE: Gauge Progress Chest
    // ════════════════════════════════════════════════════════════════════════
    constexpr const char *DEV_GAUGE_PROGRESS_CHEST = "gauge_progress_chest";
    constexpr const char *FRIENDLY_GAUGE_PROGRESS_CHEST = "Gauge Progress LED Chest";
    constexpr const char *TYPE_GAUGE_PROGRESS_CHEST = "led_strip";
    // Commands
    constexpr const char *CMD_GAUGE_SOLVED_1 = "solved_1";
    constexpr const char *CMD_GAUGE_SOLVED_2 = "solved_2";
    constexpr const char *CMD_GAUGE_SOLVED_3 = "solved_3";
    constexpr const char *CMD_GAUGE_CLEAR = "clear";
    // Command friendly names
    constexpr const char *FRIENDLY_CMD_GAUGE_SOLVED_1 = "Set Gauge LED 1";
    constexpr const char *FRIENDLY_CMD_GAUGE_SOLVED_2 = "Set Gauge LED 2";
    constexpr const char *FRIENDLY_CMD_GAUGE_SOLVED_3 = "Set Gauge LED 3";
    constexpr const char *FRIENDLY_CMD_GAUGE_CLEAR = "Clear Gauge LEDs";

    // ════════════════════════════════════════════════════════════════════════
    // Controller-Level Commands (not a device)
    // ════════════════════════════════════════════════════════════════════════
    constexpr const char *CMD_CONTROLLER_POWER_OFF_SEQUENCE = "power_off_sequence";
    constexpr const char *FRIENDLY_CMD_CONTROLLER_POWER_OFF_SEQUENCE = "Power-Off Sequence";

    // ════════════════════════════════════════════════════════════════════════
    // MQTT Categories (fixed, lowercase)
    // ════════════════════════════════════════════════════════════════════════
    constexpr const char *CAT_COMMANDS = "commands";
    constexpr const char *CAT_SENSORS = "sensors";
    constexpr const char *CAT_STATUS = "status";
    constexpr const char *CAT_EVENTS = "events";
    constexpr const char *CAT_ACKNOWLEDGEMENT = "acknowledgement";
    constexpr const char *ITEM_HEARTBEAT = "heartbeat";
    constexpr const char *ITEM_HARDWARE = "hardware";
} // namespace naming

#endif // CONTROLLER_NAMING_H
