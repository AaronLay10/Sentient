import { Controller, Get, UseGuards } from '@nestjs/common';
import { ControllersService } from './controllers.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('controllers')
export class ControllersPublicController {
  constructor(private readonly controllersService: ControllersService) {}

  @Get()
  async findAll() {
    return this.controllersService.findAll();
  }
}
