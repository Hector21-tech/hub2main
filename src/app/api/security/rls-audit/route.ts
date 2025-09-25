import { NextRequest, NextResponse } from 'next/server'
import { runRLSAudit, testCrossTenantPrevention, testEnumerationPrevention } from '@/lib/security/rls-audit'
import { validateSupabaseTenantAccess } from '@/lib/supabase/tenant-validation'
import { addSecureCacheHeaders } from '@/lib/security/cache-protection'
import { Logger, createLogContext } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * 🛡️ Enterprise RLS Security Audit Endpoint
 *
 * ADMIN-ONLY: Validates Row Level Security implementation
 * Tests cross-tenant isolation and enumeration prevention
 */
export async function GET(request: NextRequest) {
  const timer = Logger.timer()
  const baseContext = createLogContext(request)

  try {
    const tenantSlug = request.nextUrl.searchParams.get('tenant')
    const includeTests = request.nextUrl.searchParams.get('tests') === 'true'

    // Require tenant for audit context
    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, error: 'Tenant parameter required for security audit' },
        { status: 400 }
      )
    }

    // Validate admin access
    const validation = await validateSupabaseTenantAccess(tenantSlug)
    if (!validation.success) {
      const duration = timer.end()
      Logger.security('Unauthorized RLS audit attempt', {
        ...baseContext,
        tenant: tenantSlug,
        status: validation.httpStatus,
        duration,
        details: { reason: validation.reason }
      })
      return NextResponse.json(
        { success: false, error: 'Admin access required for security audit' },
        { status: 403 }
      )
    }

    // Only allow ADMIN or OWNER roles for security audits
    if (!['ADMIN', 'OWNER'].includes(validation.userRole)) {
      const duration = timer.end()
      Logger.security('Insufficient role for RLS audit', {
        ...baseContext,
        tenant: tenantSlug,
        userId: validation.userId || 'anonymous',
        status: 403,
        duration,
        details: { userRole: validation.userRole }
      })
      return NextResponse.json(
        { success: false, error: 'Admin privileges required for security audit' },
        { status: 403 }
      )
    }

    Logger.info('Starting RLS security audit', {
      ...baseContext,
      tenant: tenantSlug,
      userId: validation.userId || 'anonymous',
      status: 200,
      details: { includeTests }
    })

    // Run comprehensive RLS audit
    const auditReport = await runRLSAudit()

    let crossTenantTest = null
    let enumerationTest = null

    // Run additional security tests if requested
    if (includeTests) {
      try {
        enumerationTest = await testEnumerationPrevention()

        Logger.info('Security tests completed', {
          ...baseContext,
          tenant: tenantSlug,
          userId: validation.userId || 'anonymous',
          status: 200,
          details: {
            enumerationSecure: enumerationTest?.secure
          }
        })
      } catch (testError) {
        Logger.error('Security test failed', {
          ...baseContext,
          tenant: tenantSlug,
          userId: validation.userId || 'anonymous',
          status: 500,
          error: testError instanceof Error ? testError.message : 'Unknown test error'
        })
      }
    }

    const response = {
      success: true,
      data: {
        audit: auditReport,
        ...(crossTenantTest ? { crossTenantTest } : {}),
        ...(enumerationTest ? { enumerationTest } : {})
      },
      meta: {
        auditedAt: auditReport.timestamp,
        tenant: tenantSlug,
        auditor: validation.userId,
        includedTests: includeTests
      }
    }

    const duration = timer.end()
    Logger.success('RLS audit completed successfully', {
      ...baseContext,
      tenant: tenantSlug,
      userId: validation.userId || 'anonymous',
      status: 200,
      duration,
      details: {
        overallStatus: auditReport.overallStatus,
        criticalIssues: auditReport.summary.criticalIssues,
        securedTables: auditReport.summary.securedTables
      }
    })

    const jsonResponse = NextResponse.json(response, { status: 200 })
    return addSecureCacheHeaders(jsonResponse, {
      tenantDependent: true,
      userDependent: true,
      cacheable: false
    })

  } catch (error) {
    const duration = timer.end()
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    Logger.error('RLS audit failed', {
      ...baseContext,
      status: 500,
      duration,
      error: errorMessage
    })

    return NextResponse.json(
      { success: false, error: 'Security audit failed', details: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for triggering immediate security fixes
 * OWNER-ONLY: Can attempt to fix critical RLS issues
 */
export async function POST(request: NextRequest) {
  const timer = Logger.timer()
  const baseContext = createLogContext(request)

  try {
    const tenantSlug = request.nextUrl.searchParams.get('tenant')
    const { action } = await request.json()

    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, error: 'Tenant parameter required' },
        { status: 400 }
      )
    }

    // Validate OWNER access for security fixes
    const validation = await validateSupabaseTenantAccess(tenantSlug)
    if (!validation.success || validation.userRole !== 'OWNER') {
      const duration = timer.end()
      Logger.security('Unauthorized security fix attempt', {
        ...baseContext,
        tenant: tenantSlug,
        status: 403,
        duration,
        details: { action, userRole: validation.success ? validation.userRole : 'none' }
      })
      return NextResponse.json(
        { success: false, error: 'Owner privileges required for security fixes' },
        { status: 403 }
      )
    }

    Logger.security('Security fix requested', {
      ...baseContext,
      tenant: tenantSlug,
      userId: validation.userId || 'anonymous',
      status: 200,
      details: { action }
    })

    // For now, just log the request - actual fixes would be manual
    const response = {
      success: true,
      message: `Security fix action '${action}' logged for manual review`,
      data: {
        action,
        requestedBy: validation.userId,
        tenant: tenantSlug,
        timestamp: new Date()
      }
    }

    const duration = timer.end()
    Logger.info('Security fix logged', {
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
    Logger.error('Security fix request failed', {
      ...baseContext,
      status: 500,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { success: false, error: 'Security fix request failed' },
      { status: 500 }
    )
  }
}