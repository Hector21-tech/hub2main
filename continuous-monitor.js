#!/usr/bin/env node
/**
 * Continuous API Monitoring System for Scout Hub 2
 * Provides real-time health checks, alerting, and automated issue detection
 */

const fs = require('fs');
const path = require('path');

class ContinuousMonitor {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3002';
    this.interval = options.interval || 60000; // 1 minute default
    this.alertThresholds = {
      responseTime: options.responseTimeThreshold || 2000,
      errorRate: options.errorRateThreshold || 0.1, // 10% error rate
      uptimeTarget: options.uptimeTarget || 99.0 // 99% uptime
    };

    this.isRunning = false;
    this.intervalId = null;
    this.metrics = {
      startTime: Date.now(),
      totalChecks: 0,
      totalErrors: 0,
      responseTimes: [],
      endpoints: {},
      alerts: [],
      uptime: 100
    };

    // Critical endpoints to monitor
    this.endpoints = [
      {
        path: '/api/hello',
        name: 'Health Check',
        critical: true,
        timeout: 5000
      },
      {
        path: '/api/test-db',
        name: 'Database Connection',
        critical: true,
        timeout: 10000
      },
      {
        path: '/api/players?tenantId=cluqp37cs000108l59hl79k1l',
        name: 'Players API',
        critical: true,
        timeout: 8000
      },
      {
        path: '/api/requests?tenantId=cluqp37cs000108l59hl79k1l',
        name: 'Requests API',
        critical: true,
        timeout: 8000
      },
      {
        path: '/api/dashboard/stats?tenantId=cluqp37cs000108l59hl79k1l',
        name: 'Dashboard Stats',
        critical: false,
        timeout: 15000
      }
    ];

