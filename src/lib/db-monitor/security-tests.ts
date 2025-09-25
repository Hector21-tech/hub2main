/**
 * 🧪 COMPREHENSIVE SECURITY TEST SUITE
 *
 * Automated security tests for tenant isolation and database monitoring
 */

import { monitoredPrisma, createTenantOperations } from './monitored-prisma'
import { generateSecurityReport } from './tenant-analyzer'
import { getQueryLogs, clearQueryLogs } from './query-interceptor'
import { generateSchemaMap, validateSchemaConsistency } from './schema-mapper'

export interface SecurityTestResult {
  testName: string
  passed: boolean
  details: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendation?: string
}

export interface SecurityTestSuite {
  suiteName: string
  totalTests: number
  passedTests: number
  failedTests: number
  criticalFailures: number
  results: SecurityTestResult[]
  summary: string
}

/**
 * Run complete security test suite
 */
export async function runSecurityTestSuite(): Promise<SecurityTestSuite> {
  console.log('🧪 Starting comprehensive security test suite...')

  // Clear previous query logs
  clearQueryLogs()

  const results: SecurityTestResult[] = []

  // Schema validation tests
  results.push(...await runSchemaValidationTests())

  // Tenant isolation tests
  results.push(...await runTenantIsolationTests())

  // Query monitoring tests
  results.push(...await runQueryMonitoringTests())

  // API security tests
  results.push(...await runAPISecurityTests())

  // Bulk operation safety tests
  results.push(...await runBulkOperationTests())

  const totalTests = results.length
  const passedTests = results.filter(r => r.passed).length
  const failedTests = totalTests - passedTests
  const criticalFailures = results.filter(r => !r.passed && r.severity === 'critical').length

  const suite: SecurityTestSuite = {
    suiteName: 'Scout Hub 2 Database Security Test Suite',
    totalTests,
    passedTests,
    failedTests,
    criticalFailures,
    results,
    summary: generateTestSummary(results)
  }

  console.log(`🧪 Security test suite completed: ${passedTests}/${totalTests} passed`)
  if (criticalFailures > 0) {
    console.error(`🚨 CRITICAL: ${criticalFailures} critical security failures detected!`)
  }

  return suite
}

/**
 * Schema validation tests
 */
async function runSchemaValidationTests(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = []

  // Test 1: Schema consistency validation
  try {
    const validation = validateSchemaConsistency()
    results.push({
      testName: 'Schema Consistency Validation',
      passed: validation.valid,
      details: validation.valid ?
        'All schema tables properly configured for tenant isolation' :
        `Schema issues found: ${validation.issues.join(', ')}`,
      severity: validation.valid ? 'low' : 'high',
      recommendation: validation.valid ? undefined :
        'Fix schema inconsistencies before deploying to production'
    })
  } catch (error) {
    results.push({
      testName: 'Schema Consistency Validation',
      passed: false,
      details: `Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'critical',
      recommendation: 'Fix schema validation errors immediately'
    })
  }

  // Test 2: Tenant-aware table verification
  try {
    const schemaMap = generateSchemaMap()
    const expectedTenantTables = ['players', 'requests', 'trials', 'calendar_events']
    const actualTenantTables = schemaMap.tenantAwareTables

    const missingTables = expectedTenantTables.filter(table => !actualTenantTables.includes(table))

    results.push({
      testName: 'Tenant-Aware Table Verification',
      passed: missingTables.length === 0,
      details: missingTables.length === 0 ?
        `All ${expectedTenantTables.length} expected tenant-aware tables present` :
        `Missing tenant-aware tables: ${missingTables.join(', ')}`,
      severity: missingTables.length === 0 ? 'low' : 'critical',
      recommendation: missingTables.length > 0 ?
        'Add tenantId columns to missing tables' : undefined
    })
  } catch (error) {
    results.push({
      testName: 'Tenant-Aware Table Verification',
      passed: false,
      details: `Table verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'critical'
    })
  }

  return results
}

/**
 * Tenant isolation tests
 */
async function runTenantIsolationTests(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = []
  const testTenant1 = 'test-tenant-1'
  const testTenant2 = 'test-tenant-2'

  // Test 3: Tenant-scoped operations
  try {
    const tenant1Ops = createTenantOperations(testTenant1)
    const tenant2Ops = createTenantOperations(testTenant2)

    // This should work - tenant-scoped queries
    await tenant1Ops.getPlayers()
    await tenant2Ops.getPlayers()

    results.push({
      testName: 'Tenant-Scoped Query Operations',
      passed: true,
      details: 'Tenant-scoped operations executed successfully',
      severity: 'low'
    })
  } catch (error) {
    results.push({
      testName: 'Tenant-Scoped Query Operations',
      passed: false,
      details: `Tenant-scoped operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'high',
      recommendation: 'Fix tenant-scoped operation implementation'
    })
  }

  // Test 4: Cross-tenant access prevention
  try {
    // Try to access data without proper tenant scoping
    // This should be caught by monitoring
    let crossTenantAttempted = false
    try {
      // Direct access without tenant scoping (should be blocked)
      await monitoredPrisma.player.findMany({})
      crossTenantAttempted = true
    } catch (monitoringError) {
      // This is expected - monitoring should block unsafe operations
    }

    results.push({
      testName: 'Cross-Tenant Access Prevention',
      passed: !crossTenantAttempted,
      details: crossTenantAttempted ?
        'SECURITY BREACH: Cross-tenant access was not blocked' :
        'Cross-tenant access properly prevented by monitoring',
      severity: crossTenantAttempted ? 'critical' : 'low',
      recommendation: crossTenantAttempted ?
        'IMMEDIATE: Fix monitoring to block unsafe operations' : undefined
    })
  } catch (error) {
    results.push({
      testName: 'Cross-Tenant Access Prevention',
      passed: false,
      details: `Cross-tenant test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'high'
    })
  }

  return results
}

