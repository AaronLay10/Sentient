import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListRoomsDto } from './dto/list-rooms.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByVenue(clientId: string, venueId: string, query: ListRoomsDto) {
    return this.prisma.room.findMany({
      where: { clientId, venueId },
      orderBy: { created_at: 'desc' },
      take: query.take,
      skip: query.skip
    });
  }

  async getById(clientId: string, venueId: string, roomId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, clientId, venueId }
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async create(clientId: string, venueId: string, dto: CreateRoomDto) {
    try {
      return await this.prisma.room.create({
        data: {
          clientId,
          venueId,
          name: dto.name,
          room_id: dto.room_id
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Room name must be unique per venue');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Client or venue not found');
        }
      }
      throw error;
    }
  }

  async update(clientId: string, venueId: string, roomId: string, dto: UpdateRoomDto) {
    try {
      return await this.prisma.room.update({
        where: { id: roomId },
        data: { name: dto.name, room_id: dto.room_id },
        select: { id: true, name: true, room_id: true, clientId: true, venueId: true, created_at: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Room name must be unique per venue');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Room not found');
        }
      }
      throw error;
    }
  }

  async remove(clientId: string, venueId: string, roomId: string) {
    try {
      return await this.prisma.room.delete({
        where: { id: roomId },
        select: { id: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Room not found');
      }
      throw error;
    }
  }
}