    // Initialize endpoint metrics
    this.endpoints.forEach(endpoint => {
      this.metrics.endpoints[endpoint.path] = {
        name: endpoint.name,
        checks: 0,
        errors: 0,
        responseTimes: [],
        lastCheck: null,
        status: 'unknown',
        uptime: 100
      };
    });
  }

  async start() {
    if (this.isRunning) {
      console.log('🔄 Monitor is already running');
      return;
    }

    console.log('🚀 Starting Continuous API Monitor...');
    console.log(`📍 Base URL: ${this.baseUrl}`);
    console.log(`⏰ Check Interval: ${this.interval / 1000}s`);
    console.log(`🎯 Monitoring ${this.endpoints.length} endpoints`);
    console.log('');

    this.isRunning = true;

    // Initial check
    await this.performHealthCheck();

    // Start continuous monitoring
    this.intervalId = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ Monitor error:', error);
      }
    }, this.interval);

    // Setup graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    console.log('✅ Monitor started successfully');
    console.log('Press Ctrl+C to stop monitoring');
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('\n🛑 Stopping monitor...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Generate final report
    await this.generateReport();
    console.log('✅ Monitor stopped successfully');
    process.exit(0);
  }

  async performHealthCheck() {
    const checkStartTime = Date.now();
    const checkResults = [];

    console.log(`🔍 ${new Date().toLocaleTimeString()} - Performing health check...`);

    // Check all endpoints in parallel
    const promises = this.endpoints.map(endpoint => this.checkEndpoint(endpoint));
    const results = await Promise.allSettled(promises);

    let criticalFailures = 0;
    let totalResponseTime = 0;
    let healthyEndpoints = 0;

    results.forEach((result, index) => {
      const endpoint = this.endpoints[index];
      const metrics = this.metrics.endpoints[endpoint.path];

      if (result.status === 'fulfilled') {
        const checkResult = result.value;
        metrics.checks++;
        metrics.lastCheck = new Date().toISOString();
        metrics.responseTimes.push(checkResult.responseTime);

        // Keep only last 100 response times for memory efficiency
        if (metrics.responseTimes.length > 100) {
          metrics.responseTimes = metrics.responseTimes.slice(-100);
        }

        if (checkResult.healthy) {
          metrics.status = 'healthy';
          healthyEndpoints++;
          totalResponseTime += checkResult.responseTime;

          console.log(`  ✅ ${endpoint.name}: ${checkResult.responseTime}ms`);
        } else {
          metrics.status = 'unhealthy';
          metrics.errors++;

          if (endpoint.critical) {
            criticalFailures++;
          }

          console.log(`  ❌ ${endpoint.name}: ${checkResult.error || 'Failed'}`);
          this.triggerAlert('endpoint_failure', {
            endpoint: endpoint.name,
            path: endpoint.path,
            error: checkResult.error,
            critical: endpoint.critical
          });
        }

        // Update endpoint uptime
        metrics.uptime = ((metrics.checks - metrics.errors) / metrics.checks) * 100;

        checkResults.push({
          endpoint: endpoint.path,
          name: endpoint.name,
          healthy: checkResult.healthy,
          responseTime: checkResult.responseTime,
          error: checkResult.error
        });

      } else {
        metrics.errors++;
        metrics.status = 'error';
        console.log(`  💥 ${endpoint.name}: Monitor error`);

        if (endpoint.critical) {
          criticalFailures++;
        }
      }
    });

    // Update global metrics
    this.metrics.totalChecks++;
    this.metrics.totalErrors += criticalFailures;

    if (healthyEndpoints > 0) {
      this.metrics.responseTimes.push(totalResponseTime / healthyEndpoints);
    }

    // Keep only last 1000 response times
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000);
    }

    // Update global uptime
    this.metrics.uptime = ((this.metrics.totalChecks - this.metrics.totalErrors) / this.metrics.totalChecks) * 100;

    // Check for alerts
    await this.checkAlertConditions(checkResults, totalResponseTime / healthyEndpoints || 0);

    const checkDuration = Date.now() - checkStartTime;
    console.log(`📊 Check completed in ${checkDuration}ms | Healthy: ${healthyEndpoints}/${this.endpoints.length} | Uptime: ${this.metrics.uptime.toFixed(1)}%\n`);
  }

  async checkEndpoint(endpoint) {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

      const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Scout-Hub-Monitor/1.0'
        }
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const healthy = response.status >= 200 && response.status < 400;

      return {
        healthy,
        responseTime,
        httpStatus: response.status,
        error: healthy ? null : `HTTP ${response.status}`
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        healthy: false,
        responseTime,
        httpStatus: null,
        error: error.name === 'AbortError' ? 'Timeout' : error.message
      };
    }
  }

  async checkAlertConditions(checkResults, avgResponseTime) {
    // Check response time threshold
    if (avgResponseTime > this.alertThresholds.responseTime) {
      this.triggerAlert('slow_response', {
        avgResponseTime,
        threshold: this.alertThresholds.responseTime
      });
    }

    // Check error rate
    const errorRate = this.metrics.totalErrors / this.metrics.totalChecks;
    if (errorRate > this.alertThresholds.errorRate) {
      this.triggerAlert('high_error_rate', {
        errorRate: errorRate * 100,
        threshold: this.alertThresholds.errorRate * 100
      });
    }

    // Check uptime
    if (this.metrics.uptime < this.alertThresholds.uptimeTarget) {
      this.triggerAlert('low_uptime', {
        uptime: this.metrics.uptime,
        target: this.alertThresholds.uptimeTarget
      });
    }
  }

  triggerAlert(type, data) {
    const alert = {
      timestamp: new Date().toISOString(),
      type,
      data,
      id: Date.now().toString()
    };

    this.metrics.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts = this.metrics.alerts.slice(-100);
    }

    // Log alert
    console.log(`🚨 ALERT [${type.toUpperCase()}]: ${this.formatAlert(alert)}`);

    // In a real system, you would send this to your alerting system
    // (Slack, PagerDuty, email, etc.)
  }

  formatAlert(alert) {
    switch (alert.type) {
      case 'endpoint_failure':
        return `${alert.data.endpoint} failed - ${alert.data.error}${alert.data.critical ? ' (CRITICAL)' : ''}`;
      case 'slow_response':
        return `Average response time ${Math.round(alert.data.avgResponseTime)}ms exceeds threshold ${alert.data.threshold}ms`;
      case 'high_error_rate':
        return `Error rate ${alert.data.errorRate.toFixed(1)}% exceeds threshold ${alert.data.threshold}%`;
      case 'low_uptime':
        return `Uptime ${alert.data.uptime.toFixed(1)}% below target ${alert.data.target}%`;
      default:
        return JSON.stringify(alert.data);
    }
  }

  async generateReport() {
    const runDuration = Date.now() - this.metrics.startTime;

    const report = {
      timestamp: new Date().toISOString(),
      runDuration,
      summary: {
        totalChecks: this.metrics.totalChecks,
        totalErrors: this.metrics.totalErrors,
        uptime: this.metrics.uptime,
        avgResponseTime: this.metrics.responseTimes.length > 0
          ? Math.round(this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length)
          : 0
      },
      endpoints: Object.entries(this.metrics.endpoints).map(([path, metrics]) => ({
        path,
        name: metrics.name,
        checks: metrics.checks,
        errors: metrics.errors,
        uptime: metrics.uptime,
        avgResponseTime: metrics.responseTimes.length > 0
          ? Math.round(metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length)
          : 0,
        status: metrics.status
      })),
      alerts: this.metrics.alerts.slice(-10), // Last 10 alerts
      recommendations: this.generateRecommendations()
    };

    // Save report
    const reportPath = 'monitoring-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 MONITORING SUMMARY');
    console.log('='.repeat(50));
    console.log(`⏱️  Run Duration: ${Math.round(runDuration / 1000)}s`);
    console.log(`🔍 Total Checks: ${report.summary.totalChecks}`);
    console.log(`❌ Total Errors: ${report.summary.totalErrors}`);
    console.log(`📈 Uptime: ${report.summary.uptime.toFixed(1)}%`);
    console.log(`⚡ Avg Response: ${report.summary.avgResponseTime}ms`);
    console.log(`🚨 Alerts: ${this.metrics.alerts.length}`);
    console.log(`📄 Report saved to: ${reportPath}`);
  }

  generateRecommendations() {
    const recommendations = [];

    // Check for performance issues
    Object.entries(this.metrics.endpoints).forEach(([path, metrics]) => {
      if (metrics.responseTimes.length > 0) {
        const avgTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
        if (avgTime > 1000) {
          recommendations.push({
            type: 'performance',
            endpoint: path,
            issue: `Slow response time (${Math.round(avgTime)}ms average)`,
            recommendation: 'Consider optimizing queries, adding caching, or scaling infrastructure'
          });
        }
      }

      if (metrics.uptime < 95) {
        recommendations.push({
          type: 'reliability',
          endpoint: path,
          issue: `Low uptime (${metrics.uptime.toFixed(1)}%)`,
          recommendation: 'Investigate error patterns and improve error handling'
        });
      }
    });

    return recommendations;
  }

  // Method to get current status (for API endpoint)
  getCurrentStatus() {
    return {
      isRunning: this.isRunning,
      uptime: this.metrics.uptime,
      totalChecks: this.metrics.totalChecks,
      totalErrors: this.metrics.totalErrors,
      endpoints: Object.entries(this.metrics.endpoints).map(([path, metrics]) => ({
        path,
        name: metrics.name,
        status: metrics.status,
        uptime: metrics.uptime,
        lastCheck: metrics.lastCheck
      })),
      recentAlerts: this.metrics.alerts.slice(-5)
    };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];

    switch (key) {
      case 'interval':
        options.interval = parseInt(value) * 1000;
        break;
      case 'url':
        options.baseUrl = value;
        break;
      case 'response-threshold':
        options.responseTimeThreshold = parseInt(value);
        break;
      case 'error-threshold':
        options.errorRateThreshold = parseFloat(value);
        break;
    }
  }

  const monitor = new ContinuousMonitor(options);
  monitor.start().catch(error => {
    console.error('💥 Failed to start monitor:', error);
    process.exit(1);
  });
}

module.exports = { ContinuousMonitor };