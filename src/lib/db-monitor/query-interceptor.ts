/**
 * 🔍 QUERY INTERCEPTOR
 *
 * Prisma middleware that intercepts and analyzes all SQL queries
 * for tenant isolation compliance and security monitoring
 */

import { Prisma } from '@prisma/client'
import { requiresTenantFilter, getTenantField, getTableRelationshipType } from './schema-mapper'
import { analyzeQuerySecurity } from './tenant-analyzer'

export interface QueryLog {
  id: string
  timestamp: Date
  model: string
  action: string
  args: any
  duration: number
  tenantId?: string
  hasTenantFilter: boolean
  securityRisk: 'none' | 'low' | 'medium' | 'high' | 'critical'
  warnings: string[]
  sqlQuery?: string
}

// In-memory query log storage (in production, use Redis or database)
const queryLogs: QueryLog[] = []
const MAX_LOGS = 1000 // Keep last 1000 queries

/**
 * Generate unique query ID
 */
function generateQueryId(): string {
  return `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Extract tenant ID from query arguments
 */
function extractTenantId(model: string, action: string, args: any): string | undefined {
  const tenantField = getTenantField(model)
  if (!tenantField) return undefined

  // Check where clause
  if (args.where && args.where[tenantField]) {
    return args.where[tenantField]
  }

  // Check data for create/update operations
  if (args.data && args.data[tenantField]) {
    return args.data[tenantField]
  }

  // Check nested where clauses
  if (args.where) {
    for (const key in args.where) {
      const value = args.where[key]
      if (typeof value === 'object' && value[tenantField]) {
        return value[tenantField]
      }
    }
  }

  return undefined
}

/**
 * Check if query has proper tenant filtering
 */
function hasProperTenantFilter(model: string, action: string, args: any): boolean {
  // Skip if table doesn't require tenant filtering
  if (!requiresTenantFilter(model)) return true

  const tenantField = getTenantField(model)
  if (!tenantField) return true

  // For read operations, check where clause
  if (['findFirst', 'findUnique', 'findMany', 'count', 'aggregate'].includes(action)) {
    return args.where && args.where[tenantField] !== undefined
  }

  // For write operations, check data or where clause
  if (['create', 'update', 'upsert'].includes(action)) {
    return (args.data && args.data[tenantField]) ||
           (args.where && args.where[tenantField])
  }

  if (action === 'delete') {
    return args.where && args.where[tenantField] !== undefined
  }

  return false
}

/**
 * Analyze query for security risks
 */
function analyzeQuery(model: string, action: string, args: any, hasTenantFilter: boolean): {
  risk: QueryLog['securityRisk']
  warnings: string[]
} {
  const warnings: string[] = []
  let risk: QueryLog['securityRisk'] = 'none'

  // Critical: Tenant-scoped table without tenant filter
  if (requiresTenantFilter(model) && !hasTenantFilter) {
    warnings.push(`CRITICAL: Query on tenant-scoped table '${model}' without tenant filter`)
    risk = 'critical'
  }

  // High risk: Bulk operations without tenant filter
  if (['deleteMany', 'updateMany'].includes(action) && !hasTenantFilter) {
    warnings.push(`HIGH RISK: Bulk ${action} operation without tenant filter`)
    risk = risk === 'critical' ? 'critical' : 'high'
  }

  // Medium risk: Raw queries (if any)
  if (action.includes('$') || action.includes('Raw')) {
    warnings.push(`MEDIUM RISK: Raw SQL query detected - manual review required`)
    risk = risk === 'critical' ? 'critical' :
           risk === 'high' ? 'high' : 'medium'
  }

  // Low risk: Operations on junction tables
  if (getTableRelationshipType(model) === 'junction' && !hasTenantFilter) {
    warnings.push(`LOW RISK: Operation on junction table '${model}' without direct tenant filter`)
    risk = risk === 'none' ? 'low' : risk
  }

  return { risk, warnings }
}

/**
 * Add query log entry
 */
function addQueryLog(log: QueryLog): void {
  queryLogs.push(log)

  // Keep only the latest logs
  if (queryLogs.length > MAX_LOGS) {
    queryLogs.splice(0, queryLogs.length - MAX_LOGS)
  }

  // Log security warnings to console
  if (log.securityRisk !== 'none') {
    console.warn(`🚨 DB SECURITY ${log.securityRisk.toUpperCase()}: ${log.warnings.join(', ')}`)
    console.warn(`🚨 Query: ${log.model}.${log.action} with args:`, JSON.stringify(log.args, null, 2))
  }
}

/**
 * Main Prisma middleware for query interception
 */
export const queryInterceptorMiddleware: Prisma.Middleware = async (params, next) => {
  const startTime = Date.now()
  const queryId = generateQueryId()

  // Extract query details
  const { model, action, args } = params
  const modelName = model || 'unknown'

  // Check tenant filtering
  const hasTenantFilter = hasProperTenantFilter(modelName, action, args)
  const tenantId = extractTenantId(modelName, action, args)

  // Analyze security
  const { risk, warnings } = analyzeQuery(modelName, action, args, hasTenantFilter)

  try {
    // Execute the query
    const result = await next(params)
    const duration = Date.now() - startTime

    // Log the query
    const queryLog: QueryLog = {
      id: queryId,
      timestamp: new Date(),
      model: modelName,
      action,
      args,
      duration,
      tenantId,
      hasTenantFilter,
      securityRisk: risk,
      warnings
    }

    addQueryLog(queryLog)

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    // Log failed query
    const queryLog: QueryLog = {
      id: queryId,
      timestamp: new Date(),
      model: modelName,
      action,
      args,
      duration,
      tenantId,
      hasTenantFilter,
      securityRisk: 'high', // Failed queries are considered high risk
      warnings: [...warnings, `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    }

    addQueryLog(queryLog)

    throw error
  }
}

