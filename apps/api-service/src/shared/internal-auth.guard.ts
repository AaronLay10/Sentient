import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Lightweight guard to secure internal registration endpoints with a shared token
@Injectable()
export class InternalAuthGuard implements CanActivate {
  private readonly logger = new Logger(InternalAuthGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const expected = this.config.get<string>('INTERNAL_REG_TOKEN');
    const nodeEnv = this.config.get<string>('NODE_ENV');

    if (!expected) {
      // In production, require the token to be configured
      if (nodeEnv === 'production') {
        this.logger.error('INTERNAL_REG_TOKEN is not configured in production environment');
        throw new ForbiddenException('Internal authentication not configured');
      }
      // In development, warn but allow (for easier local testing)
      this.logger.warn('INTERNAL_REG_TOKEN not configured - allowing request in development mode');
      return true;
    }

    const provided = req.header('x-internal-token');
    if (provided && provided === expected) return true;
    throw new ForbiddenException('Invalid internal token');
  }
}
