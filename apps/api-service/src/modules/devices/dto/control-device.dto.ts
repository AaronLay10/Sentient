import { IsBoolean, IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class ControlDeviceDto {
  @IsString()
  device_id: string;

  @IsBoolean()
  state: boolean;
}

// Generic command DTO for lighting and other advanced controls
export class SendCommandDto {
  @IsString()
  device_id: string;

  @IsString()
  command: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}

// Lighting-specific command DTO
export class LightingCommandDto {
  @IsString()
  device_id: string;

  @IsString()
  command: 'on' | 'off' | 'set_brightness' | 'set_color';

  @IsOptional()
  @IsNumber()
  brightness?: number; // 0-255

  @IsOptional()
  @IsString()
  color?: string; // 'yellow', 'red', 'green', 'blue', 'white', 'purple', 'orange'
}
