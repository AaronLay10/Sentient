import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { ListVenuesDto } from './dto/list-venues.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByTenant(tenantId: string, query: ListVenuesDto) {
    return this.prisma.venue.findMany({
      where: { tenantId },
      orderBy: { created_at: 'desc' },
      take: query.take,
      skip: query.skip
    });
  }

  async getById(tenantId: string, venueId: string) {
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, tenantId }
    });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
    return venue;
  }

  async create(tenantId: string, dto: CreateVenueDto) {
    try {
      return await this.prisma.venue.create({
        data: {
          tenantId,
          name: dto.name
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Venue name must be unique per tenant');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Tenant not found');
        }
      }
      throw error;
    }
  }

  async update(tenantId: string, venueId: string, dto: UpdateVenueDto) {
    try {
      return await this.prisma.venue.update({
        where: { id: venueId },
        data: { name: dto.name },
        select: { id: true, name: true, tenantId: true, created_at: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Venue name must be unique per tenant');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Venue not found');
        }
      }
      throw error;
    }
  }

  async remove(tenantId: string, venueId: string) {
    try {
      return await this.prisma.venue.delete({
        where: { id: venueId },
        select: { id: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Venue not found');
      }
      throw error;
    }
  }
}
