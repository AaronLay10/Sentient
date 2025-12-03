export enum EventType {
  // Device Events
  DEVICE_STATE_CHANGED = 'device_state_changed',
  DEVICE_ONLINE = 'device_online',
  DEVICE_OFFLINE = 'device_offline',
  DEVICE_ERROR = 'device_error',

  // Controller Events
  CONTROLLER_REGISTERED = 'controller_registered',
  CONTROLLER_ONLINE = 'controller_online',
  CONTROLLER_OFFLINE = 'controller_offline',
  CONTROLLER_HEARTBEAT = 'controller_heartbeat',
  CONTROLLER_ERROR = 'controller_error',

  // Puzzle Events
  PUZZLE_STARTED = 'puzzle_started',
  PUZZLE_PROGRESS = 'puzzle_progress',
  PUZZLE_SOLVED = 'puzzle_solved',
  PUZZLE_FAILED = 'puzzle_failed',
  PUZZLE_RESET = 'puzzle_reset',
  PUZZLE_SKIPPED = 'puzzle_skipped',

  // Scene Events
  SCENE_STARTED = 'scene_started',
  SCENE_ADVANCED = 'scene_advanced',
  SCENE_COMPLETED = 'scene_completed',

  // Game Session Events
  SESSION_CREATED = 'session_created',
  SESSION_STARTED = 'session_started',
  SESSION_PAUSED = 'session_paused',
  SESSION_RESUMED = 'session_resumed',
  SESSION_COMPLETED = 'session_completed',
  SESSION_ABANDONED = 'session_abandoned',

  // GM Events
  HINT_USED = 'hint_used',
  MANUAL_OVERRIDE = 'manual_override',
  GM_COMMAND = 'gm_command',

  // Safety Events
  EMERGENCY_STOP_TRIGGERED = 'emergency_stop_triggered',
  EMERGENCY_STOP_CLEARED = 'emergency_stop_cleared',
  MAGLOCK_RELEASED = 'maglock_released',
  SAFETY_ALERT = 'safety_alert',

  // Audio Events
  AUDIO_CUE_PLAY = 'audio_cue_play',
  AUDIO_CUE_STOP = 'audio_cue_stop',
  AUDIO_HOTKEY_PLAY = 'audio_hotkey_play',
  AUDIO_HOTKEY_ON = 'audio_hotkey_on',
  AUDIO_HOTKEY_OFF = 'audio_hotkey_off',
  AUDIO_STOP_ALL = 'audio_stop_all',
  AUDIO_FADE_ALL = 'audio_fade_all',
  AUDIO_SET_MASTER_VOLUME = 'audio_set_master_volume',
}
