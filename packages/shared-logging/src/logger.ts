import winston from 'winston';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  service?: string;
  room_id?: string;
  session_id?: string;
  controller_id?: string;
  device_id?: string;
  user_id?: string;
  [key: string]: any;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): Logger;
}

class WinstonLogger implements Logger {
  constructor(private readonly winston: winston.Logger, private readonly defaultContext: LogContext = {}) {}

  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, { ...this.defaultContext, ...context });
  }

  info(message: string, context?: LogContext): void {
    this.winston.info(message, { ...this.defaultContext, ...context });
  }

  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, { ...this.defaultContext, ...context });
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.winston.error(message, {
      ...this.defaultContext,
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  child(context: LogContext): Logger {
    return new WinstonLogger(this.winston, { ...this.defaultContext, ...context });
  }
}

export function createLogger(options: {
  service: string;
  level?: LogLevel;
  pretty?: boolean;
}): Logger {
  const { service, level = 'info', pretty = false } = options;

  const format = pretty
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
        })
      )
    : winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      );

  const winstonLogger = winston.createLogger({
    level,
    format,
    defaultMeta: { service },
    transports: [
      new winston.transports.Console(),
    ],
  });

  return new WinstonLogger(winstonLogger, { service });
}
