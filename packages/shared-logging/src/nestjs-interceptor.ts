import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Logger } from './logger';
import { runWithContext, addLogContext } from './log-context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const requestId = request.headers['x-request-id'] || crypto.randomUUID();

    const logContext = {
      request_id: requestId,
      method,
      url,
    };

    this.logger.debug('Incoming request', logContext);

    const start = Date.now();

    return runWithContext(logContext, () =>
      next.handle().pipe(
        tap({
          next: () => {
            const duration = Date.now() - start;
            this.logger.info('Request completed', { ...logContext, duration_ms: duration });
          },
          error: (error: Error) => {
            const duration = Date.now() - start;
            this.logger.error('Request failed', error, { ...logContext, duration_ms: duration });
          },
        })
      )
    );
  }
}
