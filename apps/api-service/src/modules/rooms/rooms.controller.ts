import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { ListRoomsDto } from './dto/list-rooms.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tenants/:tenantId/venues/:venueId/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Param('venueId') venueId: string,
    @Query() query: ListRoomsDto
  ) {
    return this.roomsService.listByVenue(tenantId, venueId, query);
  }

  @Get(':id')
  async getOne(
    @Param('tenantId') tenantId: string,
    @Param('venueId') venueId: string,
    @Param('id') id: string
  ) {
    return this.roomsService.getById(tenantId, venueId, id);
  }

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Param('venueId') venueId: string,
    @Body() body: CreateRoomDto
  ) {
    return this.roomsService.create(tenantId, venueId, body);
  }

  @Patch(':id')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('venueId') venueId: string,
    @Param('id') id: string,
    @Body() body: UpdateRoomDto
  ) {
    return this.roomsService.update(tenantId, venueId, id, body);
  }

  @Delete(':id')
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('venueId') venueId: string,
    @Param('id') id: string
  ) {
    return this.roomsService.remove(tenantId, venueId, id);
  }
}
