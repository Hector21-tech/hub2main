/**
 * 🧪 SECURITY TEST API ENDPOINT
 *
 * API endpoint for running comprehensive security tests
 */

import { NextRequest, NextResponse } from 'next/server'
import { runSecurityTestSuite, runSecurityHealthCheck } from '@/lib/db-monitor/security-tests'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST - Run security tests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testType = 'full' } = body

    switch (testType) {
      case 'full':
        return await handleFullSecurityTest()

      case 'health':
        return await handleHealthCheck()

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid test type. Use "full" or "health"' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Security test error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to run security tests' },
      { status: 500 }
    )
  }
}

/**
 * Run full security test suite
 */
async function handleFullSecurityTest() {
  console.log('🧪 Starting full security test suite...')

  const startTime = Date.now()
  const testSuite = await runSecurityTestSuite()
  const duration = Date.now() - startTime

  // Log results
  console.log(`🧪 Security test completed in ${duration}ms`)
  console.log(`📊 Results: ${testSuite.passedTests}/${testSuite.totalTests} passed`)

  if (testSuite.criticalFailures > 0) {
    console.error(`🚨 CRITICAL: ${testSuite.criticalFailures} critical failures detected!`)
  }

  return NextResponse.json({
    success: true,
    data: {
      ...testSuite,
      duration,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Run quick health check
 */
async function handleHealthCheck() {
  console.log('❤️ Running security health check...')

  const healthCheck = await runSecurityHealthCheck()

  console.log(`❤️ Health check completed - Score: ${healthCheck.score}%, Healthy: ${healthCheck.healthy}`)

  return NextResponse.json({
    success: true,
    data: {
      ...healthCheck,
      timestamp: new Date().toISOString()
    }
  })
}

// GET - Get test status and information
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      message: 'Database Security Test Suite API',
      availableTests: [
        {
          type: 'full',
          description: 'Complete security test suite with detailed analysis',
          method: 'POST',
          body: { testType: 'full' }
        },
        {
          type: 'health',
          description: 'Quick security health check',
          method: 'POST',
          body: { testType: 'health' }
        }
      ],
      testCategories: [
        'Schema Validation Tests',
        'Tenant Isolation Tests',
        'Query Monitoring Tests',
        'API Security Tests',
        'Bulk Operation Safety Tests'
      ]
    }
  })
}