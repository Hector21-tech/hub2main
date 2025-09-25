/**
 * Security Headers Utility for Scout Hub 2
 * Adds essential security headers to API responses
 */

import { NextResponse } from 'next/server'

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // X-Frame-Options: Prevents clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY')

  // X-Content-Type-Options: Prevents MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // X-XSS-Protection: Enables XSS filtering
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Strict-Transport-Security: Enforces HTTPS
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  // Content-Security-Policy: Prevents various injection attacks
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;"
  )

  // Referrer-Policy: Controls referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions-Policy: Controls browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  return response
}

export function createSecureResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status })
  return addSecurityHeaders(response)
}

export function createSecureErrorResponse(error: string, status: number = 500): NextResponse {
  const response = NextResponse.json({ success: false, error }, { status })
  return addSecurityHeaders(response)
}