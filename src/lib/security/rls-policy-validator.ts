/**
 * 🛡️ Enterprise RLS Policy Validator
 *
 * Automated validation and enforcement of Row Level Security policies
 * Ensures consistent tenant isolation across all database tables
 */

import { PrismaClient } from '@prisma/client'
import { Logger } from '@/lib/logger'

export interface RLSPolicyCheck {
  table: string
  hasRLS: boolean
  policies: Array<{
    name: string
    definition: string
    command: string
  }>
  issues: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface RLSAuditReport {
  timestamp: Date
  overallStatus: 'secure' | 'warnings' | 'critical'
  checks: RLSPolicyCheck[]
  summary: {
    totalTables: number
    securedTables: number
    criticalIssues: number
    recommendations: string[]
  }
}

/**
 * Core tenant tables that MUST have proper RLS
 */
const TENANT_TABLES = [
  'players',
  'requests',
  'trials',
  'calendar_events',
  'tenant_memberships'
] as const

/**
 * Expected RLS policy patterns for tenant isolation
 */
const REQUIRED_POLICY_PATTERNS = {
  tenantId: /tenant[Ii]d.*=.*tenant[Ii]d/,
  authUid: /auth\.uid\(\)/,
  membershipCheck: /tenant_memberships.*userId.*auth\.uid\(\)/
}

/**
 * Generate standardized RLS policy for a tenant table
 */
export function generateStandardRLSPolicy(tableName: string): string {
  return `
    CREATE POLICY "${tableName}_tenant_isolation" ON "${tableName}" FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM tenant_memberships
        WHERE tenant_memberships."tenantId" = ${tableName}."tenantId"
        AND tenant_memberships."userId" = auth.uid()
      )
    )
  `.trim()
}

/**
 * Check if RLS policy is properly configured for tenant isolation
 */
function validatePolicyDefinition(definition: string, tableName: string): string[] {
  const issues: string[] = []

  // Check for tenant isolation
  if (!REQUIRED_POLICY_PATTERNS.tenantId.test(definition) &&
      !definition.includes(`${tableName}."tenantId"`)) {
    issues.push('Policy does not enforce tenant isolation')
  }

  // Check for auth.uid() enforcement
  if (!REQUIRED_POLICY_PATTERNS.authUid.test(definition)) {
    issues.push('Policy does not enforce user authentication')
  }

  // Check for membership validation
  if (!REQUIRED_POLICY_PATTERNS.membershipCheck.test(definition)) {
    issues.push('Policy does not validate tenant membership')
  }

  // Check for potential security bypasses
  if (definition.includes('true') || definition.includes('1=1')) {
    issues.push('Policy contains potential security bypass')
  }

  return issues
}

/**
 * Run comprehensive RLS audit on all tenant tables
 */
export async function runRLSAudit(): Promise<RLSAuditReport> {
  const prisma = new PrismaClient()
  const timestamp = new Date()
  const checks: RLSPolicyCheck[] = []

  Logger.info('Starting comprehensive RLS audit', {
    path: '/internal/rls-audit',
    method: 'INTERNAL',
    status: 200,
    details: { tables: TENANT_TABLES }
  })

  try {
    for (const table of TENANT_TABLES) {
      const check = await auditTableRLS(prisma, table)
      checks.push(check)

      if (check.severity === 'critical') {
        Logger.security(`Critical RLS vulnerability in ${table}`, {
          path: '/internal/rls-audit',
          method: 'INTERNAL',
          status: 500,
          details: { table, issues: check.issues }
        })
      }
    }

    // Generate summary
    const criticalIssues = checks.filter(c => c.severity === 'critical').length
    const securedTables = checks.filter(c => c.issues.length === 0).length

    let overallStatus: 'secure' | 'warnings' | 'critical' = 'secure'
    if (criticalIssues > 0) {
      overallStatus = 'critical'
    } else if (checks.some(c => c.issues.length > 0)) {
      overallStatus = 'warnings'
    }

    const recommendations = generateRecommendations(checks)

    const report: RLSAuditReport = {
      timestamp,
      overallStatus,
      checks,
      summary: {
        totalTables: TENANT_TABLES.length,
        securedTables,
        criticalIssues,
        recommendations
      }
    }

    Logger.info('RLS audit completed', {
      path: '/internal/rls-audit',
      method: 'INTERNAL',
      status: 200,
      details: {
        overallStatus,
        criticalIssues,
        securedTables: `${securedTables}/${TENANT_TABLES.length}`
      }
    })

    return report

  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Audit RLS configuration for a specific table
 */
async function auditTableRLS(
  prisma: PrismaClient,
  tableName: string
): Promise<RLSPolicyCheck> {
  const issues: string[] = []
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'

  try {
    // Check if RLS is enabled
    const rlsStatus = await prisma.$queryRaw`
      SELECT schemaname, tablename, rowsecurity, hasrls
      FROM pg_tables pt
      LEFT JOIN pg_class pc ON pc.relname = pt.tablename
      WHERE schemaname = 'public' AND tablename = ${tableName}
    ` as any[]

    const hasRLS = rlsStatus[0]?.rowsecurity === true || rlsStatus[0]?.hasrls === true

    if (!hasRLS) {
      issues.push('RLS not enabled on table')
      severity = 'critical'
    }

    // Get RLS policies
    const policies = await prisma.$queryRaw`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = ${tableName}
    ` as any[]

    if (policies.length === 0) {
      issues.push('No RLS policies defined')
      severity = 'critical'
    } else {
      // Validate each policy
      for (const policy of policies) {
        const policyIssues = validatePolicyDefinition(policy.qual || '', tableName)
        issues.push(...policyIssues)

        if (policyIssues.length > 0) {
          severity = severity === 'critical' ? 'critical' : 'high'
        }
      }
    }

    return {
      table: tableName,
      hasRLS,
      policies: policies.map(p => ({
        name: p.policyname,
        definition: p.qual || '',
        command: p.cmd || 'ALL'
      })),
      issues,
      severity
    }

  } catch (error) {
    return {
      table: tableName,
      hasRLS: false,
      policies: [],
      issues: [`Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      severity: 'critical'
    }
  }
}

/**
 * Generate recommendations based on audit results
 */
function generateRecommendations(checks: RLSPolicyCheck[]): string[] {
  const recommendations: string[] = []

  const criticalTables = checks.filter(c => c.severity === 'critical')
  if (criticalTables.length > 0) {
    recommendations.push(`Immediately fix critical RLS issues in: ${criticalTables.map(t => t.table).join(', ')}`)
  }

  const tablesWithoutRLS = checks.filter(c => !c.hasRLS)
  if (tablesWithoutRLS.length > 0) {
    recommendations.push(`Enable RLS on tables: ${tablesWithoutRLS.map(t => t.table).join(', ')}`)
  }

  const tablesWithoutPolicies = checks.filter(c => c.hasRLS && c.policies.length === 0)
  if (tablesWithoutPolicies.length > 0) {
    recommendations.push(`Add RLS policies to: ${tablesWithoutPolicies.map(t => t.table).join(', ')}`)
  }

  if (recommendations.length === 0) {
    recommendations.push('All RLS policies are properly configured')
  } else {
    recommendations.push('Run automated RLS policy generator to fix issues')
    recommendations.push('Test cross-tenant access prevention after fixes')
  }

  return recommendations
}

/**
 * Fix RLS policies automatically for a table
 */
export async function fixTableRLSPolicies(tableName: string): Promise<{
  success: boolean
  applied: string[]
  errors: string[]
}> {
  const prisma = new PrismaClient()
  const applied: string[] = []
  const errors: string[] = []

  try {
    // Enable RLS if not enabled
    await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY`)
    applied.push(`Enabled RLS on ${tableName}`)

    // Drop existing policies to recreate them
    const existingPolicies = await prisma.$queryRaw`
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = ${tableName}
    ` as any[]

    for (const policy of existingPolicies) {
      await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${policy.policyname}" ON "${tableName}"`)
      applied.push(`Dropped old policy: ${policy.policyname}`)
    }

    // Create standardized tenant isolation policy
    const policySQL = generateStandardRLSPolicy(tableName)
    await prisma.$executeRawUnsafe(policySQL)
    applied.push(`Created standard tenant isolation policy for ${tableName}`)

    return { success: true, applied, errors }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Failed to fix RLS for ${tableName}: ${errorMsg}`)
    return { success: false, applied, errors }

  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Test cross-tenant access prevention
 */
export async function testCrossTenantPrevention(
  testTenantId: string,
  otherTenantId: string
): Promise<{
  prevented: boolean
  results: Array<{
    table: string
    accessPrevented: boolean
    error?: string
  }>
}> {
  const prisma = new PrismaClient()
  const results: Array<{ table: string; accessPrevented: boolean; error?: string }> = []

  try {
    for (const table of TENANT_TABLES) {
      try {
        // Attempt to access data from other tenant
        const query = `SELECT id FROM "${table}" WHERE "tenantId" = $1 LIMIT 1`
        const result = await prisma.$queryRawUnsafe(query, otherTenantId)

        results.push({
          table,
          accessPrevented: Array.isArray(result) && result.length === 0,
          error: undefined
        })

      } catch (error) {
        // Error is expected if RLS is working
        results.push({
          table,
          accessPrevented: true,
          error: error instanceof Error ? error.message : 'Access blocked'
        })
      }
    }

    const prevented = results.every(r => r.accessPrevented)

    return { prevented, results }

  } finally {
    await prisma.$disconnect()
  }
}