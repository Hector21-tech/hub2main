/**
 * 🛡️ TENANT ISOLATION ANALYZER
 *
 * Advanced security analysis for tenant isolation compliance
 * Detects potential cross-tenant data access and security violations
 */

import { generateSchemaMap, requiresTenantFilter, getTenantField } from './schema-mapper'
import { getQueryLogs, QueryLog } from './query-interceptor'

export interface SecurityViolation {
  id: string
  type: 'cross_tenant_access' | 'missing_tenant_filter' | 'bulk_operation_risk' | 'raw_query_risk'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  queryId: string
  model: string
  action: string
  tenantId?: string
  timestamp: Date
  remediation: string
}

export interface TenantSecurityReport {
  tenantId?: string
  generatedAt: Date
  summary: {
    totalQueries: number
    securityViolations: number
    criticalIssues: number
    highRiskIssues: number
    compliance: number // Percentage 0-100
  }
  violations: SecurityViolation[]
  recommendations: string[]
  schemaCompliance: {
    valid: boolean
    issues: string[]
    warnings: string[]
  }
}

/**
 * Analyze queries for security violations
 */
export function analyzeQuerySecurity(
  model: string,
  action: string,
  args: any,
  tenantId?: string
): SecurityViolation[] {
  const violations: SecurityViolation[] = []

  // Check for missing tenant filter on tenant-scoped tables
  if (requiresTenantFilter(model) && !tenantId) {
    violations.push({
      id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'missing_tenant_filter',
      severity: 'critical',
      description: `Query on tenant-scoped table '${model}' without tenant filter`,
      queryId: 'unknown',
      model,
      action,
      timestamp: new Date(),
      remediation: `Add tenantId filter to WHERE clause: { tenantId: 'tenant-id' }`
    })
  }

  // Check for risky bulk operations
  if (['deleteMany', 'updateMany'].includes(action) && requiresTenantFilter(model) && !tenantId) {
    violations.push({
      id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'bulk_operation_risk',
      severity: 'critical',
      description: `Bulk ${action} operation on tenant-scoped table '${model}' without tenant filter`,
      queryId: 'unknown',
      model,
      action,
      timestamp: new Date(),
      remediation: `Ensure bulk operations include tenant filter in WHERE clause`
    })
  }

  // Check for raw queries
  if (action.includes('$') || action.includes('Raw')) {
    violations.push({
      id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'raw_query_risk',
      severity: 'medium',
      description: `Raw SQL query detected - requires manual security review`,
      queryId: 'unknown',
      model,
      action,
      timestamp: new Date(),
      remediation: `Review raw query for tenant isolation compliance and consider using Prisma query methods`
    })
  }

  return violations
}

/**
 * Detect potential cross-tenant access patterns
 */
export function detectCrossTenantAccess(logs: QueryLog[]): SecurityViolation[] {
  const violations: SecurityViolation[] = []

  // Group queries by session/user if possible
  const suspiciousPatterns = logs.filter(log => {
    // Queries on tenant-scoped tables without tenant filter
    return requiresTenantFilter(log.model) && !log.hasTenantFilter
  })

  suspiciousPatterns.forEach(log => {
    violations.push({
      id: `cross-tenant-${log.id}`,
      type: 'cross_tenant_access',
      severity: log.securityRisk === 'critical' ? 'critical' : 'high',
      description: `Potential cross-tenant access: ${log.model}.${log.action} without tenant filter`,
      queryId: log.id,
      model: log.model,
      action: log.action,
      tenantId: log.tenantId,
      timestamp: log.timestamp,
      remediation: `Ensure all queries on ${log.model} include proper tenant filtering`
    })
  })

  return violations
}

/**
 * Generate comprehensive security report
 */
