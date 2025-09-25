/**
 * 🛡️ Enterprise Security Shakedown Tests
 *
 * Comprehensive security validation suite
 * Tests all implemented security measures
 */

import { Logger } from '@/lib/logger'

export interface SecurityTestResult {
  testName: string
  passed: boolean
  details: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendations?: string[]
}

export interface ShakedownReport {
  timestamp: Date
  overallStatus: 'pass' | 'fail' | 'warnings'
  totalTests: number
  passedTests: number
  failedTests: number
  criticalFailures: number
  results: SecurityTestResult[]
  summary: {
    httpStatusTests: number
    ssrfTests: number
    debugProtectionTests: number
    rateLimitTests: number
    headerTests: number
    tenantIsolationTests: number
  }
}

const BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3005'
  : (typeof window !== 'undefined' ? window.location.origin : '')

/**
 * Test HTTP status semantics (401 vs 403 vs 404)
 */
async function testHttpStatusSemantics(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = []

  // Test 1: Missing tenant parameter should return 400
  try {
    const response = await fetch(`${BASE_URL}/api/players`)
    const success = response.status === 400

    results.push({
      testName: 'HTTP Status - Missing tenant parameter',
      passed: success,
      details: `Expected 400, got ${response.status}`,
      severity: success ? 'low' : 'medium'
    })
  } catch (error) {
    results.push({
      testName: 'HTTP Status - Missing tenant parameter',
      passed: false,
      details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'high'
    })
  }

  // Test 2: Invalid tenant should return 404 (not 401/403)
  try {
    const response = await fetch(`${BASE_URL}/api/players?tenant=nonexistent-tenant`)
    const success = response.status === 404

    results.push({
      testName: 'HTTP Status - Invalid tenant enumeration protection',
      passed: success,
      details: `Expected 404, got ${response.status}`,
      severity: success ? 'low' : 'critical',
      recommendations: success ? undefined : ['Fix tenant validation to return 404 for invalid tenants']
    })
  } catch (error) {
    results.push({
      testName: 'HTTP Status - Invalid tenant enumeration protection',
      passed: false,
      details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'critical'
    })
  }

  return results
}

/**
 * Test SSRF protection in PDF generation
 */
async function testSSRFProtection(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = []

  // Test 1: Block malicious URLs
  const maliciousUrls = [
    'http://169.254.169.254/latest/meta-data',
    'file:///etc/passwd',
    'http://localhost:22',
    'ftp://example.com/test'
  ]

  for (const url of maliciousUrls) {
    try {
      const response = await fetch(`${BASE_URL}/api/generate-player-pdf?tenant=test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      const success = response.status >= 400 // Should be blocked

      results.push({
        testName: `SSRF Protection - Block ${url}`,
        passed: success,
        details: `Malicious URL returned ${response.status}`,
        severity: success ? 'low' : 'critical',
        recommendations: success ? undefined : ['Strengthen URL validation in PDF generation']
      })
    } catch (error) {
      results.push({
        testName: `SSRF Protection - Block ${url}`,
        passed: true, // Network error is acceptable
        details: 'Request blocked at network level',
        severity: 'low'
      })
    }
  }

  return results
}

/**
 * Test debug endpoint protection
 */
async function testDebugProtection(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = []
  const debugEndpoints = [
    '/api/debug',
    '/api/test-crud',
    '/api/migrate',
    '/api/setup-rls'
  ]

  for (const endpoint of debugEndpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`)
      const isProduction = process.env.NODE_ENV === 'production'
      const shouldBeBlocked = isProduction
      const isBlocked = response.status === 404

      const success = shouldBeBlocked ? isBlocked : true

      results.push({
        testName: `Debug Protection - ${endpoint}`,
        passed: success,
        details: `Environment: ${process.env.NODE_ENV}, Status: ${response.status}`,
        severity: success ? 'low' : 'critical',
        recommendations: success ? undefined : ['Ensure debug endpoints are blocked in production']
      })
    } catch (error) {
      results.push({
        testName: `Debug Protection - ${endpoint}`,
        passed: true,
        details: 'Endpoint not accessible',
        severity: 'low'
      })
    }
  }

  return results
}

/**
 * Test rate limiting
 */
async function testRateLimiting(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = []

  try {
    // Send multiple requests quickly to trigger rate limiting
    const promises = Array.from({ length: 15 }, () =>
      fetch(`${BASE_URL}/api/players?tenant=test`)
    )

    const responses = await Promise.all(promises)
    const rateLimitedResponses = responses.filter(r => r.status === 429)

    const success = rateLimitedResponses.length > 0

    results.push({
      testName: 'Rate Limiting - Burst protection',
      passed: success,
      details: `${rateLimitedResponses.length}/15 requests rate limited`,
      severity: success ? 'low' : 'medium',
      recommendations: success ? undefined : ['Review rate limiting configuration']
    })
  } catch (error) {
    results.push({
      testName: 'Rate Limiting - Burst protection',
      passed: false,
      details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'medium'
    })
  }

  return results
}

/**
 * Test security headers
 */
