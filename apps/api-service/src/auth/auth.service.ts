import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// Special client name for Sentient staff - should be hidden from normal client lists
export const SENTIENT_CLIENT_NAME = '__SENTIENT__';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { client: true }
    });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return null;
    const { password_hash, ...safe } = user;
    return safe;
  }

  async login(user: { id: string; email: string; clientId: string; role: string; client?: { name: string } }) {
    const isSentientAdmin = user.role === 'SENTIENT_ADMIN';

    const payload = {
      sub: user.id,
      email: user.email,
      clientId: user.clientId,
      role: user.role,
      isSentientAdmin
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        clientId: user.clientId,
        role: user.role,
        isSentientAdmin
      }
    };
  }
}
