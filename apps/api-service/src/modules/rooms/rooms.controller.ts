import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { ListRoomsDto } from './dto/list-rooms.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('clients/:clientId/venues/:venueId/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async list(
    @Param('clientId') clientId: string,
    @Param('venueId') venueId: string,
    @Query() query: ListRoomsDto
  ) {
    return this.roomsService.listByVenue(clientId, venueId, query);
  }

  @Get(':id')
  async getOne(
    @Param('clientId') clientId: string,
    @Param('venueId') venueId: string,
    @Param('id') id: string
  ) {
    return this.roomsService.getById(clientId, venueId, id);
  }

  @Post()
  async create(
    @Param('clientId') clientId: string,
    @Param('venueId') venueId: string,
    @Body() body: CreateRoomDto
  ) {
    return this.roomsService.create(clientId, venueId, body);
  }

  @Patch(':id')
  async update(
    @Param('clientId') clientId: string,
    @Param('venueId') venueId: string,
    @Param('id') id: string,
    @Body() body: UpdateRoomDto
  ) {
    return this.roomsService.update(clientId, venueId, id, body);
  }

  @Delete(':id')
  async remove(
    @Param('clientId') clientId: string,
    @Param('venueId') venueId: string,
    @Param('id') id: string
  ) {
    return this.roomsService.remove(clientId, venueId, id);
  }
}