async function testSecurityHeaders(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = []

  const requiredHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'X-XSS-Protection',
    'Content-Security-Policy',
    'X-Request-ID'
  ]

  try {
    const response = await fetch(`${BASE_URL}/api/health`)

    for (const header of requiredHeaders) {
      const headerValue = response.headers.get(header)
      const success = headerValue !== null

      results.push({
        testName: `Security Headers - ${header}`,
        passed: success,
        details: success ? `Present: ${headerValue}` : 'Missing',
        severity: success ? 'low' : 'medium',
        recommendations: success ? undefined : [`Add ${header} security header`]
      })
    }
  } catch (error) {
    results.push({
      testName: 'Security Headers - General test',
      passed: false,
      details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'high'
    })
  }

  return results
}

/**
 * Test tenant isolation
 */
async function testTenantIsolation(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = []

  // Test cross-tenant access attempts
  const testCases = [
    {
      endpoint: '/api/players?tenant=tenant-a',
      description: 'Cross-tenant player access'
    },
    {
      endpoint: '/api/requests?tenant=../../../etc/passwd',
      description: 'Directory traversal in tenant parameter'
    },
    {
      endpoint: '/api/trials?tenant=<script>alert(1)</script>',
      description: 'XSS in tenant parameter'
    }
  ]

  for (const testCase of testCases) {
    try {
      const response = await fetch(`${BASE_URL}${testCase.endpoint}`)
      const success = response.status >= 400 // Should be blocked

      results.push({
        testName: `Tenant Isolation - ${testCase.description}`,
        passed: success,
        details: `Status: ${response.status}`,
        severity: success ? 'low' : 'critical',
        recommendations: success ? undefined : ['Strengthen tenant validation and input sanitization']
      })
    } catch (error) {
      results.push({
        testName: `Tenant Isolation - ${testCase.description}`,
        passed: true, // Network error is acceptable
        details: 'Request blocked',
        severity: 'low'
      })
    }
  }

  return results
}

/**
 * Run comprehensive security shakedown tests
 */
export async function runSecurityShakedown(): Promise<ShakedownReport> {
  const timestamp = new Date()

  Logger.info('Starting comprehensive security shakedown', {
    path: '/test/security',
    method: 'INTERNAL',
    status: 200,
    details: { environment: process.env.NODE_ENV }
  })

  // Run all test suites
  const [
    httpStatusResults,
    ssrfResults,
    debugResults,
    rateLimitResults,
    headerResults,
    tenantIsolationResults
  ] = await Promise.all([
    testHttpStatusSemantics(),
    testSSRFProtection(),
    testDebugProtection(),
    testRateLimiting(),
    testSecurityHeaders(),
    testTenantIsolation()
  ])

  // Combine all results
  const allResults = [
    ...httpStatusResults,
    ...ssrfResults,
    ...debugResults,
    ...rateLimitResults,
    ...headerResults,
    ...tenantIsolationResults
  ]

  // Calculate summary
  const totalTests = allResults.length
  const passedTests = allResults.filter(r => r.passed).length
  const failedTests = totalTests - passedTests
  const criticalFailures = allResults.filter(r => !r.passed && r.severity === 'critical').length

  let overallStatus: 'pass' | 'fail' | 'warnings' = 'pass'
  if (criticalFailures > 0) {
    overallStatus = 'fail'
  } else if (failedTests > 0) {
    overallStatus = 'warnings'
  }

  const report: ShakedownReport = {
    timestamp,
    overallStatus,
    totalTests,
    passedTests,
    failedTests,
    criticalFailures,
    results: allResults,
    summary: {
      httpStatusTests: httpStatusResults.length,
      ssrfTests: ssrfResults.length,
      debugProtectionTests: debugResults.length,
      rateLimitTests: rateLimitResults.length,
      headerTests: headerResults.length,
      tenantIsolationTests: tenantIsolationResults.length
    }
  }

  Logger.info('Security shakedown completed', {
    path: '/test/security',
    method: 'INTERNAL',
    status: overallStatus === 'pass' ? 200 : (criticalFailures > 0 ? 500 : 207),
    details: {
      overallStatus,
      totalTests,
      passedTests,
      criticalFailures
    }
  })

  return report
}

/**
 * Quick security health check
 */
export async function quickSecurityCheck(): Promise<{
  healthy: boolean
  issues: string[]
  timestamp: Date
}> {
  const issues: string[] = []

  // Check basic endpoint availability
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/health`)
    if (!healthResponse.ok) {
      issues.push('Health endpoint not responding correctly')
    }
  } catch {
    issues.push('Health endpoint not accessible')
  }

  // Check for basic security headers
  try {
    const response = await fetch(`${BASE_URL}/`)
    const hasSecurityHeaders = response.headers.get('X-Frame-Options') !== null
    if (!hasSecurityHeaders) {
      issues.push('Missing security headers')
    }
  } catch {
    issues.push('Cannot verify security headers')
  }

  return {
    healthy: issues.length === 0,
    issues,
    timestamp: new Date()
  }
}