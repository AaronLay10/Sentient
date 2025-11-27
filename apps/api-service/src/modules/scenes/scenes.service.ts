import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListScenesDto } from './dto/list-scenes.dto';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';

@Injectable()
export class ScenesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByRoom(clientId: string, roomId: string, query: ListScenesDto) {
    return this.prisma.scene.findMany({
      where: { clientId, roomId },
      orderBy: [{ order: 'asc' }, { created_at: 'desc' }],
      take: query.take,
      skip: query.skip,
    });
  }

  async getById(clientId: string, roomId: string, sceneId: string) {
    const scene = await this.prisma.scene.findFirst({
      where: { id: sceneId, clientId, roomId },
    });
    if (!scene) {
      throw new NotFoundException('Scene not found');
    }
    return scene;
  }

  async create(clientId: string, roomId: string, dto: CreateSceneDto) {
    // Verify room exists
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, clientId },
    });
    if (!room) {
      throw new BadRequestException('Room not found');
    }

    try {
      return await this.prisma.scene.create({
        data: {
          clientId,
          roomId,
          name: dto.name,
          description: dto.description,
          graph: dto.graph as Prisma.JsonObject,
          active: dto.active ?? true,
          order: dto.order ?? 0,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Scene name must be unique per room');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Client or room not found');
        }
      }
      throw error;
    }
  }

  async update(clientId: string, roomId: string, sceneId: string, dto: UpdateSceneDto) {
    try {
      return await this.prisma.scene.update({
        where: { id: sceneId },
        data: {
          name: dto.name,
          description: dto.description,
          graph: dto.graph ? (dto.graph as Prisma.JsonObject) : undefined,
          active: dto.active,
          order: dto.order,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Scene name must be unique per room');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Scene not found');
        }
      }
      throw error;
    }
  }

  async remove(clientId: string, roomId: string, sceneId: string) {
    try {
      return await this.prisma.scene.delete({
        where: { id: sceneId },
        select: { id: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Scene not found');
      }
      throw error;
    }
  }

  async duplicate(clientId: string, roomId: string, sceneId: string) {
    const original = await this.getById(clientId, roomId, sceneId);
    
    return this.prisma.scene.create({
      data: {
        clientId: original.clientId,
        roomId: original.roomId,
        name: `${original.name} (Copy)`,
        description: original.description,
        graph: original.graph as Prisma.JsonObject,
        active: false, // New copies are inactive by default
        order: original.order + 1,
      },
    });
  }
}
