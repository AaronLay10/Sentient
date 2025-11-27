import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ScenesService } from './scenes.service';
import { ListScenesDto } from './dto/list-scenes.dto';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('clients/:clientId/rooms/:roomId/scenes')
export class ScenesController {
  constructor(private readonly scenesService: ScenesService) {}

  @Get()
  async list(
    @Param('clientId') clientId: string,
    @Param('roomId') roomId: string,
    @Query() query: ListScenesDto
  ) {
    return this.scenesService.listByRoom(clientId, roomId, query);
  }

  @Get(':id')
  async getOne(
    @Param('clientId') clientId: string,
    @Param('roomId') roomId: string,
    @Param('id') id: string
  ) {
    return this.scenesService.getById(clientId, roomId, id);
  }

  @Post()
  async create(
    @Param('clientId') clientId: string,
    @Param('roomId') roomId: string,
    @Body() body: CreateSceneDto
  ) {
    return this.scenesService.create(clientId, roomId, body);
  }

  @Patch(':id')
  async update(
    @Param('clientId') clientId: string,
    @Param('roomId') roomId: string,
    @Param('id') id: string,
    @Body() body: UpdateSceneDto
  ) {
    return this.scenesService.update(clientId, roomId, id, body);
  }

  @Delete(':id')
  async remove(
    @Param('clientId') clientId: string,
    @Param('roomId') roomId: string,
    @Param('id') id: string
  ) {
    return this.scenesService.remove(clientId, roomId, id);
  }

  @Post(':id/duplicate')
  async duplicate(
    @Param('clientId') clientId: string,
    @Param('roomId') roomId: string,
    @Param('id') id: string
  ) {
    return this.scenesService.duplicate(clientId, roomId, id);
  }
}
