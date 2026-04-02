import { z } from 'zod'

// Security utilities for production-grade input sanitization and validation

export class SecurityUtils {
  // Sanitize HTML content to prevent XSS (basic implementation)
  static sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') {
      return ''
    }
    
    // Basic HTML sanitization - remove script tags and dangerous attributes
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/<[^>]*>/g, (match) => {
        // Allow only safe tags
        const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li']
        const tagName = match.replace(/<\/?([^\s>]+).*/, '$1').toLowerCase()
        return allowedTags.includes(tagName) ? match : ''
      })
      .slice(0, 50000)
  }

  // Sanitize and trim text input
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') {
      return ''
    }
    
    return input
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .slice(0, 10000) // Limit length
  }

  // Sanitize email addresses
  static sanitizeEmail(input: string): string {
    if (!input || typeof input !== 'string') {
      return ''
    }
    
    return input
      .toLowerCase()
      .trim()
      .slice(0, 254) // RFC 5321 limit
  }

  // Validate and sanitize phone numbers
  static sanitizePhone(input: string): string {
    if (!input || typeof input !== 'string') {
      return ''
    }
    
    // Remove all non-digit characters except +, -, (, )
    return input
      .replace(/[^0-9+\-\(\)\s]/g, '')
      .trim()
      .slice(0, 20)
  }

  // Sanitize URLs
  static sanitizeUrl(input: string): string {
    if (!input || typeof input !== 'string') {
      return ''
    }
    
    try {
      const url = new URL(input)
      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return ''
      }
      return url.toString().slice(0, 2048)
    } catch {
      return ''
    }
  }

  // Validate file upload types
  static validateFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase()
    return extension ? allowedTypes.includes(extension) : false
  }

  // Generate secure random token
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    const randomValues = new Uint32Array(length)
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues)
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < length; i++) {
        randomValues[i] = Math.floor(Math.random() * 0xFFFFFFFF)
      }
    }
    
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length]
    }
    
    return result
  }

  // Check for potential SQL injection patterns
  static containsSqlInjection(input: string): boolean {
    const suspiciousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\/\*|\*\/|;|'|")/,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i
    ]
    
    return suspiciousPatterns.some(pattern => pattern.test(input))
  }

  // Validate password strength
  static validatePasswordStrength(password: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }
    
    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain three or more repeating characters')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Enhanced Zod schemas with security validation
export const secureSchemas = {
  // Secure text field with XSS protection
  secureText: z.string()
    .min(1, 'This field is required')
    .max(10000, 'Text too long')
    .transform(val => SecurityUtils.sanitizeText(val))
    .refine(val => !SecurityUtils.containsSqlInjection(val), {
      message: 'Invalid characters detected'
    }),

  // Secure HTML content
  secureHtml: z.string()
    .max(50000, 'Content too long')
    .transform(val => SecurityUtils.sanitizeHtml(val)),

  // Secure email
  secureEmail: z.string()
    .email('Invalid email address')
    .transform(val => SecurityUtils.sanitizeEmail(val)),

  // Secure URL
  secureUrl: z.string()
    .url('Invalid URL')
    .transform(val => SecurityUtils.sanitizeUrl(val)),

  // Secure price field
  securePrice: z.number()
    .positive('Price must be positive')
    .max(100000, 'Price cannot exceed $100,000')
    .refine((val) => Number.isInteger(val * 100), {
      message: 'Price must have at most 2 decimal places'
    }),

  // Secure message field
  secureMessage: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message cannot exceed 1000 characters')
    .transform(val => SecurityUtils.sanitizeText(val))
    .refine(val => !SecurityUtils.containsSqlInjection(val), {
      message: 'Invalid characters detected'
    }),

  // Secure name field
  secureName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .transform(val => SecurityUtils.sanitizeText(val))
    .refine(val => /^[a-zA-Z\s\-']+$/.test(val), {
      message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
    })
}

// Rate limiting configurations for different user types
export const roleBasedRateLimits = {
  ADMIN: {
    multiplier: 5, // 5x more lenient for admins
    message: "Admin rate limit exceeded"
  },
  CHEF: {
    multiplier: 2, // 2x more lenient for chefs
    message: "Chef rate limit exceeded"
  },
  CLIENT: {
    multiplier: 1, // Standard rate limit for clients
    message: "Rate limit exceeded"
  }
}

// Security headers for API responses
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}

// Error message sanitizer - hide internal details
export function sanitizeError(error: any): string {
  if (!error) return 'An unexpected error occurred'
  
  // Don't expose internal error details to clients
  const safeMessages = [
    'An unexpected error occurred',
    'Invalid request',
    'Unauthorized access',
    'Resource not found',
    'Validation failed',
    'Rate limit exceeded',
    'Service temporarily unavailable'
  ]
  
  // Check if it's a known safe error
  if (typeof error === 'string' && safeMessages.some(msg => error.toLowerCase().includes(msg.toLowerCase()))) {
    return error
  }
  
  // Return generic error message
  return 'An unexpected error occurred'
}

// Input validation middleware
export function validateInput(schema: z.ZodSchema) {
  return (data: unknown) => {
    try {
      return schema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw new Error('Invalid input data')
    }
  }
}

export default SecurityUtils
