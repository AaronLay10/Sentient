import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListPuzzlesDto } from './dto/list-puzzles.dto';
import { CreatePuzzleDto } from './dto/create-puzzle.dto';
import { UpdatePuzzleDto } from './dto/update-puzzle.dto';

@Injectable()
export class PuzzlesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByRoom(clientId: string, roomId: string, query: ListPuzzlesDto) {
    return this.prisma.puzzle.findMany({
      where: { clientId, roomId },
      orderBy: [{ order: 'asc' }, { created_at: 'desc' }],
      take: query.take,
      skip: query.skip,
    });
  }

  async getById(clientId: string, roomId: string, puzzleId: string) {
    const puzzle = await this.prisma.puzzle.findFirst({
      where: { id: puzzleId, clientId, roomId },
    });
    if (!puzzle) {
      throw new NotFoundException('Puzzle not found');
    }
    return puzzle;
  }

  async create(clientId: string, roomId: string, dto: CreatePuzzleDto) {
    // Verify room exists
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, clientId },
    });
    if (!room) {
      throw new BadRequestException('Room not found');
    }

    try {
      return await this.prisma.puzzle.create({
        data: {
          clientId,
          roomId,
          name: dto.name,
          description: dto.description,
          graph: dto.graph as unknown as Prisma.JsonObject,
          timeout_seconds: dto.timeout_seconds,
          hint_text: dto.hint_text,
          active: dto.active ?? true,
          order: dto.order ?? 0,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Puzzle name must be unique per room');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Client or room not found');
        }
      }
      throw error;
    }
  }

  async update(clientId: string, roomId: string, puzzleId: string, dto: UpdatePuzzleDto) {
    try {
      return await this.prisma.puzzle.update({
        where: { id: puzzleId },
        data: {
          name: dto.name,
          description: dto.description,
          graph: dto.graph ? (dto.graph as unknown as Prisma.JsonObject) : undefined,
          timeout_seconds: dto.timeout_seconds,
          hint_text: dto.hint_text,
          active: dto.active,
          order: dto.order,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Puzzle name must be unique per room');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Puzzle not found');
        }
      }
      throw error;
    }
  }

  async remove(clientId: string, roomId: string, puzzleId: string) {
    try {
      return await this.prisma.puzzle.delete({
        where: { id: puzzleId },
        select: { id: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Puzzle not found');
      }
      throw error;
    }
  }

  async duplicate(clientId: string, roomId: string, puzzleId: string) {
    const original = await this.getById(clientId, roomId, puzzleId);

    return this.prisma.puzzle.create({
      data: {
        clientId: original.clientId,
        roomId: original.roomId,
        name: `${original.name} (Copy)`,
        description: original.description,
        graph: original.graph as Prisma.JsonObject,
        timeout_seconds: original.timeout_seconds,
        hint_text: original.hint_text,
        active: false, // New copies are inactive by default
        order: original.order + 1,
      },
    });
  }
}
