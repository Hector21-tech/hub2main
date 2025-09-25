import { NextRequest, NextResponse } from 'next/server'
import { Logger, createLogContext } from '@/lib/logger'

/**
 * 🛡️ Enterprise Debug Protection
 *
 * Blocks access to debug/admin endpoints in production environments
 * Prevents accidental exposure of internal debugging tools
 */

// Debug endpoints that should be blocked in production
const DEBUG_ENDPOINTS = new Set([
  '/api/debug',
  '/api/test-db',
  '/api/test-crud',
  '/api/hello',
  '/api/migrate',
  '/api/migrate-avatars',
  '/api/setup-storage',
  '/api/clean-avatars',
  '/api/fix-enums',
  '/api/setup-test-auth',
  '/api/setup-rls-auth',
  '/api/setup-user-data',
  '/api/setup-rls',
  '/api/test-window-data',
  '/api/clear-test-data',
  '/api/setup-elite-sports',
  '/api/db-monitor/test',
  '/api/media/setup-storage'
])

// Admin endpoints that require special authorization
const ADMIN_ENDPOINTS = new Set([
  '/api/db-monitor',
  '/api/health',
  '/api/security/rls-audit',
  '/api/security/shakedown'
])

export function isDebugEndpoint(pathname: string): boolean {
  return DEBUG_ENDPOINTS.has(pathname)
}

export function isAdminEndpoint(pathname: string): boolean {
  return ADMIN_ENDPOINTS.has(pathname)
}

export function shouldBlockEndpoint(pathname: string): boolean {
  const isProd = process.env.NODE_ENV === 'production'
  const isVercelProd = process.env.VERCEL_ENV === 'production'

  return (isProd || isVercelProd) && isDebugEndpoint(pathname)
}

/**
 * Middleware function to protect debug endpoints
 * Should be called early in middleware chain
 */
export function protectDebugEndpoints(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl

  if (shouldBlockEndpoint(pathname)) {
    const context = createLogContext(request)

    Logger.security('Debug endpoint access blocked in production', {
      ...context,
      status: 404,
      details: {
        endpoint: pathname,
        environment: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        reason: 'debug_endpoint_in_production'
      }
    })

    // Return 404 to mask existence of debug endpoints
    return NextResponse.json(
      {
        success: false,
        error: 'Not Found',
        meta: { reason: 'not_found' }
      },
      { status: 404 }
    )
  }

  return null // Continue processing
}

/**
 * Utility to check if current environment should expose debug endpoints
 */
export function isDebugEnvironment(): boolean {
  const isDev = process.env.NODE_ENV === 'development'
  const isPreview = process.env.VERCEL_ENV === 'preview'
  const isLocal = process.env.NODE_ENV !== 'production' && !process.env.VERCEL_ENV

  return isDev || isPreview || isLocal
}

/**
 * Helper to add debug environment warning headers
 */
export function addDebugWarningHeaders(response: NextResponse): NextResponse {
  if (isDebugEnvironment()) {
    response.headers.set('X-Debug-Environment', 'true')
    response.headers.set('X-Environment-Warning', 'Debug endpoints available')
  }

  return response
}