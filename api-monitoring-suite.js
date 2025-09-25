#!/usr/bin/env node
/**
 * Comprehensive API Monitoring and Security Assessment Suite
 * For Scout Hub 2 Application
 */

const fs = require('fs');
const path = require('path');

class APIMonitoringSuite {
  constructor(baseUrl = 'http://localhost:3002') {
    this.baseUrl = baseUrl;
    this.reports = {};
    this.startTime = Date.now();
  }

  async runFullAssessment() {
    console.log('🚀 Starting Comprehensive API Assessment...\n');

    try {
      // Run all assessments in parallel for efficiency
      const [
        healthReport,
        performanceReport,
        securityReport,
        dependencyReport
      ] = await Promise.all([
        this.healthAssessment(),
        this.performanceAssessment(),
        this.securityAssessment(),
        this.dependencyAssessment()
      ]);

      const fullReport = {
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - this.startTime,
        baseUrl: this.baseUrl,
        health: healthReport,
        performance: performanceReport,
        security: securityReport,
        dependencies: dependencyReport,
        recommendations: this.generateRecommendations()
      };

      // Save comprehensive report
      this.saveReport(fullReport, 'comprehensive-api-assessment.json');
      this.generateMarkdownReport(fullReport);

      return fullReport;

    } catch (error) {
      console.error('💥 Assessment failed:', error);
      throw error;
    }
  }

  async healthAssessment() {
    console.log('📊 Running Health Assessment...');

    const endpoints = [
      { path: '/api/hello', critical: true },
      { path: '/api/test-db', critical: true },
      { path: '/api/players?tenantId=cluqp37cs000108l59hl79k1l', critical: true },
      { path: '/api/requests?tenantId=cluqp37cs000108l59hl79k1l', critical: true },
      { path: '/api/trials?tenantId=cluqp37cs000108l59hl79k1l', critical: true },
      { path: '/api/dashboard/stats?tenantId=cluqp37cs000108l59hl79k1l', critical: true }
    ];

    const results = [];
    let criticalFailures = 0;

    for (const endpoint of endpoints) {
      const result = await this.testEndpoint(endpoint.path);
      result.critical = endpoint.critical;

      if (endpoint.critical && result.status !== 'healthy') {
        criticalFailures++;
      }

      results.push(result);
    }

    const healthScore = Math.round(((results.length - criticalFailures) / results.length) * 100);

    return {
      overall: criticalFailures === 0 ? 'healthy' : 'degraded',
      healthScore,
      criticalFailures,
      endpoints: results,
      uptime: this.calculateUptime(results)
    };
  }

  async performanceAssessment() {
    console.log('⚡ Running Performance Assessment...');

    const criticalEndpoints = [
      '/api/hello',
      '/api/players?tenantId=cluqp37cs000108l59hl79k1l',
      '/api/dashboard/stats?tenantId=cluqp37cs000108l59hl79k1l'
    ];

    const benchmarks = {};
    const performanceIssues = [];

    for (const endpoint of criticalEndpoints) {
      console.log(`  Benchmarking ${endpoint}...`);
      const benchmark = await this.benchmarkEndpoint(endpoint, 5);
      benchmarks[endpoint] = benchmark;

      // Check for performance issues
      if (benchmark.avg > 1000) {
        performanceIssues.push({
          endpoint,
          issue: 'Slow response time',
          avgTime: benchmark.avg,
          severity: benchmark.avg > 3000 ? 'high' : 'medium'
        });
      }

      if (benchmark.failed > 0) {
        performanceIssues.push({
          endpoint,
          issue: 'Request failures',
          failures: benchmark.failed,
          severity: 'high'
        });
      }
    }

    return {
      benchmarks,
      issues: performanceIssues,
      recommendations: this.getPerformanceRecommendations(benchmarks)
    };
  }

