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
    return this.prisma.tenant.findMany({
      orderBy: { created_at: 'desc' },
      take: query.take,
      skip: query.skip
    });
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async create(input: CreateTenantDto) {
    try {
      return await this.prisma.tenant.create({
        data: { name: input.name }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Tenant name must be unique');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateTenantDto) {
    try {
      return await this.prisma.tenant.update({
        where: { id },
        data: { name: input.name },
        select: { id: true, name: true, created_at: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Tenant name must be unique');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Tenant not found');
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.tenant.delete({
        where: { id },
        select: { id: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Tenant not found');
      }
      throw error;
    }
  }
}
