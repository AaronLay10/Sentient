import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ControllersService } from './controllers.service';
import { RegisterControllerDto } from './dto/register-controller.dto';
import { InternalAuthGuard } from '../../shared/internal-auth.guard';

@UseGuards(InternalAuthGuard)
@Controller('internal/controllers')
export class ControllersController {
  constructor(private readonly controllersService: ControllersService) {}

  @Get()
  async findAll() {
    return this.controllersService.findAll();
  }

  @Post('register')
  async register(@Body() body: RegisterControllerDto) {
    return this.controllersService.register(body);
  }
}
