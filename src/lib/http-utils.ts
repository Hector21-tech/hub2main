import { NextResponse } from 'next/server'
import { TenantValidationError } from './supabase/tenant-validation'
import { addSecureCacheHeaders } from './security/cache-protection'

/**
 * Creates standardized HTTP responses with correct status codes
 * Enterprise-tight security semantics:
 * - 400: Bad Request (invalid input, validation errors)
 * - 401: Not authenticated (session missing/invalid)
 * - 403: Authenticated but forbidden (not member/insufficient role)
 * - 404: Resource not found (masks existence for security)
 * - 409: Conflict (resource conflicts, duplicates)
 * - 422: Unprocessable Entity (business rule violations)
 * - 429: Too Many Requests (rate limiting)
 * - 500: Internal Server Error (unexpected errors)
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: Record<string, any>
}

/**
 * Standard API error codes for consistent error handling
 */
export const API_ERROR_CODES = {
  // 400 - Bad Request
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // 401 - Unauthorized
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // 403 - Forbidden
  ACCESS_DENIED: 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  TENANT_ACCESS_DENIED: 'TENANT_ACCESS_DENIED',

  // 404 - Not Found
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',

  // 409 - Conflict
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',

  // 422 - Unprocessable Entity
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',

  // 429 - Too Many Requests
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 500 - Internal Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR'
} as const

export function createErrorResponse(error: TenantValidationError) {
  const response = NextResponse.json(
    {
      success: false,
      error: error.message,
      meta: { reason: error.reason }
    },
    { status: error.httpStatus }
  )

  return addSecureCacheHeaders(response, {
    tenantDependent: true,
    userDependent: true,
    cacheable: false
  })
}

export function createStandardResponse(data: any, status: 200 | 201 = 200, message?: string) {
  const responseData: any = {
    success: true,
    data
  }

  if (message) {
    responseData.message = message
  }

  const response = NextResponse.json(responseData, { status })

  return addSecureCacheHeaders(response, {
    tenantDependent: true,
    userDependent: true,
    cacheable: false
  })
}

export function createResourceNotFoundResponse(resourceType: string, id: string) {
  // 404 to mask existence of cross-tenant resources (prevents enumeration)
  const response = NextResponse.json(
    {
      success: false,
      error: `${resourceType} not found`,
      meta: { reason: 'not_found' }
    },
    { status: 404 }
  )

  return addSecureCacheHeaders(response, {
    tenantDependent: true,
    userDependent: true,
    cacheable: false
  })
}

export function createServerErrorResponse(message: string = 'Internal server error') {
  const response = NextResponse.json(
    {
      success: false,
      error: message
    },
    { status: 500 }
  )

  return addSecureCacheHeaders(response, {
    tenantDependent: true,
    userDependent: true,
    cacheable: false
  })
}

/**
 * Create a 400 Bad Request response
 */
export function createBadRequestResponse(
  message: string,
  details?: Record<string, any>
): NextResponse {
  const response = NextResponse.json({
    success: false,
    error: message,
    ...(details && { details })
  }, { status: 400 })

  return addSecureCacheHeaders(response, {
    tenantDependent: true,
    userDependent: true,
    cacheable: false
  })
}

/**
 * Create a 409 Conflict response
 */
export function createConflictResponse(
  message: string,
  details?: Record<string, any>
): NextResponse {
  const response = NextResponse.json({
    success: false,
    error: message,
    ...(details && { details })
  }, { status: 409 })

  return addSecureCacheHeaders(response, {
    tenantDependent: true,
    userDependent: true,
    cacheable: false
  })
}

/**
 * Create a 422 Unprocessable Entity response
 */
export function createValidationErrorResponse(
  message: string,
  details?: Record<string, any>
): NextResponse {
  const response = NextResponse.json({
    success: false,
    error: message,
    ...(details && { details })
  }, { status: 422 })

  return addSecureCacheHeaders(response, {
    tenantDependent: true,
    userDependent: true,
    cacheable: false
  })
}

/**
 * Validate required parameters and return error if missing
 */
export function validateRequiredParams(
  params: Record<string, any>,
  required: string[]
): NextResponse | null {
  const missing = required.filter(key => !params[key])

  if (missing.length > 0) {
    return createBadRequestResponse(
      `Missing required parameters: ${missing.join(', ')}`,
      { missingParams: missing }
    )
  }

  return null
}

/**
 * Validate date range and return error if invalid
 */
export function validateDateRange(
  startTime: string | Date,
  endTime: string | Date
): NextResponse | null {
  const start = new Date(startTime)
  const end = new Date(endTime)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return createBadRequestResponse('Invalid date format')
  }

  if (start >= end) {
    return createBadRequestResponse('End time must be after start time')
  }

  return null
}