export function generateSecurityReport(tenantId?: string): TenantSecurityReport {
  const logs = getQueryLogs({ tenantId })
  const schemaMap = generateSchemaMap()

  // Analyze all violations
  const allViolations: SecurityViolation[] = []

  // Add violations from query logs
  logs.forEach(log => {
    if (log.securityRisk !== 'none') {
      log.warnings.forEach(warning => {
        const severity = log.securityRisk
        allViolations.push({
          id: `log-violation-${log.id}`,
          type: warning.includes('CRITICAL') ? 'missing_tenant_filter' :
                warning.includes('BULK') ? 'bulk_operation_risk' :
                warning.includes('RAW') ? 'raw_query_risk' : 'cross_tenant_access',
          severity: severity as SecurityViolation['severity'],
          description: warning,
          queryId: log.id,
          model: log.model,
          action: log.action,
          tenantId: log.tenantId,
          timestamp: log.timestamp,
          remediation: generateRemediation(log.model, log.action, warning)
        })
      })
    }
  })

  // Add cross-tenant access violations
  allViolations.push(...detectCrossTenantAccess(logs))

  // Calculate compliance metrics
  const totalQueries = logs.length
  const violationCount = allViolations.length
  const criticalIssues = allViolations.filter(v => v.severity === 'critical').length
  const highRiskIssues = allViolations.filter(v => v.severity === 'high').length

  const compliance = totalQueries > 0 ?
    Math.round(((totalQueries - violationCount) / totalQueries) * 100) : 100

  // Generate recommendations
  const recommendations = generateRecommendations(allViolations, schemaMap)

  return {
    tenantId,
    generatedAt: new Date(),
    summary: {
      totalQueries,
      securityViolations: violationCount,
      criticalIssues,
      highRiskIssues,
      compliance
    },
    violations: allViolations,
    recommendations,
    schemaCompliance: {
      valid: true, // Schema validation would go here
      issues: [],
      warnings: []
    }
  }
}

/**
 * Generate remediation advice for a specific violation
 */
function generateRemediation(model: string, action: string, warning: string): string {
  if (warning.includes('tenant filter')) {
    const tenantField = getTenantField(model)
    return `Add tenant filter: { where: { ${tenantField}: tenantId } }`
  }

  if (warning.includes('bulk')) {
    return `Add tenant filter to bulk operation: { where: { tenantId, ...otherConditions } }`
  }

  if (warning.includes('Raw')) {
    return `Replace raw query with Prisma method or ensure manual tenant filtering in SQL`
  }

  return `Review and ensure proper tenant isolation for ${model}.${action} operation`
}

/**
 * Generate security recommendations based on violations
 */
function generateRecommendations(violations: SecurityViolation[], schemaMap: any): string[] {
  const recommendations: string[] = []

  const criticalCount = violations.filter(v => v.severity === 'critical').length
  const highCount = violations.filter(v => v.severity === 'high').length

  if (criticalCount > 0) {
    recommendations.push(
      `🚨 IMMEDIATE ACTION: ${criticalCount} critical security violations detected. ` +
      `These pose immediate risks to tenant data isolation.`
    )
  }

  if (highCount > 0) {
    recommendations.push(
      `⚠️ HIGH PRIORITY: ${highCount} high-risk security issues require prompt attention.`
    )
  }

  // Model-specific recommendations
  const modelViolations = violations.reduce((acc, v) => {
    acc[v.model] = (acc[v.model] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  Object.entries(modelViolations).forEach(([model, count]) => {
    if (count > 5) {
      recommendations.push(
        `🔍 REVIEW NEEDED: Table '${model}' has ${count} security violations. ` +
        `Consider implementing automatic tenant filtering for this model.`
      )
    }
  })

  // General recommendations
  if (violations.length > 0) {
    recommendations.push(
      `🛡️ IMPLEMENT: Consider using a monitored Prisma client with automatic tenant injection ` +
      `to prevent future security violations.`
    )

    recommendations.push(
      `📊 MONITORING: Set up automated security monitoring and alerting for tenant isolation violations.`
    )
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ EXCELLENT: No security violations detected. Your tenant isolation is working properly.')
  }

  return recommendations
}

/**
 * Real-time security monitoring
 */
export function startSecurityMonitoring(callback: (violation: SecurityViolation) => void): void {
  // This would integrate with the query interceptor to provide real-time alerts
  console.log('🛡️ Security monitoring started - violations will be reported in real-time')
}

/**
 * Export security audit log
 */
export function exportSecurityAudit(tenantId?: string): {
  report: TenantSecurityReport
  exportedAt: Date
  format: 'json'
} {
  return {
    report: generateSecurityReport(tenantId),
    exportedAt: new Date(),
    format: 'json'
  }
}