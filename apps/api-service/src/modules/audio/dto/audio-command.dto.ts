import { IsString, IsOptional, IsIn } from 'class-validator';

export class AudioCommandDto {
  @IsString()
  room_id: string;

  @IsString()
  cue_id: string;

  @IsString()
  @IsIn(['play', 'stop', 'hotkey', 'hotkey_on', 'hotkey_off', 'stop_all', 'fade_all'])
  command: 'play' | 'stop' | 'hotkey' | 'hotkey_on' | 'hotkey_off' | 'stop_all' | 'fade_all';

  @IsOptional()
  @IsString()
  @IsIn(['scene', 'puzzle', 'gm', 'system'])
  triggered_by?: 'scene' | 'puzzle' | 'gm' | 'system';
}
