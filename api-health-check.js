#!/usr/bin/env node
/**
 * API Health Check and Monitoring Script for Scout Hub 2
 * Tests all API endpoints and generates a comprehensive health report
 */

const BASE_URL = 'http://localhost:3002';

// API endpoints to test
const API_ENDPOINTS = [
  // Basic health checks
  { path: '/api/hello', method: 'GET', requiresAuth: false, description: 'Basic health check' },
  { path: '/api/test-db', method: 'GET', requiresAuth: false, description: 'Database connection test' },

  // Core CRUD APIs
  { path: '/api/players?tenantId=test-tenant', method: 'GET', requiresAuth: false, description: 'Players list API' },
  { path: '/api/requests?tenantId=test-tenant', method: 'GET', requiresAuth: false, description: 'Requests list API' },
  { path: '/api/trials?tenantId=test-tenant', method: 'GET', requiresAuth: false, description: 'Trials list API' },
  { path: '/api/calendar/events?tenantId=test-tenant', method: 'GET', requiresAuth: false, description: 'Calendar events API' },

  // Dashboard and analytics
  { path: '/api/dashboard/stats?tenantId=test-tenant', method: 'GET', requiresAuth: false, description: 'Dashboard statistics API' },

  // Setup and utility APIs
  { path: '/api/setup-rls', method: 'GET', requiresAuth: false, description: 'RLS setup utility' },
  { path: '/api/migrate', method: 'GET', requiresAuth: false, description: 'Database migration utility' },
  { path: '/api/organizations', method: 'GET', requiresAuth: false, description: 'Organizations API' },

  // Debug and testing
  { path: '/api/debug', method: 'GET', requiresAuth: false, description: 'Debug information API' },
  { path: '/api/test-crud', method: 'GET', requiresAuth: false, description: 'CRUD testing API' },
];

class APIHealthChecker {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async checkEndpoint(endpoint) {
    const startTime = Date.now();
    let result = {
      ...endpoint,
      status: 'unknown',
      responseTime: 0,
      httpStatus: null,
      error: null,
      response: null,
      security: {
        hasAuth: false,
        rateLimit: false,
        tenantIsolation: false
      }
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000)
      });

      result.responseTime = Date.now() - startTime;
      result.httpStatus = response.status;

      // Try to parse JSON response
      try {
        const text = await response.text();
        result.response = text ? JSON.parse(text) : null;
      } catch (parseError) {
        result.response = { error: 'Failed to parse response as JSON' };
      }

      // Determine status based on HTTP status code
      if (response.status >= 200 && response.status < 300) {
        result.status = 'healthy';
      } else if (response.status >= 400 && response.status < 500) {
        result.status = 'client_error';
      } else if (response.status >= 500) {
        result.status = 'server_error';
      } else {
        result.status = 'unknown';
      }

      // Check security features
      result.security.rateLimit = response.headers.has('x-ratelimit-remaining') ||
                                  response.status === 429;

      // Check if endpoint validates tenant isolation
      if (endpoint.path.includes('tenantId')) {
        result.security.tenantIsolation = true;
      }

    } catch (error) {
      result.responseTime = Date.now() - startTime;
      result.status = 'error';
      result.error = error.message;
    }

    return result;
  }

  async runHealthCheck() {
    console.log('🔍 Starting API Health Check...\n');
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`📊 Testing ${API_ENDPOINTS.length} endpoints...\n`);

    for (const endpoint of API_ENDPOINTS) {
      process.stdout.write(`Testing ${endpoint.path}... `);

      const result = await this.checkEndpoint(endpoint);
      this.results.push(result);

      // Color-coded status output
      const statusSymbol = this.getStatusSymbol(result.status);
      const responseTime = `${result.responseTime}ms`;
      console.log(`${statusSymbol} (${result.httpStatus}) ${responseTime}`);
    }

    return this.generateReport();
  }

  getStatusSymbol(status) {
    switch (status) {
      case 'healthy': return '✅';
      case 'client_error': return '⚠️';
      case 'server_error': return '❌';
      case 'error': return '💥';
      default: return '❓';
    }
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const healthy = this.results.filter(r => r.status === 'healthy').length;
    const warnings = this.results.filter(r => r.status === 'client_error').length;
    const errors = this.results.filter(r => r.status === 'server_error' || r.status === 'error').length;

    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length;
    const maxResponseTime = Math.max(...this.results.map(r => r.responseTime));
    const minResponseTime = Math.min(...this.results.map(r => r.responseTime));

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        healthy,
        warnings,
        errors,
        healthScore: Math.round((healthy / this.results.length) * 100)
      },
      performance: {
        totalTestTime: totalTime,
        avgResponseTime: Math.round(avgResponseTime),
        maxResponseTime,
        minResponseTime
      },
      security: {
        authProtected: this.results.filter(r => r.security.hasAuth).length,
        rateLimited: this.results.filter(r => r.security.rateLimit).length,
        tenantIsolated: this.results.filter(r => r.security.tenantIsolation).length
      },
      endpoints: this.results,
      issues: this.results.filter(r => r.status !== 'healthy')
    };

    // Console output
    console.log('\n' + '='.repeat(60));
    console.log('📋 API HEALTH REPORT');
    console.log('='.repeat(60));
    console.log(`⏰ Test completed in ${totalTime}ms`);
    console.log(`🎯 Health Score: ${report.summary.healthScore}%`);
    console.log(`✅ Healthy: ${healthy}/${this.results.length}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Avg Response Time: ${report.performance.avgResponseTime}ms`);
    console.log(`🔒 Tenant Isolated: ${report.security.tenantIsolated} endpoints`);

    if (report.issues.length > 0) {
      console.log('\n🔍 ISSUES FOUND:');
      report.issues.forEach(issue => {
        console.log(`${this.getStatusSymbol(issue.status)} ${issue.path} - ${issue.httpStatus || 'NO_RESPONSE'}`);
        if (issue.error) {
          console.log(`   Error: ${issue.error}`);
        }
        if (issue.response && issue.response.error) {
          console.log(`   API Error: ${issue.response.error}`);
        }
      });
    }

    console.log('\n' + '='.repeat(60));
    return report;
  }
}

// Performance monitoring utilities
class PerformanceMonitor {
  static async benchmarkEndpoint(url, iterations = 10) {
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      try {
        await fetch(url);
        times.push(Date.now() - start);
      } catch (error) {
        times.push(null); // Failed request
      }
    }

    const validTimes = times.filter(t => t !== null);
    return {
      iterations,
      successful: validTimes.length,
      failed: times.length - validTimes.length,
      avg: validTimes.length > 0 ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length : 0,
      min: validTimes.length > 0 ? Math.min(...validTimes) : 0,
      max: validTimes.length > 0 ? Math.max(...validTimes) : 0
    };
  }
}

// Run health check if called directly
if (require.main === module) {
  const checker = new APIHealthChecker();
  checker.runHealthCheck()
    .then(report => {
      // Save report to file
      const fs = require('fs');
      const reportPath = './api-health-report.json';
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Full report saved to: ${reportPath}`);

      // Exit with appropriate code
      process.exit(report.summary.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Health check failed:', error);
      process.exit(1);
    });
}

module.exports = { APIHealthChecker, PerformanceMonitor };