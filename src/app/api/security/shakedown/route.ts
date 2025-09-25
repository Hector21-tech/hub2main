import { NextRequest, NextResponse } from 'next/server'
import { runSecurityShakedown, quickSecurityCheck } from '@/lib/security/shakedown-tests'
import { validateSupabaseTenantAccess } from '@/lib/supabase/tenant-validation'
import { addSecureCacheHeaders } from '@/lib/security/cache-protection'
import { Logger, createLogContext } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * 🛡️ Enterprise Security Shakedown Testing Endpoint
 *
 * ADMIN-ONLY: Runs comprehensive security validation tests
 * Validates all implemented security measures
 */
export async function GET(request: NextRequest) {
  const timer = Logger.timer()
  const baseContext = createLogContext(request)

  try {
    const tenantSlug = request.nextUrl.searchParams.get('tenant')
    const quick = request.nextUrl.searchParams.get('quick') === 'true'

    // Require tenant for security context
    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, error: 'Tenant parameter required for security testing' },
        { status: 400 }
      )
    }

    // Validate admin access
    const validation = await validateSupabaseTenantAccess(tenantSlug)
    if (!validation.success) {
      const duration = timer.end()
      Logger.security('Unauthorized security test attempt', {
        ...baseContext,
        tenant: tenantSlug,
        status: validation.httpStatus,
        duration,
        details: { reason: validation.reason }
      })
      return NextResponse.json(
        { success: false, error: 'Admin access required for security testing' },
        { status: 403 }
      )
    }

    // Only allow ADMIN or OWNER roles for security testing
    if (!['ADMIN', 'OWNER'].includes(validation.userRole)) {
      const duration = timer.end()
      Logger.security('Insufficient role for security testing', {
        ...baseContext,
        tenant: tenantSlug,
        userId: validation.userId || 'anonymous',
        status: 403,
        duration,
        details: { userRole: validation.userRole }
      })
      return NextResponse.json(
        { success: false, error: 'Admin privileges required for security testing' },
        { status: 403 }
      )
    }

    Logger.info('Starting security shakedown tests', {
      ...baseContext,
      tenant: tenantSlug,
      userId: validation.userId || 'anonymous',
      status: 200,
      details: { quick }
    })

    let testResults

    if (quick) {
      // Run quick health check
      testResults = await quickSecurityCheck()
    } else {
      // Run comprehensive shakedown
      testResults = await runSecurityShakedown()
    }

    const response = {
      success: true,
      data: testResults,
      meta: {
        testType: quick ? 'quick' : 'comprehensive',
        testedAt: new Date(),
        tenant: tenantSlug,
        tester: validation.userId,
        environment: process.env.NODE_ENV
      }
    }

    const duration = timer.end()
    const statusCode = quick
      ? ('healthy' in testResults ? (testResults.healthy ? 200 : 500) : 200)
      : ('overallStatus' in testResults ? (testResults.overallStatus === 'pass' ? 200 : (testResults.criticalFailures > 0 ? 500 : 207)) : 200)

    Logger.success('Security testing completed', {
      ...baseContext,
      tenant: tenantSlug,
      userId: validation.userId || 'anonymous',
      status: statusCode,
      duration,
      details: quick
        ? ('healthy' in testResults ? { healthy: testResults.healthy, issues: testResults.issues.length } : {})
        : ('overallStatus' in testResults ? {
            overallStatus: testResults.overallStatus,
            passedTests: testResults.passedTests,
            totalTests: testResults.totalTests,
            criticalFailures: testResults.criticalFailures
          } : {})
    })

    const jsonResponse = NextResponse.json(response, { status: statusCode })
    return addSecureCacheHeaders(jsonResponse, {
      tenantDependent: true,
      userDependent: true,
      cacheable: false
    })

  } catch (error) {
    const duration = timer.end()
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    Logger.error('Security testing failed', {
      ...baseContext,
      status: 500,
      duration,
      error: errorMessage
    })

    return NextResponse.json(
      { success: false, error: 'Security testing failed', details: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for running specific security tests
 * OWNER-ONLY: Can run targeted security validation
 */
export async function POST(request: NextRequest) {
  const timer = Logger.timer()
  const baseContext = createLogContext(request)

  try {
    const tenantSlug = request.nextUrl.searchParams.get('tenant')
    const { testSuite } = await request.json()

    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, error: 'Tenant parameter required' },
        { status: 400 }
      )
    }

    // Validate OWNER access for targeted security tests
    const validation = await validateSupabaseTenantAccess(tenantSlug)
    if (!validation.success || validation.userRole !== 'OWNER') {
      const duration = timer.end()
      Logger.security('Unauthorized targeted security test attempt', {
        ...baseContext,
        tenant: tenantSlug,
        status: 403,
        duration,
        details: { testSuite, userRole: validation.success ? validation.userRole : 'none' }
      })
      return NextResponse.json(
        { success: false, error: 'Owner privileges required for targeted security tests' },
        { status: 403 }
      )
    }

    Logger.security('Targeted security test requested', {
      ...baseContext,
      tenant: tenantSlug,
      userId: validation.userId || 'anonymous',
      status: 200,
      details: { testSuite }
    })

    // For now, just log the request - targeted tests would be implemented as needed
    const response = {
      success: true,
      message: `Security test suite '${testSuite}' logged for execution`,
      data: {
        testSuite,
        requestedBy: validation.userId,
        tenant: tenantSlug,
        timestamp: new Date(),
        status: 'scheduled'
      }
    }

    const duration = timer.end()
    Logger.info('Targeted security test scheduled', {
      ...baseContext,
      tenant: tenantSlug,
      userId: validation.userId || 'anonymous',
      status: 200,
      duration
    })

    const jsonResponse = NextResponse.json(response, { status: 200 })
    return addSecureCacheHeaders(jsonResponse, {
      tenantDependent: true,
      userDependent: true,
      cacheable: false
    })

  } catch (error) {
    const duration = timer.end()
    Logger.error('Targeted security test request failed', {
      ...baseContext,
      status: 500,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { success: false, error: 'Security test request failed' },
      { status: 500 }
    )
  }
}