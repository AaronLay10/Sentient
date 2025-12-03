import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AudioService } from './audio.service';
import { AudioCommandDto } from './dto/audio-command.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post('command')
  async sendCommand(@Body() dto: AudioCommandDto) {
    return this.audioService.sendCommand(dto);
  }
}
