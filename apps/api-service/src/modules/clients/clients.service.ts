import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsDto } from './dto/list-clients.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Prisma } from '@prisma/client';
import { SENTIENT_CLIENT_NAME } from '../../auth/auth.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListClientsDto) {
    // Filter out the internal Sentient client from the list
    return this.prisma.client.findMany({
      where: {
        name: { not: SENTIENT_CLIENT_NAME }
      },
      orderBy: { created_at: 'desc' },
      take: query.take,
      skip: query.skip
    });
  }

  async findById(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async create(input: CreateClientDto) {
    try {
      return await this.prisma.client.create({
        data: { name: input.name }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Client name must be unique');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateClientDto) {
    try {
      return await this.prisma.client.update({
        where: { id },
        data: { name: input.name },
        select: { id: true, name: true, created_at: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Client name must be unique');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Client not found');
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.client.delete({
        where: { id },
        select: { id: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Client not found');
      }
      throw error;
    }
  }
}
