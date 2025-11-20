import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Lightweight guard to secure internal registration endpoints with a shared token
@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const expected = this.config.get<string>('INTERNAL_REG_TOKEN');
    if (!expected) {
      // If not configured, allow (fallback for dev)
      return true;
    }
    const provided = req.header('x-internal-token');
    if (provided && provided === expected) return true;
    throw new ForbiddenException('Invalid internal token');
  }
}
