export interface RoomDisplayMessage {
  type: 'display_message';
  room_id: string;
  message: string;
  duration_ms?: number;
}

export interface RoomTimerUpdate {
  type: 'timer_update';
  room_id: string;
  remaining_seconds: number;
}

export interface RoomHintDisplay {
  type: 'hint_display';
  room_id: string;
  hint_text: string;
}

export interface RoomSceneChange {
  type: 'scene_change';
  room_id: string;
  scene_id: string;
  scene_name: string;
}

export interface RoomVideoPlay {
  type: 'video_play';
  room_id: string;
  video_url: string;
  autoplay?: boolean;
}

export interface RoomAudioPlay {
  type: 'audio_play';
  room_id: string;
  audio_url: string;
  volume?: number;
}
