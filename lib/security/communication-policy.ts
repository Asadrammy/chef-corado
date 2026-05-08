/**
 * Communication Policy Enforcement
 * 
 * Detects and blocks prohibited content in messages to prevent off-platform communication.
 * This protects the platform from commercial leakage and ensures all booking discussions remain on-platform.
 */

export type PolicyViolation = {
  type: 'phone' | 'email' | 'url' | 'social' | 'whatsapp' | 'telegram' | 'discord' | 'contact_phrase'
  detected: string
  message: string
}

/**
 * Robust patterns to detect prohibited contact information
 */
const PATTERNS = {
  // Phone numbers (international formats)
  phone: [
    /\+?[\d\s\-\(\)]{10,}/g, // Basic international
    /\d{3}[\s\.\-]?\d{3}[\s\.\-]?\d{4}/g, // US format
    /\+?44[\s\-\d]{10}/g, // UK format
    /\+?1?[\s\-\(]?\d{3}[\s\-\)]?\d{3}[\s\-]?\d{4}/g, // North America
  ],
  
  // Email addresses
  email: [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  ],
  
  // URLs
  url: [
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /[a-zA-Z0-9-]+\.(com|org|net|io|co|uk|us|ca|au|de|fr|es|it|nl|be|ch|at|se|no|dk|fi|pl|cz|hu|gr|tr|il|ae|in|jp|kr|cn|sg|my|th|vn|id|ph|hk|tw|nz)(\/[^\s]*)?/gi,
  ],
  
  // Social media handles
  social: [
    /@[\w]{2,}(?=[\s]|$)/g, // @username
    /instagram\.com\/[\w-]+/gi,
    /twitter\.com\/[\w-]+/gi,
    /facebook\.com\/[\w-]+/gi,
    /linkedin\.com\/in\/[\w-]+/gi,
    /tiktok\.com\/@[\w-]+/gi,
  ],
  
  // WhatsApp specific
  whatsapp: [
    /whatsapp/i,
    /wa\.me/i,
    /chat\.whatsapp\.com/i,
  ],
  
  // Telegram specific
  telegram: [
    /telegram/i,
    /t\.me\/[\w]+/gi,
  ],
  
  // Discord specific
  discord: [
    /discord/i,
    /discord\.gg\/[\w]+/gi,
  ],
  
  // Contact phrases that suggest off-platform communication
  contact_phrase: [
    /contact me (at|on|via)/gi,
    /message me (at|on|via)/gi,
    /text me (at|on)/gi,
    /call me (at|on)/gi,
    /email me (at|on)/gi,
    /reach me (at|on|via)/gi,
    /outside (the )?platform/gi,
    /off[- ]?platform/gi,
    /direct (message|contact)/gi,
    /DM me/gi,
  ],
}

/**
 * Check content for policy violations
 */
export function detectPolicyViolations(content: string): PolicyViolation[] {
  const violations: PolicyViolation[] = []
  
  // Check phone numbers
  for (const pattern of PATTERNS.phone) {
    const matches = content.match(pattern)
    if (matches) {
      for (const match of matches) {
        violations.push({
          type: 'phone',
          detected: match,
          message: 'Phone numbers are not allowed in messages. Please keep all communication on-platform.',
        })
      }
    }
  }
  
  // Check emails
  for (const pattern of PATTERNS.email) {
    const matches = content.match(pattern)
    if (matches) {
      for (const match of matches) {
        violations.push({
          type: 'email',
          detected: match,
          message: 'Email addresses are not allowed in messages. Please keep all communication on-platform.',
        })
      }
    }
  }
  
  // Check URLs
  for (const pattern of PATTERNS.url) {
    const matches = content.match(pattern)
    if (matches) {
      for (const match of matches) {
        violations.push({
          type: 'url',
          detected: match,
          message: 'Links and URLs are not allowed in messages. Please keep all communication on-platform.',
        })
      }
    }
  }
  
  // Check social handles
  for (const pattern of PATTERNS.social) {
    const matches = content.match(pattern)
    if (matches) {
      for (const match of matches) {
        violations.push({
          type: 'social',
          detected: match,
          message: 'Social media handles are not allowed in messages. Please keep all communication on-platform.',
        })
      }
    }
  }
  
  // Check WhatsApp
  for (const pattern of PATTERNS.whatsapp) {
    const matches = content.match(pattern)
    if (matches) {
      for (const match of matches) {
        violations.push({
          type: 'whatsapp',
          detected: match,
          message: 'WhatsApp references are not allowed in messages. Please keep all communication on-platform.',
        })
      }
    }
  }
  
  // Check Telegram
  for (const pattern of PATTERNS.telegram) {
    const matches = content.match(pattern)
    if (matches) {
      for (const match of matches) {
        violations.push({
          type: 'telegram',
          detected: match,
          message: 'Telegram references are not allowed in messages. Please keep all communication on-platform.',
        })
      }
    }
  }
  
  // Check Discord
  for (const pattern of PATTERNS.discord) {
    const matches = content.match(pattern)
    if (matches) {
      for (const match of matches) {
        violations.push({
          type: 'discord',
          detected: match,
          message: 'Discord references are not allowed in messages. Please keep all communication on-platform.',
        })
      }
    }
  }
  
  // Check contact phrases
  for (const pattern of PATTERNS.contact_phrase) {
    const matches = content.match(pattern)
    if (matches) {
      for (const match of matches) {
        violations.push({
          type: 'contact_phrase',
          detected: match,
          message: 'Please keep all communication on-platform. Off-platform contact requests are not permitted.',
        })
      }
    }
  }
  
  return violations
}

/**
 * Validate message content against communication policy
 * Throws error if violations are detected
 */
export function validateMessageContent(content: string): void {
  const violations = detectPolicyViolations(content)
  
  if (violations.length > 0) {
    const firstViolation = violations[0]
    throw new Error(`COMMUNICATION_POLICY_VIOLATION: ${firstViolation.message}`)
  }
}

 export function validatePolicyField(fieldName: string, content?: string | null): void {
   if (!content?.trim()) {
     return
   }

   const violations = detectPolicyViolations(content)

   if (violations.length > 0) {
     const firstViolation = violations[0]
     throw new Error(`COMMUNICATION_POLICY_VIOLATION:${fieldName}:${firstViolation.message}`)
   }
 }

 export function validatePolicyFields(fields: Record<string, string | null | undefined>): void {
   for (const [fieldName, content] of Object.entries(fields)) {
     validatePolicyField(fieldName, content)
   }
 }

/**
 * Sanitize content by removing detected violations (optional - for logging/audit)
 */
export function sanitizeForAudit(content: string): string {
  let sanitized = content
  
  // Replace phone numbers with [PHONE_REDACTED]
  for (const pattern of PATTERNS.phone) {
    sanitized = sanitized.replace(pattern, '[PHONE_REDACTED]')
  }
  
  // Replace emails with [EMAIL_REDACTED]
  for (const pattern of PATTERNS.email) {
    sanitized = sanitized.replace(pattern, '[EMAIL_REDACTED]')
  }
  
  // Replace URLs with [URL_REDACTED]
  for (const pattern of PATTERNS.url) {
    sanitized = sanitized.replace(pattern, '[URL_REDACTED]')
  }
  
  // Replace social handles with [SOCIAL_REDACTED]
  for (const pattern of PATTERNS.social) {
    sanitized = sanitized.replace(pattern, '[SOCIAL_REDACTED]')
  }
  
  return sanitized
}

/**
 * Check if content is safe (returns true if no violations)
 */
export function isContentSafe(content: string): boolean {
  return detectPolicyViolations(content).length === 0
}