/**
 * Get query logs for analysis
 */
export function getQueryLogs(filters?: {
  tenantId?: string
  riskLevel?: QueryLog['securityRisk']
  model?: string
  limit?: number
}): QueryLog[] {
  let filteredLogs = [...queryLogs]

  if (filters?.tenantId) {
    filteredLogs = filteredLogs.filter(log => log.tenantId === filters.tenantId)
  }

  if (filters?.riskLevel) {
    filteredLogs = filteredLogs.filter(log => log.securityRisk === filters.riskLevel)
  }

  if (filters?.model) {
    filteredLogs = filteredLogs.filter(log => log.model === filters.model)
  }

  // Sort by timestamp (newest first)
  filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  if (filters?.limit) {
    filteredLogs = filteredLogs.slice(0, filters.limit)
  }

  return filteredLogs
}

/**
 * Get query statistics
 */
export function getQueryStats(tenantId?: string): {
  totalQueries: number
  byRiskLevel: Record<QueryLog['securityRisk'], number>
  byModel: Record<string, number>
  averageDuration: number
  securityIssuesCount: number
} {
  const logs = tenantId ?
    queryLogs.filter(log => log.tenantId === tenantId) :
    queryLogs

  const byRiskLevel: Record<QueryLog['securityRisk'], number> = {
    none: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  }

  const byModel: Record<string, number> = {}

  let totalDuration = 0
  let securityIssuesCount = 0

  logs.forEach(log => {
    byRiskLevel[log.securityRisk]++
    byModel[log.model] = (byModel[log.model] || 0) + 1
    totalDuration += log.duration

    if (log.securityRisk !== 'none') {
      securityIssuesCount++
    }
  })

  return {
    totalQueries: logs.length,
    byRiskLevel,
    byModel,
    averageDuration: logs.length > 0 ? totalDuration / logs.length : 0,
    securityIssuesCount
  }
}

/**
 * Clear query logs (for testing or cleanup)
 */
export function clearQueryLogs(): void {
  queryLogs.length = 0
}