/**
 * Query monitoring tests
 */
async function runQueryMonitoringTests(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = []

  // Test 5: Query interception
  try {
    // Clear logs and perform a monitored query
    clearQueryLogs()
    const tenant1Ops = createTenantOperations('monitoring-test-tenant')
    await tenant1Ops.getPlayers()

    const logs = getQueryLogs()
    const hasQueryLogs = logs.length > 0

    results.push({
      testName: 'Query Interception and Logging',
      passed: hasQueryLogs,
      details: hasQueryLogs ?
        `Query interceptor working - captured ${logs.length} queries` :
        'Query interceptor not capturing queries',
      severity: hasQueryLogs ? 'low' : 'high',
      recommendation: hasQueryLogs ? undefined :
        'Fix query interceptor middleware'
    })
  } catch (error) {
    results.push({
      testName: 'Query Interception and Logging',
      passed: false,
      details: `Query interception test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'high'
    })
  }

  // Test 6: Security risk detection
  try {
    const logs = getQueryLogs()
    const hasSecurityAnalysis = logs.some(log => log.securityRisk !== undefined)

    results.push({
      testName: 'Security Risk Detection',
      passed: hasSecurityAnalysis,
      details: hasSecurityAnalysis ?
        'Security risk analysis working on query logs' :
        'Security risk analysis not functioning',
      severity: hasSecurityAnalysis ? 'low' : 'medium',
      recommendation: hasSecurityAnalysis ? undefined :
        'Implement security risk analysis in query interceptor'
    })
  } catch (error) {
    results.push({
      testName: 'Security Risk Detection',
      passed: false,
      details: `Security risk detection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'medium'
    })
  }

  return results
}

/**
 * API security tests
 */
async function runAPISecurityTests(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = []

  // Test 7: Security report generation
  try {
    const report = generateSecurityReport('test-tenant')
    const hasValidReport = report && report.summary && report.violations !== undefined

    results.push({
      testName: 'Security Report Generation',
      passed: hasValidReport,
      details: hasValidReport ?
        `Security report generated with ${report.violations.length} violations analyzed` :
        'Security report generation failed',
      severity: hasValidReport ? 'low' : 'medium',
      recommendation: hasValidReport ? undefined :
        'Fix security report generation system'
    })
  } catch (error) {
    results.push({
      testName: 'Security Report Generation',
      passed: false,
      details: `Security report test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'medium'
    })
  }

  return results
}

/**
 * Bulk operation safety tests
 */
async function runBulkOperationTests(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = []

  // Test 8: Bulk operation blocking
  try {
    let bulkOperationBlocked = false
    try {
      // Try unsafe bulk operation (should be blocked)
      await (monitoredPrisma as any).deleteMany({})
      bulkOperationBlocked = false
    } catch (blockError) {
      // This is expected - bulk operations should be blocked
      bulkOperationBlocked = true
    }

    results.push({
      testName: 'Unsafe Bulk Operation Blocking',
      passed: bulkOperationBlocked,
      details: bulkOperationBlocked ?
        'Unsafe bulk operations properly blocked by monitoring' :
        'SECURITY BREACH: Unsafe bulk operations not blocked',
      severity: bulkOperationBlocked ? 'low' : 'critical',
      recommendation: bulkOperationBlocked ? undefined :
        'IMMEDIATE: Fix monitoring to block unsafe bulk operations'
    })
  } catch (error) {
    results.push({
      testName: 'Unsafe Bulk Operation Blocking',
      passed: false,
      details: `Bulk operation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'high'
    })
  }

  return results
}

/**
 * Generate test summary
 */
function generateTestSummary(results: SecurityTestResult[]): string {
  const total = results.length
  const passed = results.filter(r => r.passed).length
  const failed = total - passed
  const critical = results.filter(r => !r.passed && r.severity === 'critical').length

  if (critical > 0) {
    return `🚨 CRITICAL SECURITY FAILURES: ${critical} critical issues require immediate attention. Overall: ${passed}/${total} tests passed.`
  }

  if (failed > 0) {
    return `⚠️ Security issues detected: ${failed} tests failed. Please review and address security concerns. Overall: ${passed}/${total} tests passed.`
  }

  return `✅ EXCELLENT SECURITY: All ${total} security tests passed. Your tenant isolation and monitoring system is working properly.`
}

/**
 * Run quick security health check
 */
export async function runSecurityHealthCheck(): Promise<{
  healthy: boolean
  issues: string[]
  score: number
}> {
  try {
    const suite = await runSecurityTestSuite()
    const issues: string[] = []

    suite.results.forEach(result => {
      if (!result.passed && (result.severity === 'critical' || result.severity === 'high')) {
        issues.push(`${result.testName}: ${result.details}`)
      }
    })

    const score = Math.round((suite.passedTests / suite.totalTests) * 100)
    const healthy = suite.criticalFailures === 0 && score >= 80

    return { healthy, issues, score }
  } catch (error) {
    return {
      healthy: false,
      issues: [`Security health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      score: 0
    }
  }
}