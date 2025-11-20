import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator';

class CapabilityActionDto {
  @IsString()
  action_id!: string;

  @IsOptional()
  @IsString()
  friendly_name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  mqtt_topic?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration_ms?: number;

  @IsOptional()
  safety_critical?: boolean;
}

class CapabilityDeviceDto {
  @IsString()
  device_id!: string;

  @IsString()
  device_type!: string;

  @IsOptional()
  @IsString()
  friendly_name?: string;

  @IsOptional()
  @IsString()
  device_category?: string;

  @IsOptional()
  properties?: Record<string, unknown>;
}

class CapabilityTopicDto {
  @IsString()
  topic!: string;

  @IsString()
  message_type!: string;

  @IsOptional()
  schema?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  description?: string;
}

class CapabilityManifestDto {
  @IsOptional()
  @IsArray()
  @Type(() => CapabilityDeviceDto)
  devices?: CapabilityDeviceDto[];

  @IsOptional()
  @IsArray()
  @Type(() => CapabilityActionDto)
  actions?: CapabilityActionDto[];

  @IsOptional()
  @IsArray()
  @Type(() => CapabilityTopicDto)
  mqtt_topics_publish?: CapabilityTopicDto[];

  @IsOptional()
  @IsArray()
  @Type(() => CapabilityTopicDto)
  mqtt_topics_subscribe?: CapabilityTopicDto[];
}

export class RegisterControllerDto {
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
  controller_type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  friendly_name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  hardware_type?: string;

  @IsOptional()
  @IsString()
  hardware_version?: string;

  @IsOptional()
  @IsString()
  firmware_version?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsString()
  mac_address?: string;

  @IsOptional()
  @IsInt()
  heartbeat_interval_ms?: number;

  @IsOptional()
  @IsInt()
  device_count?: number;

  @IsOptional()
  @IsObject()
  @Type(() => CapabilityManifestDto)
  capability_manifest?: CapabilityManifestDto;
}
