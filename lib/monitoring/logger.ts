/**
 * Centralized Logger
 * Integrates with Sentry for error tracking
 * Provides structured logging for all services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  /**
   * Log at debug level
   */
  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  /**
   * Log at info level
   */
  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  /**
   * Log at error level
   */
  error(message: string, context?: LogContext | Error) {
    let errorContext: LogContext = {}

    if (context instanceof Error) {
      errorContext = {
        error: context.message,
        stack: context.stack,
      }
    } else if (context) {
      errorContext = context
    }

    this.log('error', message, errorContext)

    // Send to Sentry in production
    if (!this.isDevelopment && process.env.SENTRY_DSN) {
      this.sendToSentry('error', message, errorContext)
    }
  }

  /**
   * Internal logging implementation
   */
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(context && { context }),
    }

    // Console output
    const output = JSON.stringify(logEntry)
    switch (level) {
      case 'debug':
        console.debug(output)
        break
      case 'info':
        console.info(output)
        break
      case 'warn':
        console.warn(output)
        break
      case 'error':
        console.error(output)
        break
    }

    // In production, send to log aggregation service
    if (!this.isDevelopment && process.env.LOGTAIL_TOKEN) {
      this.sendToLogtail(logEntry)
    }
  }

  /**
   * Send error to Sentry
   */
  private sendToSentry(level: string, message: string, context: LogContext) {
    // TODO: Implement Sentry integration
    // import * as Sentry from "@sentry/nextjs"
    // Sentry.captureException(new Error(message), {
    //   level: level as any,
    //   contexts: { custom: context }
    // })
  }

  /**
   * Send log to Logtail
   */
  private sendToLogtail(logEntry: any) {
    // TODO: Implement Logtail integration
    // fetch('https://in.logtail.com/', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.LOGTAIL_TOKEN}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(logEntry),
    // }).catch(err => console.error('Logtail error:', err))
  }
}

export const logger = new Logger()
