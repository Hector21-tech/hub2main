/**
 * 🛡️ Enterprise Input Hygiene
 *
 * Normalizes and sanitizes inputs to prevent security issues
 * Implements PII-safe logging practices
 */

/**
 * Normalize tenant slug to prevent directory traversal and injection
 * Only allows alphanumeric characters, hyphens, and underscores
 */
export function normalizeTenantSlug(slug: string | null): string | null {
  if (!slug || typeof slug !== 'string') {
    return null
  }

  // Remove leading/trailing whitespace
  const trimmed = slug.trim()

  // Only allow alphanumeric, hyphens, underscores (no special chars)
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9\-_]/g, '')

  // Prevent empty strings and overly long slugs
  if (normalized.length === 0 || normalized.length > 50) {
    return null
  }

  // Prevent directory traversal patterns
  if (normalized.includes('..') || normalized.includes('//') || normalized.startsWith('.')) {
    return null
  }

  return normalized
}

/**
 * Sanitize user input for database queries
 * Prevents injection attacks and normalizes input
 */
export function sanitizeUserInput(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') {
    return null
  }

  // Remove leading/trailing whitespace
  const trimmed = input.trim()

  if (trimmed.length === 0) {
    return null
  }

  // Remove null bytes and control characters
  const sanitized = trimmed.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')

  // Limit length to prevent DOS
  return sanitized.substring(0, 1000)
}

/**
 * Normalize email addresses for consistent storage
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') {
    return null
  }

  const trimmed = email.trim().toLowerCase()

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return null
  }

  return trimmed
}

/**
 * 🛡️ PII-Safe Logging: Redact sensitive information from logs
 */
export function redactPII(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(redactPII)
  }

  const redacted = { ...data }

  // Common PII fields to redact
  const piiFields = [
    'password',
    'email',
    'phone',
    'phoneNumber',
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'bankAccount',
    'dateOfBirth',
    'address',
    'fullName',
    'firstName',
    'lastName'
  ]

  for (const field of piiFields) {
    if (field in redacted) {
      if (typeof redacted[field] === 'string' && redacted[field].length > 0) {
        // Show first 2 chars + asterisks for strings
        const value = redacted[field] as string
        redacted[field] = value.length > 3
          ? value.substring(0, 2) + '*'.repeat(Math.min(value.length - 2, 6))
          : '***'
      } else {
        redacted[field] = '[REDACTED]'
      }
    }
  }

  // Recursively redact nested objects
  for (const key in redacted) {
    if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactPII(redacted[key])
    }
  }

  return redacted
}

/**
 * Create a safe version of data for logging
 * Automatically redacts PII and truncates large objects
 */
export function createSafeLogData(data: any, maxDepth: number = 3): any {
  function truncateObject(obj: any, depth: number): any {
    if (depth <= 0 || typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, 5).map(item => truncateObject(item, depth - 1))
    }

    const truncated: any = {}
    const keys = Object.keys(obj).slice(0, 20) // Max 20 keys

    for (const key of keys) {
      truncated[key] = truncateObject(obj[key], depth - 1)
    }

    return truncated
  }

  const truncated = truncateObject(data, maxDepth)
  return redactPII(truncated)
}

/**
 * Validate and normalize numeric inputs
 */
export function normalizeNumeric(input: any, options: { min?: number; max?: number; integer?: boolean } = {}): number | null {
  const { min, max, integer = false } = options

  if (input === null || input === undefined || input === '') {
    return null
  }

  const num = typeof input === 'string' ? parseFloat(input) : Number(input)

  if (isNaN(num) || !isFinite(num)) {
    return null
  }

  if (integer && !Number.isInteger(num)) {
    return Math.round(num)
  }

  if (min !== undefined && num < min) {
    return min
  }

  if (max !== undefined && num > max) {
    return max
  }

  return num
}

/**
 * Validate and normalize boolean inputs
 */
export function normalizeBoolean(input: any): boolean | null {
  if (input === null || input === undefined) {
    return null
  }

  if (typeof input === 'boolean') {
    return input
  }

  if (typeof input === 'string') {
    const lower = input.toLowerCase().trim()
    if (['true', '1', 'yes', 'on'].includes(lower)) {
      return true
    }
    if (['false', '0', 'no', 'off'].includes(lower)) {
      return false
    }
  }

  if (typeof input === 'number') {
    return input !== 0
  }

  return null
}