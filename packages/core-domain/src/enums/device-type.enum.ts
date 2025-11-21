export enum DeviceType {
  // Inputs - Sensors
  BUTTON = 'button',
  SWITCH = 'switch',
  PROXIMITY_SENSOR = 'proximity_sensor',
  HALL_EFFECT_SENSOR = 'hall_effect_sensor',
  PRESSURE_MAT = 'pressure_mat',
  RFID_READER = 'rfid_reader',
  KEYPAD = 'keypad',
  ROTARY_ENCODER = 'rotary_encoder',
  LIMIT_SWITCH = 'limit_switch',

  // Outputs - Actuators
  RELAY = 'relay',
  MAGLOCK = 'maglock',
  SOLENOID = 'solenoid',
  SERVO = 'servo',
  STEPPER_MOTOR = 'stepper_motor',
  DC_MOTOR = 'dc_motor',

  // Outputs - Lighting
  LED = 'led',
  LED_STRIP = 'led_strip',
  DMX_CHANNEL = 'dmx_channel',
  LIGHT_FIXTURE = 'light_fixture',

  // Outputs - Audio/Visual
  AUDIO_TRIGGER = 'audio_trigger',
  SPEAKER = 'speaker',
  DISPLAY = 'display',
  PROJECTOR = 'projector',

  // Generic
  GENERIC_INPUT = 'generic_input',
  GENERIC_OUTPUT = 'generic_output',
  UNKNOWN = 'unknown',
}
