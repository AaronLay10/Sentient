import { Controller, Post, Body } from '@nestjs/common';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { DevicesService } from '../devices/devices.service';

// DTO for kiosk lighting commands (no auth required - LAN only)
class KioskLightingCommandDto {
  @IsString()
  device_id: string;

  @IsString()
  command: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}

/**
 * Kiosk Controller - Unauthenticated endpoints for LAN-only touchscreen access
 *
 * SECURITY NOTE: These endpoints have NO authentication.
 * They should only be accessible from the local network.
 * Production deployments should use firewall rules to restrict access.
 */
@Controller('kiosk')
export class KioskController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * Send lighting command without authentication
   * Used by touchscreen kiosks inside the physical room
   */
  @Post('lighting/command')
  async sendLightingCommand(@Body() dto: KioskLightingCommandDto) {
    // Validate device is a lighting device (security measure)
    const allowedDevices = [
      'study_lights',
      'boiler_lights',
      'lab_lights_squares',
      'lab_lights_grates',
      'sconces',
      'crawlspace_lights',
    ];

    if (!allowedDevices.includes(dto.device_id)) {
      return { success: false, error: 'Device not allowed for kiosk control' };
    }

    // Validate command is a lighting command
    const allowedCommands = [
      'set_brightness',
      'set_squares_brightness',
      'set_grates_brightness',
      'set_squares_color',
      'set_grates_color',
      'sconces_on',
      'sconces_off',
      'crawlspace_on',
      'crawlspace_off',
    ];

    if (!allowedCommands.includes(dto.command)) {
      return { success: false, error: 'Command not allowed for kiosk control' };
    }

    return this.devicesService.sendCommand(dto.device_id, dto.command, dto.payload);
  }
}
