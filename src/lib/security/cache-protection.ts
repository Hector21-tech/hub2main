import { NextResponse } from 'next/server'

/**
 * 🛡️ Enterprise Cache Protection
 *
 * Prevents cross-tenant data leakage through browser/CDN caching
 * Essential for multi-tenant security compliance
 */

/**
 * Add secure caching headers to prevent cross-tenant data leakage
 *
 * @param response - NextResponse to enhance
 * @param options - Cache configuration options
 */
export function addSecureCacheHeaders(
  response: NextResponse,
  options: {
    tenantDependent?: boolean
    userDependent?: boolean
    cacheable?: boolean
    maxAge?: number
  } = {}
): NextResponse {
  const {
    tenantDependent = true,
    userDependent = true,
    cacheable = false,
    maxAge = 0
  } = options

  // Always mark tenant-dependent responses as private
  if (tenantDependent || userDependent) {
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  } else if (cacheable && maxAge > 0) {
    response.headers.set('Cache-Control', `public, max-age=${maxAge}`)
  } else {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  }

  // Add Vary header for tenant isolation
  const varyHeaders = []

  if (tenantDependent) {
    varyHeaders.push('Authorization', 'Cookie', 'X-Tenant-ID')
  }

  if (userDependent) {
    varyHeaders.push('Authorization', 'Cookie')
  }

  // Always vary by request ID for correlation
  varyHeaders.push('X-Request-ID')

  if (varyHeaders.length > 0) {
    const uniqueHeaders = Array.from(new Set(varyHeaders))
    response.headers.set('Vary', uniqueHeaders.join(', '))
  }

  return response
}

/**
 * Create a secure response with proper cache headers
 * For API endpoints that return tenant-specific data
 */
export function createSecureApiResponse(
  data: any,
  options: {
    status?: number
    tenantDependent?: boolean
    userDependent?: boolean
    requestId?: string
  } = {}
) {
  const response = NextResponse.json(data, { status: options.status || 200 })

  // Add request ID if provided
  if (options.requestId) {
    response.headers.set('X-Request-ID', options.requestId)
  }

  return addSecureCacheHeaders(response, {
    tenantDependent: options.tenantDependent ?? true,
    userDependent: options.userDependent ?? true,
    cacheable: false
  })
}

/**
 * Create a secure error response with cache protection
 */
export function createSecureErrorResponse(
  error: { message: string; status?: number },
  options: {
    requestId?: string
    maskError?: boolean
  } = {}
) {
  const { message, status = 500 } = error
  const { requestId, maskError = false } = options

  const responseData = {
    success: false,
    error: maskError ? 'An error occurred' : message,
    ...(requestId && { requestId })
  }

  const response = NextResponse.json(responseData, { status })

  if (requestId) {
    response.headers.set('X-Request-ID', requestId)
  }

  return addSecureCacheHeaders(response, {
    tenantDependent: true,
    userDependent: true,
    cacheable: false
  })
}

/**
 * Add security headers for file downloads (PDFs, exports)
 * Prevents caching of sensitive documents
 */
export function addFileDownloadHeaders(
  response: NextResponse,
  options: {
    filename?: string
    contentType?: string
    requestId?: string
  } = {}
): NextResponse {
  const { filename, contentType = 'application/octet-stream', requestId } = options

  // Prevent caching of sensitive files
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  // Content disposition
  if (filename) {
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`)
  }

  // Content type
  response.headers.set('Content-Type', contentType)

  // Vary headers for tenant isolation
  response.headers.set('Vary', 'Authorization, Cookie, X-Tenant-ID, X-Request-ID')

  // Request correlation
  if (requestId) {
    response.headers.set('X-Request-ID', requestId)
  }

  return response
}