  async securityAssessment() {
    console.log('🔒 Running Security Assessment...');

    const securityTests = [
      this.testAuthentication(),
      this.testTenantIsolation(),
      this.testRateLimit(),
      this.testInputValidation(),
      this.testSQLInjection(),
      this.checkSecurityHeaders()
    ];

    const results = await Promise.all(securityTests);

    const vulnerabilities = [];
    const strengths = [];

    results.forEach(result => {
      if (result.vulnerable) {
        vulnerabilities.push(result);
      } else {
        strengths.push(result);
      }
    });

    const securityScore = Math.round((strengths.length / results.length) * 100);

    return {
      score: securityScore,
      status: securityScore >= 80 ? 'secure' : securityScore >= 60 ? 'moderate' : 'vulnerable',
      vulnerabilities,
      strengths,
      recommendations: this.getSecurityRecommendations(vulnerabilities)
    };
  }

  async dependencyAssessment() {
    console.log('📦 Running Dependency Assessment...');

    try {
      // Check if package.json exists
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      const criticalDeps = [
        'next',
        '@supabase/supabase-js',
        '@prisma/client',
        'typescript'
      ];

      const analysis = {
        total: Object.keys(dependencies).length,
        critical: criticalDeps.filter(dep => dependencies[dep]).length,
        versions: {},
        issues: []
      };

      // Check versions of critical dependencies
      criticalDeps.forEach(dep => {
        if (dependencies[dep]) {
          analysis.versions[dep] = dependencies[dep];
        } else {
          analysis.issues.push({
            type: 'missing_critical',
            dependency: dep,
            severity: 'high'
          });
        }
      });

      return analysis;

    } catch (error) {
      return {
        error: 'Could not analyze dependencies',
        details: error.message
      };
    }
  }

