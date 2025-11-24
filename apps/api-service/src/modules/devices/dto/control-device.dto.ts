import { IsBoolean, IsString } from 'class-validator';

export class ControlDeviceDto {
  @IsString()
  device_id: string;

  @IsBoolean()
  state: boolean;
}
