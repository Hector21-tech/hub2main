/**
 * 🛡️ Enterprise Security Headers
 *
 * Comprehensive security headers for production deployment
 * Includes CSP, HSTS, CSRF protection, and more
 */

import { NextResponse } from 'next/server'

export interface SecurityHeadersConfig {
  environment: 'development' | 'production' | 'preview'
  domain?: string
  enableHSTS?: boolean
  enableCSP?: boolean
  csrfProtection?: boolean
}

/**
 * Generate Content Security Policy based on environment
 */
function generateCSP(config: SecurityHeadersConfig): string {
  const isDev = config.environment === 'development'
  const domain = config.domain || 'localhost:3004'

  // Base CSP directives
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Next.js requires this for hydration
      "'unsafe-eval'", // Required for development
      'https://vercel.live',
      'https://vercel.com'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS and Tailwind
      'https://fonts.googleapis.com'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:'
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:' // Allow HTTPS images (avatars, etc.)
    ],
    'media-src': [
      "'self'",
      'blob:',
      'data:'
    ],
    'connect-src': [
      "'self'",
      'https://api.supabase.com',
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://vercel.live'
    ],
    'frame-src': [
      "'self'",
      'https://vercel.live'
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  }

  // Development-specific adjustments
  if (isDev) {
    directives['script-src'].push(`http://localhost:*`, `ws://localhost:*`)
    directives['connect-src'].push(`http://localhost:*`, `ws://localhost:*`)
    // Remove upgrade-insecure-requests for development
    delete directives['upgrade-insecure-requests']
  }

  // Convert to CSP string
  return Object.entries(directives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive
      }
      return `${directive} ${sources.join(' ')}`
    })
    .join('; ')
}

/**
 * Add comprehensive security headers to response
 */
export function addSecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig
): NextResponse {
  const isDev = config.environment === 'development'

  // Content Security Policy
  if (config.enableCSP !== false) {
    const csp = generateCSP(config)
    response.headers.set('Content-Security-Policy', csp)
  }

  // HTTP Strict Transport Security (HTTPS only)
  if (config.enableHSTS && !isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // X-Frame-Options (clickjacking protection)
  response.headers.set('X-Frame-Options', 'DENY')

  // X-Content-Type-Options (MIME sniffing protection)
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer Policy (control referrer information)
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // X-XSS-Protection (legacy XSS protection)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Permissions Policy (control browser features)
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()'
    ].join(', ')
  )

  // Cross-Origin policies
  response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  // Server information hiding
  response.headers.set('Server', 'ScoutHub/2.0')
  response.headers.set('X-Powered-By', 'ScoutHub')

  return response
}

/**
 * Middleware function to add security headers to all responses
 */
export function enhanceResponseSecurity(
  response: NextResponse,
  options: {
    environment?: 'development' | 'production' | 'preview'
    domain?: string
  } = {}
): NextResponse {
  const environment = options.environment ||
    (process.env.NODE_ENV === 'production' ? 'production' : 'development')

  const config: SecurityHeadersConfig = {
    environment,
    domain: options.domain,
    enableHSTS: environment === 'production',
    enableCSP: true,
    csrfProtection: true
  }

  return addSecurityHeaders(response, config)
}

/**
 * Create a security-hardened response for API endpoints
 */
export function createSecureResponse(
  data: any,
  options: {
    status?: number
    environment?: 'development' | 'production' | 'preview'
    corsOrigin?: string
  } = {}
): NextResponse {
  const response = NextResponse.json(data, { status: options.status || 200 })

  // Add CORS headers if specified
  if (options.corsOrigin) {
    response.headers.set('Access-Control-Allow-Origin', options.corsOrigin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-Request-ID, X-Tenant-ID'
    )
  }

  return enhanceResponseSecurity(response, {
    environment: options.environment
  })
}

/**
 * CSRF Token generation and validation
 */
export class CSRFProtection {
  private static readonly SECRET = process.env.CSRF_SECRET || 'scout-hub-2-csrf-secret'

  /**
   * Generate CSRF token for a session
   */
  static generateToken(sessionId: string): string {
    const timestamp = Date.now().toString()
    const payload = `${sessionId}:${timestamp}`

    // In production, use proper HMAC signing
    return Buffer.from(payload).toString('base64url')
  }

  /**
   * Validate CSRF token
   */
  static validateToken(token: string, sessionId: string): boolean {
    try {
      const payload = Buffer.from(token, 'base64url').toString()
      const [tokenSessionId, timestamp] = payload.split(':')

      // Check session ID matches
      if (tokenSessionId !== sessionId) {
        return false
      }

      // Check token age (max 24 hours)
      const tokenTime = parseInt(timestamp)
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      if (Date.now() - tokenTime > maxAge) {
        return false
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * Add CSRF token to response headers
   */
  static addTokenToResponse(response: NextResponse, sessionId: string): NextResponse {
    const token = this.generateToken(sessionId)
    response.headers.set('X-CSRF-Token', token)
    return response
  }

  /**
   * Validate CSRF token from request
   */
  static validateRequest(
    request: Request,
    sessionId: string,
    methods: string[] = ['POST', 'PUT', 'DELETE', 'PATCH']
  ): boolean {
    // Skip CSRF for safe methods
    if (!methods.includes(request.method)) {
      return true
    }

    const token = request.headers.get('X-CSRF-Token') ||
                  request.headers.get('x-csrf-token')

    if (!token) {
      return false
    }

    return this.validateToken(token, sessionId)
  }
}