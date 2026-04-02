import { logger } from './logger';

export interface StructuredLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  requestId?: string;
  userId?: string;
  route?: string;
  status?: number;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

class PersistentLogger {
  private isDev = process.env.NODE_ENV === 'development';
  private logEndpoint = process.env.NEXT_PUBLIC_LOG_ENDPOINT || '/api/logs';

  private formatLog(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: {
      requestId?: string;
      userId?: string;
      route?: string;
      status?: number;
      duration?: number;
      error?: Error;
      metadata?: Record<string, any>;
    }
  ): StructuredLog {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: context?.requestId,
      userId: context?.userId,
      route: context?.route,
      status: context?.status,
      duration: context?.duration,
      error: context?.error
        ? {
            name: context.error.name,
            message: context.error.message,
            stack: context.error.stack,
          }
        : undefined,
      metadata: context?.metadata,
    };
  }

  private async sendToServer(log: StructuredLog) {
    try {
      // Only send from client-side in production
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
        await fetch(this.logEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log),
        }).catch(() => {
          // Silently fail - don't disrupt app if logging fails
        });
      }
    } catch (err) {
      // Silently fail
    }
  }

  private output(log: StructuredLog) {
    // Log to in-memory logger
    logger[log.level](log.message, {
      requestId: log.requestId,
      userId: log.userId,
      route: log.route,
      status: log.status,
      duration: log.duration,
      error: log.error,
      metadata: log.metadata,
    });

    // Send to server in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToServer(log);
    }

    // Console output in development
    if (this.isDev) {
      const prefix = `[${log.timestamp}] [${log.level.toUpperCase()}]`;
      console.log(prefix, JSON.stringify(log, null, 2));
    }
  }

  debug(
    message: string,
    context?: {
      requestId?: string;
      userId?: string;
      route?: string;
      metadata?: Record<string, any>;
    }
  ) {
    this.output(this.formatLog('debug', message, context));
  }

  info(
    message: string,
    context?: {
      requestId?: string;
      userId?: string;
      route?: string;
      status?: number;
      duration?: number;
      metadata?: Record<string, any>;
    }
  ) {
    this.output(this.formatLog('info', message, context));
  }

  warn(
    message: string,
    context?: {
      requestId?: string;
      userId?: string;
      route?: string;
      status?: number;
      metadata?: Record<string, any>;
    }
  ) {
    this.output(this.formatLog('warn', message, context));
  }

  error(
    message: string,
    error?: Error,
    context?: {
      requestId?: string;
      userId?: string;
      route?: string;
      status?: number;
      metadata?: Record<string, any>;
    }
  ) {
    this.output(this.formatLog('error', message, { ...context, error }));
  }
}

export const persistentLogger = new PersistentLogger();
