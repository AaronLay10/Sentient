import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListTenantsDto) {
    return this.prisma.client.findMany({
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

  async create(input: CreateTenantDto) {
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

  async update(id: string, input: UpdateTenantDto) {
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
