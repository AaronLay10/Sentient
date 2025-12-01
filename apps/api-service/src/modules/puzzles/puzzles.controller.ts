import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PuzzlesService } from './puzzles.service';
import { ListPuzzlesDto } from './dto/list-puzzles.dto';
import { CreatePuzzleDto } from './dto/create-puzzle.dto';
import { UpdatePuzzleDto } from './dto/update-puzzle.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('clients/:clientId/rooms/:roomId/puzzles')
export class PuzzlesController {
  constructor(private readonly puzzlesService: PuzzlesService) {}

  @Get()
  async list(
    @Param('clientId') clientId: string,
    @Param('roomId') roomId: string,
    @Query() query: ListPuzzlesDto
  ) {
    return this.puzzlesService.listByRoom(clientId, roomId, query);
  }

  @Get(':id')
  async getOne(
    @Param('clientId') clientId: string,
    @Param('roomId') roomId: string,
    @Param('id') id: string
  ) {
    return this.puzzlesService.getById(clientId, roomId, id);
  }

  @Post()
  async create(
    @Param('clientId') clientId: string,
    @Param('roomId') roomId: string,
    @Body() body: CreatePuzzleDto
  ) {
    return this.puzzlesService.create(clientId, roomId, body);
  }

  @Patch(':id')
  async update(
    @Param('clientId') clientId: string,
    @Param('roomId') roomId: string,
    @Param('id') id: string,
    @Body() body: UpdatePuzzleDto
  ) {
    return this.puzzlesService.update(clientId, roomId, id, body);
  }

  @Delete(':id')
  async remove(
    @Param('clientId') clientId: string,
    @Param('roomId') roomId: string,
    @Param('id') id: string
  ) {
    return this.puzzlesService.remove(clientId, roomId, id);
  }

  @Post(':id/duplicate')
  async duplicate(
    @Param('clientId') clientId: string,
    @Param('roomId') roomId: string,
    @Param('id') id: string
  ) {
    return this.puzzlesService.duplicate(clientId, roomId, id);
  }
}
