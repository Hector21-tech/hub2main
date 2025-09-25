/**
 * 🛡️ Enterprise RLS Security Audit
 *
 * Validates Row Level Security policies for multi-tenant isolation
 * Prevents cross-tenant data access and enumeration attacks
 */

import { createClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/logger'

export interface RLSAuditResult {
  table: string
  hasRLS: boolean
  policies: Array<{
    name: string
    command: string
    roles: string[]
    definition: string
  }>
  tenantColumnExists: boolean
  issues: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface RLSAuditReport {
  timestamp: Date
  overallStatus: 'secure' | 'warnings' | 'critical'
  tables: RLSAuditResult[]
  summary: {
    totalTables: number
    securedTables: number
    criticalIssues: number
    recommendations: string[]
  }
}

/**
 * Core tables that MUST have tenant isolation
 */
const TENANT_TABLES = [
  'players',
  'requests',
  'trials',
  'calendar_events',
  'tenant_memberships'
]

/**
 * Check if a table has proper RLS policies enabled
 */
async function auditTableRLS(tableName: string): Promise<RLSAuditResult> {
  const supabase = createClient()
  const issues: string[] = []
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'

  try {
    // Check if RLS is enabled
    const { data: rlsStatus } = await supabase
      .from('pg_tables')
      .select('*')
      .eq('tablename', tableName)
      .single()

    // Get RLS policies
    const { data: policies } = await supabase.rpc('get_table_policies', {
      table_name: tableName
    })

    // Check for tenant column
    const { data: columns } = await supabase.rpc('get_table_columns', {
      table_name: tableName
    })

    const hasTenantColumn = columns?.some((col: any) =>
      col.column_name === 'tenantId' || col.column_name === 'tenant_id'
    )

    const hasRLS = rlsStatus?.rowsecurity === true
    const tenantColumnExists = hasTenantColumn || false

    // Analyze issues
    if (TENANT_TABLES.includes(tableName)) {
      if (!hasRLS) {
        issues.push('RLS not enabled on tenant-sensitive table')
        severity = 'critical'
      }

      if (!tenantColumnExists) {
        issues.push('Missing tenant isolation column')
        severity = 'critical'
      }

      if (!policies || policies.length === 0) {
        issues.push('No RLS policies defined')
        severity = 'critical'
      } else {
        // Check if policies reference tenant isolation
        const tenantPolicies = policies.filter((policy: any) =>
          policy.definition?.includes('tenantId') ||
          policy.definition?.includes('tenant_id')
        )

        if (tenantPolicies.length === 0) {
          issues.push('RLS policies do not enforce tenant isolation')
          severity = 'critical'
        }

        // Check for auth.uid() enforcement
        const authPolicies = policies.filter((policy: any) =>
          policy.definition?.includes('auth.uid()')
        )

        if (authPolicies.length === 0) {
          issues.push('RLS policies do not enforce user authentication')
          severity = 'high'
        }
      }
    }

    return {
      table: tableName,
      hasRLS,
      policies: policies || [],
      tenantColumnExists,
      issues,
      severity
    }

  } catch (error) {
    return {
      table: tableName,
      hasRLS: false,
      policies: [],
      tenantColumnExists: false,
      issues: [`Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      severity: 'critical'
    }
  }
}

/**
 * Run comprehensive RLS audit across all tenant tables
 */
export async function runRLSAudit(): Promise<RLSAuditReport> {
  const timestamp = new Date()
  const auditResults: RLSAuditResult[] = []

  Logger.info('Starting RLS security audit', {
    path: '/audit/rls',
    method: 'INTERNAL',
    status: 200,
    details: { tables: TENANT_TABLES }
  })

  // Audit each tenant table
  for (const table of TENANT_TABLES) {
    const result = await auditTableRLS(table)
    auditResults.push(result)

    if (result.severity === 'critical') {
      Logger.security(`Critical RLS issue found in table ${table}`, {
        path: '/audit/rls',
        method: 'INTERNAL',
        status: 500,
        details: { table, issues: result.issues }
      })
    }
  }

  // Generate summary
  const criticalIssues = auditResults.filter(r => r.severity === 'critical').length
  const securedTables = auditResults.filter(r => r.issues.length === 0).length

  let overallStatus: 'secure' | 'warnings' | 'critical' = 'secure'
  if (criticalIssues > 0) {
    overallStatus = 'critical'
  } else if (auditResults.some(r => r.issues.length > 0)) {
    overallStatus = 'warnings'
  }

  const recommendations: string[] = []
  if (criticalIssues > 0) {
    recommendations.push('Immediately enable RLS on all tenant tables')
    recommendations.push('Add tenant isolation columns where missing')
    recommendations.push('Create RLS policies that enforce both tenant and user isolation')
  }

  const report: RLSAuditReport = {
    timestamp,
    overallStatus,
    tables: auditResults,
    summary: {
      totalTables: TENANT_TABLES.length,
      securedTables,
      criticalIssues,
      recommendations
    }
  }

  Logger.info('RLS audit completed', {
    path: '/audit/rls',
    method: 'INTERNAL',
    status: 200,
    details: {
      overallStatus,
      criticalIssues,
      securedTables: `${securedTables}/${TENANT_TABLES.length}`
    }
  })

  return report
}

/**
 * Test cross-tenant access prevention
 * Attempts to access data from different tenants to verify isolation
 */
export async function testCrossTenantPrevention(
  userTenantId: string,
  otherTenantId: string
): Promise<{
  prevented: boolean
  attemptedAccess: Array<{
    table: string
    success: boolean
    error?: string
  }>
}> {
  const supabase = createClient()
  const attemptedAccess: Array<{ table: string; success: boolean; error?: string }> = []

  // Test each tenant table
  for (const table of TENANT_TABLES) {
    try {
      // Attempt to access data from another tenant
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('tenantId', otherTenantId)
        .limit(1)

      attemptedAccess.push({
        table,
        success: !error && data && data.length > 0,
        error: error?.message
      })

    } catch (error) {
      attemptedAccess.push({
        table,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const prevented = attemptedAccess.every(attempt => !attempt.success)

  return {
    prevented,
    attemptedAccess
  }
}

/**
 * Validate that 404 responses are returned for cross-tenant resource enumeration
 */
export async function testEnumerationPrevention(): Promise<{
  secure: boolean
  tests: Array<{
    endpoint: string
    expectedStatus: number
    actualStatus: number
    secure: boolean
  }>
}> {
  // Test enumeration prevention by trying to access resources with invalid tenant IDs
  const tests = [
    { endpoint: '/api/players?tenant=nonexistent', expectedStatus: 404 },
    { endpoint: '/api/requests?tenant=invalid-tenant', expectedStatus: 404 },
    { endpoint: '/api/trials?tenant=../../../etc/passwd', expectedStatus: 404 }
  ]

  const results = []

  for (const test of tests) {
    try {
      const response = await fetch(`http://localhost:3004${test.endpoint}`)
      const actualStatus = response.status

      results.push({
        ...test,
        actualStatus,
        secure: actualStatus === test.expectedStatus
      })

    } catch (error) {
      results.push({
        ...test,
        actualStatus: 500,
        secure: false
      })
    }
  }

  return {
    secure: results.every(r => r.secure),
    tests: results
  }
}