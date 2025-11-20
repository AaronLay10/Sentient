import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { ListVenuesDto } from './dto/list-venues.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tenants/:tenantId/venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query() query: ListVenuesDto
  ) {
    return this.venuesService.listByTenant(tenantId, query);
  }

  @Get(':id')
  async getOne(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string
  ) {
    return this.venuesService.getById(tenantId, id);
  }

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateVenueDto
  ) {
    return this.venuesService.create(tenantId, body);
  }

  @Patch(':id')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateVenueDto
  ) {
    return this.venuesService.update(tenantId, id, body);
  }

  @Delete(':id')
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string
  ) {
    return this.venuesService.remove(tenantId, id);
  }
}
