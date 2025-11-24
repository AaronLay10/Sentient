import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('clients/:clientId/users')
  async list(
    @Param('clientId') clientId: string,
    @Query() query: ListUsersDto
  ) {
    return this.usersService.findAll(clientId, query);
  }

  @Get('users/:id')
  async getOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post('clients/:clientId/users')
  async create(
    @Param('clientId') clientId: string,
    @Body() body: CreateUserDto
  ) {
    return this.usersService.create(clientId, body);
  }

  @Patch('users/:id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto
  ) {
    return this.usersService.update(id, body);
  }

  @Delete('users/:id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
