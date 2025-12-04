import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clientId: string, query: ListUsersDto) {
    const where: any = {
      clientId,
      // Always exclude SENTIENT_ADMIN users from client user lists
      role: { not: 'SENTIENT_ADMIN' }
    };

    if (query.role) {
      where.role = query.role;
    }

    if (query.search) {
      where.email = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        clientId: true,
        created_at: true,
      },
      take: query.limit ? parseInt(query.limit) : undefined,
      skip: query.offset ? parseInt(query.offset) : undefined,
      orderBy: {
        created_at: 'desc',
      },
    });

    return users;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        clientId: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(clientId: string, data: CreateUserDto) {
    // Check if user with email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException(`User with email ${data.email} already exists`);
    }

    // Hash password
    const password_hash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        clientId,
        email: data.email,
        password_hash,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        clientId: true,
        created_at: true,
      },
    });

    return user;
  }

  async update(id: string, data: UpdateUserDto) {
    // Check if user exists
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // If email is being changed, check for conflicts
    if (data.email && data.email !== existing.email) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailTaken) {
        throw new ConflictException(`User with email ${data.email} already exists`);
      }
    }

    const updateData: any = {};

    if (data.email) {
      updateData.email = data.email;
    }

    if (data.role) {
      updateData.role = data.role;
    }

    if (data.password) {
      updateData.password_hash = await bcrypt.hash(data.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        clientId: true,
        created_at: true,
      },
    });

    return user;
  }

  async remove(id: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }
}
