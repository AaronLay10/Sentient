import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: any) {
    const token = await this.authService.login({
      id: req.user.id,
      email: req.user.email,
      tenantId: req.user.tenantId,
      role: req.user.role
    });
    return token;
  }
}
