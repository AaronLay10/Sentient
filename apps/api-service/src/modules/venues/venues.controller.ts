import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { ListVenuesDto } from './dto/list-venues.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('clients/:clientId/venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  async list(
    @Param('clientId') clientId: string,
    @Query() query?: ListVenuesDto
  ) {
    // Default to empty query if not provided
    return this.venuesService.listByClient(clientId, query || {});
  }

  @Get(':id')
  async getOne(
    @Param('clientId') clientId: string,
    @Param('id') id: string
  ) {
    return this.venuesService.getById(clientId, id);
  }

  @Post()
  async create(
    @Param('clientId') clientId: string,
    @Body() body: CreateVenueDto
  ) {
    return this.venuesService.create(clientId, body);
  }

  @Patch(':id')
  async update(
    @Param('clientId') clientId: string,
    @Param('id') id: string,
    @Body() body: UpdateVenueDto
  ) {
    return this.venuesService.update(clientId, id, body);
  }

  @Delete(':id')
  async remove(
    @Param('clientId') clientId: string,
    @Param('id') id: string
  ) {
    return this.venuesService.remove(clientId, id);
  }
}
