/**
 * 📊 DATABASE MONITORING DASHBOARD API
 *
 * Real-time endpoint för database security monitoring och tenant isolation analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateTenantAccess } from '@/lib/supabase/server'
import { generateSecurityReport, exportSecurityAudit } from '@/lib/db-monitor/tenant-analyzer'
import { getQueryLogs, getQueryStats } from '@/lib/db-monitor/query-interceptor'
import { generateSchemaMap, validateSchemaConsistency } from '@/lib/db-monitor/schema-mapper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - Database monitoring dashboard data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const reportType = searchParams.get('type') || 'summary'

    // For tenant-specific reports, validate access
    if (tenantId) {
      try {
        await validateTenantAccess(tenantId)
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access to tenant data' },
          { status: 401 }
        )
      }
    }

    switch (reportType) {
      case 'summary':
        return handleSummaryReport(tenantId || undefined)

      case 'security':
        return handleSecurityReport(tenantId || undefined)

      case 'schema':
        return handleSchemaReport()

      case 'logs':
        return handleLogsReport(request, tenantId || undefined)

      case 'stats':
        return handleStatsReport(tenantId || undefined)

      case 'export':
        return handleExportReport(tenantId || undefined)

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Database monitoring error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate monitoring report' },
      { status: 500 }
    )
  }
}

/**
 * Summary dashboard with key metrics
 */
async function handleSummaryReport(tenantId?: string) {
  const stats = getQueryStats(tenantId)
  const securityReport = generateSecurityReport(tenantId)
  const schemaMap = generateSchemaMap()

  const summary = {
    timestamp: new Date().toISOString(),
    tenantId,
    overview: {
      totalQueries: stats.totalQueries,
      averageDuration: Math.round(stats.averageDuration * 100) / 100,
      securityCompliance: securityReport.summary.compliance,
      criticalIssues: securityReport.summary.criticalIssues,
      highRiskIssues: securityReport.summary.highRiskIssues
    },
    schema: {
      totalTables: schemaMap.summary.totalTables,
      tenantAwareTables: schemaMap.summary.tenantAwareCount,
      tenantAgnosticTables: schemaMap.summary.tenantAgnosticCount
    },
    security: {
      riskDistribution: stats.byRiskLevel,
      recentViolations: securityReport.violations.slice(0, 5)
    },
    performance: {
      queryDistribution: stats.byModel,
      averageDuration: stats.averageDuration
    }
  }

  return NextResponse.json({
    success: true,
    data: summary
  })
}

/**
 * Detailed security report
 */
async function handleSecurityReport(tenantId?: string) {
  const securityReport = generateSecurityReport(tenantId)

  return NextResponse.json({
    success: true,
    data: securityReport
  })
}

/**
 * Database schema analysis
 */
async function handleSchemaReport() {
  const schemaMap = generateSchemaMap()
  const schemaValidation = validateSchemaConsistency()

  return NextResponse.json({
    success: true,
    data: {
      schema: schemaMap,
      validation: schemaValidation,
      generatedAt: new Date().toISOString()
    }
  })
}

/**
 * Query logs with filtering
 */
async function handleLogsReport(request: NextRequest, tenantId?: string) {
  const { searchParams } = new URL(request.url)

  const filters = {
    tenantId,
    riskLevel: searchParams.get('riskLevel') as any,
    model: searchParams.get('model') || undefined,
    limit: parseInt(searchParams.get('limit') || '50')
  }

  const logs = getQueryLogs(filters)

  return NextResponse.json({
    success: true,
    data: {
      logs,
      total: logs.length,
      filters: filters
    }
  })
}

/**
 * Query statistics
 */
async function handleStatsReport(tenantId?: string) {
  const stats = getQueryStats(tenantId)

  return NextResponse.json({
    success: true,
    data: {
      stats,
      generatedAt: new Date().toISOString(),
      tenantId
    }
  })
}

/**
 * Export security audit
 */
async function handleExportReport(tenantId?: string) {
  const auditExport = exportSecurityAudit(tenantId)

  return NextResponse.json({
    success: true,
    data: auditExport
  })
}

// POST - Trigger security scan or clear logs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, tenantId } = body

    // Validate tenant access if specified
    if (tenantId) {
      try {
        await validateTenantAccess(tenantId)
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access to tenant data' },
          { status: 401 }
        )
      }
    }

    switch (action) {
      case 'scan':
        return handleSecurityScan(tenantId)

      case 'clear-logs':
        return handleClearLogs()

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Database monitoring action error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to execute monitoring action' },
      { status: 500 }
    )
  }
}

/**
 * Trigger immediate security scan
 */
async function handleSecurityScan(tenantId?: string) {
  const securityReport = generateSecurityReport(tenantId)

  // Log scan results
  console.log(`🔍 Security scan completed for ${tenantId || 'all tenants'}:`)
  console.log(`- Total queries: ${securityReport.summary.totalQueries}`)
  console.log(`- Security violations: ${securityReport.summary.securityViolations}`)
  console.log(`- Compliance: ${securityReport.summary.compliance}%`)

  return NextResponse.json({
    success: true,
    data: {
      message: 'Security scan completed',
      report: securityReport,
      scanTime: new Date().toISOString()
    }
  })
}

/**
 * Clear query logs (admin only)
 */
async function handleClearLogs() {
  // In a real implementation, this would require admin privileges
  const { clearQueryLogs } = await import('@/lib/db-monitor/query-interceptor')
  clearQueryLogs()

  return NextResponse.json({
    success: true,
    data: {
      message: 'Query logs cleared successfully',
      clearedAt: new Date().toISOString()
    }
  })
}