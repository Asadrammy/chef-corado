/**
 * Error Sanitization for Production
 * 
 * Removes sensitive information from error responses
 * Provides safe error messages to clients
 * Logs detailed errors internally for debugging
 */

import { logger } from '@/lib/logger'

export interface SanitizedError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
  requestId?: string
}

export class ErrorSanitizer {
  private static sensitivePatterns = [
    /password/i,
    /secret/i,
    /key/i,
    /token/i,
    /authorization/i,
    /stripe/i,
    /database/i,
    /connection/i,
    /internal/i,
    /stack trace/i,
    /prisma/i,
    /sql/i
  ]

  private static sensitiveFields = [
    'password',
    'secret',
    'key',
    'token',
    'authorization',
    'stripe',
    'database',
    'connection',
    'internal',
    'stack',
    'prisma',
    'sql',
    'query',
    'userId',
    'email',
    'id'
  ]

  /**
   * Sanitize an error for client response
   */
  static sanitizeError(error: unknown, context?: string): SanitizedError {
    const timestamp = new Date().toISOString()
    const requestId = context

    // Log the full error internally
    this.logInternalError(error, context)

    if (error instanceof Error) {
      // Determine error type and create safe message
      const { code, message } = this.categorizeError(error)
      
      return {
        code,
        message,
        timestamp,
        requestId
      }
    }

    // Handle unknown errors
    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
      timestamp,
      requestId
    }
  }

  /**
   * Categorize error and return safe code/message
   */
  private static categorizeError(error: Error): { code: string; message: string } {
    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ''

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required. Please sign in.'
      }
    }

    // Authorization errors
    if (message.includes('forbidden') || message.includes('permission')) {
      return {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to perform this action.'
      }
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input provided. Please check your data and try again.'
      }
    }

    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait a moment and try again.'
      }
    }

    // Payment errors
    if (message.includes('payment') || message.includes('stripe') || stack.includes('stripe')) {
      return {
        code: 'PAYMENT_PROCESSING_ERROR',
        message: 'Payment processing failed. Please try again or contact support.'
      }
    }

    // Database errors
    if (message.includes('database') || message.includes('prisma') || stack.includes('prisma')) {
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable. Please try again later.'
      }
    }

    // Network/Connection errors
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error occurred. Please check your connection and try again.'
      }
    }

    // Default internal error
    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.'
    }
  }

  /**
   * Log detailed error information internally
   */
  private static logInternalError(error: unknown, context?: string): void {
    let errorInfo: Record<string, any> = {
      context,
      timestamp: new Date().toISOString(),
      type: typeof error
    }

    if (error instanceof Error) {
      errorInfo = {
        ...errorInfo,
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } else {
      errorInfo.error = String(error)
    }

    // Sanitize sensitive data from error info before logging
    const sanitizedInfo = this.sanitizeLogData(errorInfo)

    logger.error('[SANITIZED_ERROR]', sanitizedInfo)
  }

  /**
   * Remove sensitive data from log objects
   */
  private static sanitizeLogData(data: Record<string, any>): Record<string, any> {
    if (typeof data !== 'object' || data === null) {
      return data
    }

    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive keys
      if (this.sensitiveFields.some(pattern => key.toLowerCase().includes(pattern))) {
        sanitized[key] = '[REDACTED]'
        continue
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeLogData(value)
      } else if (typeof value === 'string') {
        // Remove sensitive patterns from strings
        sanitized[key] = this.sanitizeString(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Remove sensitive patterns from strings
   */
  private static sanitizeString(str: string): string {
    let sanitized = str

    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }

    // Remove potential secrets (long alphanumeric strings)
    sanitized = sanitized.replace(/\b[a-zA-Z0-9]{20,}\b/g, '[REDACTED]')

    return sanitized
  }

  /**
   * Create a safe API error response
   */
  static createApiError(error: unknown, context?: string) {
    const sanitized = this.sanitizeError(error, context)
    
    return {
      error: {
        code: sanitized.code,
        message: sanitized.message,
        timestamp: sanitized.timestamp,
        requestId: sanitized.requestId
      }
    }
  }
}

// Export convenience functions
export const sanitizeError = (error: unknown, context?: string) => 
  ErrorSanitizer.sanitizeError(error, context)

export const createSafeApiError = (error: unknown, context?: string) => 
  ErrorSanitizer.createApiError(error, context)
