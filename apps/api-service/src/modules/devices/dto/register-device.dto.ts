import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

class DeviceTopicDto {
  @IsString()
  topic!: string;

  @IsOptional()
  @IsString()
  topic_type?: string;
}

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  device_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  controller_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  room_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  device_type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  device_category?: string;

  @IsOptional()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @Type(() => DeviceTopicDto)
  mqtt_topics?: DeviceTopicDto[];
}