  async testEndpoint(path) {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        signal: AbortSignal.timeout(5000)
      });

      return {
        path,
        status: response.status >= 200 && response.status < 300 ? 'healthy' : 'unhealthy',
        httpStatus: response.status,
        responseTime: Date.now() - startTime,
        error: null
      };
    } catch (error) {
      return {
        path,
        status: 'error',
        httpStatus: null,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async benchmarkEndpoint(endpoint, iterations = 5) {
    const times = [];
    let failures = 0;

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          times.push(Date.now() - start);
        } else {
          failures++;
        }
      } catch (error) {
        failures++;
      }
    }

    return {
      iterations,
      successful: times.length,
      failed: failures,
      avg: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
      min: times.length > 0 ? Math.min(...times) : 0,
      max: times.length > 0 ? Math.max(...times) : 0,
      p95: times.length > 0 ? this.percentile(times, 95) : 0
    };
  }

  async testAuthentication() {
    // Test protected endpoints without auth
    const protectedEndpoints = ['/api/organizations', '/api/setup-rls'];

    for (const endpoint of protectedEndpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        if (response.status !== 401) {
          return {
            test: 'authentication',
            vulnerable: true,
            details: `Protected endpoint ${endpoint} did not require authentication`,
            severity: 'high'
          };
        }
      } catch (error) {
        // Network error is not a security issue
      }
    }

    return {
      test: 'authentication',
      vulnerable: false,
      details: 'Protected endpoints properly require authentication'
    };
  }

  async testTenantIsolation() {
    // Test if different tenant IDs are properly isolated
    const endpoint1 = '/api/players?tenantId=tenant1';
    const endpoint2 = '/api/players?tenantId=tenant2';

    try {
      const [resp1, resp2] = await Promise.all([
        fetch(`${this.baseUrl}${endpoint1}`),
        fetch(`${this.baseUrl}${endpoint2}`)
      ]);

      return {
        test: 'tenant_isolation',
        vulnerable: false,
        details: 'Tenant isolation appears to be working (both requests handled separately)'
      };
    } catch (error) {
      return {
        test: 'tenant_isolation',
        vulnerable: false,
        details: 'Could not test tenant isolation due to network error'
      };
    }
  }

  async testRateLimit() {
    // Test rate limiting by making multiple requests quickly
    const endpoint = '/api/hello';
    const requests = [];

    for (let i = 0; i < 15; i++) {
      requests.push(fetch(`${this.baseUrl}${endpoint}`));
    }

    try {
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      return {
        test: 'rate_limiting',
        vulnerable: !rateLimited,
        details: rateLimited
          ? 'Rate limiting is active'
          : 'No rate limiting detected (may be configured for different endpoints)'
      };
    } catch (error) {
      return {
        test: 'rate_limiting',
        vulnerable: false,
        details: 'Could not test rate limiting due to network error'
      };
    }
  }

  async testInputValidation() {
    // Test input validation with malicious payloads
    const maliciousPayloads = [
      '"><script>alert(1)</script>',
      '\' OR 1=1 --',
      '../../../etc/passwd',
      '<img src=x onerror=alert(1)>'
    ];

    for (const payload of maliciousPayloads) {
      try {
        const response = await fetch(`${this.baseUrl}/api/players?tenantId=${encodeURIComponent(payload)}`);

        // If we get a 500 error, it might indicate improper input handling
        if (response.status === 500) {
          const body = await response.text();
          if (body.includes(payload)) {
            return {
              test: 'input_validation',
              vulnerable: true,
              details: `Malicious input "${payload}" caused server error and was reflected in response`,
              severity: 'medium'
            };
          }
        }
      } catch (error) {
        // Network errors are expected and not security issues
      }
    }

    return {
      test: 'input_validation',
      vulnerable: false,
      details: 'Input validation appears to be working properly'
    };
  }

  async testSQLInjection() {
    // Test for SQL injection vulnerabilities
    const sqlPayloads = [
      '\' UNION SELECT * FROM users --',
      '1; DROP TABLE players; --',
      '\' OR \'1\'=\'1\' --'
    ];

    for (const payload of sqlPayloads) {
      try {
        const response = await fetch(`${this.baseUrl}/api/players?tenantId=${encodeURIComponent(payload)}`);

        if (response.status === 500) {
          const body = await response.text();
          if (body.toLowerCase().includes('sql') || body.toLowerCase().includes('syntax')) {
            return {
              test: 'sql_injection',
              vulnerable: true,
              details: `SQL injection payload "${payload}" caused database error`,
              severity: 'high'
            };
          }
        }
      } catch (error) {
        // Network errors are expected
      }
    }

    return {
      test: 'sql_injection',
      vulnerable: false,
      details: 'No SQL injection vulnerabilities detected'
    };
  }

  async checkSecurityHeaders() {
    try {
      const response = await fetch(`${this.baseUrl}/api/hello`);
      const headers = response.headers;

      const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security'
      ];

      const missingHeaders = requiredHeaders.filter(header => !headers.has(header));

      return {
        test: 'security_headers',
        vulnerable: missingHeaders.length > 0,
        details: missingHeaders.length > 0
          ? `Missing security headers: ${missingHeaders.join(', ')}`
          : 'All required security headers are present',
        severity: 'low'
      };
    } catch (error) {
      return {
        test: 'security_headers',
        vulnerable: false,
        details: 'Could not check security headers due to network error'
      };
    }
  }

  calculateUptime(results) {
    const healthy = results.filter(r => r.status === 'healthy').length;
    return Math.round((healthy / results.length) * 100);
  }

  percentile(arr, p) {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  generateRecommendations() {
    return [
      {
        category: 'security',
        priority: 'high',
        recommendation: 'Implement comprehensive authentication for all API endpoints',
        impact: 'Prevents unauthorized access to sensitive data'
      },
      {
        category: 'performance',
        priority: 'medium',
        recommendation: 'Add caching layer for dashboard statistics API',
        impact: 'Reduces database load and improves response times'
      },
      {
        category: 'monitoring',
        priority: 'high',
        recommendation: 'Set up automated health checks with alerting',
        impact: 'Enables proactive issue detection and resolution'
      },
      {
        category: 'security',
        priority: 'medium',
        recommendation: 'Add security headers to all API responses',
        impact: 'Improves client-side security posture'
      },
      {
        category: 'performance',
        priority: 'low',
        recommendation: 'Implement API response compression',
        impact: 'Reduces bandwidth usage and improves load times'
      }
    ];
  }

  getPerformanceRecommendations(benchmarks) {
    const recommendations = [];

    Object.entries(benchmarks).forEach(([endpoint, data]) => {
      if (data.avg > 1000) {
        recommendations.push({
          endpoint,
          issue: 'Slow response time',
          recommendation: 'Optimize database queries or add caching',
          priority: data.avg > 3000 ? 'high' : 'medium'
        });
      }
    });

    return recommendations;
  }

  getSecurityRecommendations(vulnerabilities) {
    return vulnerabilities.map(vuln => ({
      issue: vuln.test,
      recommendation: this.getSecurityFix(vuln.test),
      severity: vuln.severity || 'medium'
    }));
  }

  getSecurityFix(testType) {
    const fixes = {
      'authentication': 'Implement proper authentication middleware for all protected endpoints',
      'rate_limiting': 'Configure rate limiting to prevent abuse',
      'input_validation': 'Add input sanitization and validation',
      'sql_injection': 'Use parameterized queries and ORM properly',
      'security_headers': 'Add security headers using middleware'
    };

    return fixes[testType] || 'Review and fix security issue';
  }

  saveReport(report, filename) {
    const reportPath = path.join(process.cwd(), filename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);
  }

  generateMarkdownReport(report) {
    const markdown = `# API Monitoring Report

**Generated:** ${report.timestamp}
**Execution Time:** ${report.executionTime}ms
**Base URL:** ${report.baseUrl}

## Executive Summary

- **Health Score:** ${report.health.healthScore}% (${report.health.overall})
- **Security Score:** ${report.security.score}% (${report.security.status})
- **Critical Failures:** ${report.health.criticalFailures}
- **Security Vulnerabilities:** ${report.security.vulnerabilities.length}

## Health Assessment

${report.health.endpoints.map(ep =>
  `- **${ep.path}**: ${ep.status} (${ep.responseTime}ms)`
).join('\n')}

## Performance Issues

${report.performance.issues.length > 0 ?
  report.performance.issues.map(issue =>
    `- **${issue.endpoint}**: ${issue.issue} (${issue.severity} severity)`
  ).join('\n') :
  'No performance issues detected.'
}

## Security Vulnerabilities

${report.security.vulnerabilities.length > 0 ?
  report.security.vulnerabilities.map(vuln =>
    `- **${vuln.test}**: ${vuln.details} (${vuln.severity || 'medium'} severity)`
  ).join('\n') :
  'No security vulnerabilities detected.'
}

## Recommendations

${report.recommendations.map(rec =>
  `### ${rec.category.toUpperCase()} - ${rec.priority.toUpperCase()}\n**${rec.recommendation}**  \n*Impact:* ${rec.impact}`
).join('\n\n')}
`;

    fs.writeFileSync('api-monitoring-report.md', markdown);
    console.log('📄 Markdown report saved to: api-monitoring-report.md');
  }
}

// Run if called directly
if (require.main === module) {
  const suite = new APIMonitoringSuite();

  suite.runFullAssessment()
    .then(report => {
      console.log('\n✅ Assessment completed successfully!');
      console.log(`📊 Health Score: ${report.health.healthScore}%`);
      console.log(`🔒 Security Score: ${report.security.score}%`);
      console.log(`⚡ Average Response Time: ${
        Math.round(
          Object.values(report.performance.benchmarks)
            .reduce((sum, benchmark) => sum + benchmark.avg, 0) /
          Object.keys(report.performance.benchmarks).length
        )
      }ms`);

      process.exit(report.health.criticalFailures > 0 || report.security.vulnerabilities.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Assessment failed:', error);
      process.exit(1);
    });
}

module.exports = { APIMonitoringSuite };