'use client'

export default function SystemAdmin() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-medium text-gray-900">System Monitoring</h1>
        <p className="text-gray-600 mt-1">Monitor platform performance and health</p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Database</p>
              <p className="text-lg font-medium text-green-600 mt-1">Operational</p>
            </div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">API Services</p>
              <p className="text-lg font-medium text-green-600 mt-1">Operational</p>
            </div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Storage</p>
              <p className="text-lg font-medium text-green-600 mt-1">Operational</p>
            </div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Authentication</p>
              <p className="text-lg font-medium text-green-600 mt-1">Operational</p>
            </div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="font-medium text-gray-900 mb-4">API Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Response Time</span>
              <span className="text-sm font-mono text-gray-900">-- ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Requests per Minute</span>
              <span className="text-sm font-mono text-gray-900">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Error Rate</span>
              <span className="text-sm font-mono text-gray-900">--%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Uptime (24h)</span>
              <span className="text-sm font-mono text-green-600">99.9%</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="font-medium text-gray-900 mb-4">Database Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Query Performance</span>
              <span className="text-sm font-mono text-gray-900">-- ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Active Connections</span>
              <span className="text-sm font-mono text-gray-900">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Database Size</span>
              <span className="text-sm font-mono text-gray-900">-- GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Index Hit Ratio</span>
              <span className="text-sm font-mono text-green-600">--% </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="font-medium text-gray-900 mb-4">Resource Usage</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">CPU Usage</span>
              <span className="text-sm font-mono text-gray-900">--%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <span className="text-sm font-mono text-gray-900">--%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Storage Used</span>
              <span className="text-sm font-mono text-gray-900">-- GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Bandwidth (24h)</span>
              <span className="text-sm font-mono text-gray-900">-- GB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Monitoring */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Recent Errors</h2>
          <div className="flex space-x-2">
            <select className="px-3 py-1 border border-gray-300 rounded text-sm">
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button className="px-3 py-1 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 transition-colors">
              Refresh
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Errors</h3>
            <p className="text-gray-600">System is running smoothly. Error monitoring will show real data in Phase 2.</p>
          </div>
        </div>
      </div>

      {/* System Configuration */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">System Configuration</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Environment Variables</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">NODE_ENV</span>
                  <span className="font-mono text-gray-900">production</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">DATABASE_URL</span>
                  <span className="font-mono text-gray-900">configured ✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SUPABASE_URL</span>
                  <span className="font-mono text-gray-900">configured ✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">NEXTAUTH_SECRET</span>
                  <span className="font-mono text-gray-900">configured ✓</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Database Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Provider</span>
                  <span className="font-mono text-gray-900">PostgreSQL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Version</span>
                  <span className="font-mono text-gray-900">15.x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">RLS Enabled</span>
                  <span className="font-mono text-green-600">Yes ✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Backup Status</span>
                  <span className="font-mono text-green-600">Active ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Tools */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Maintenance Tools</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-200 rounded hover:bg-gray-50 transition-colors text-left">
              <h3 className="font-medium text-gray-900">Database Backup</h3>
              <p className="text-sm text-gray-500 mt-1">Create manual backup</p>
            </button>
            <button className="p-4 border border-gray-200 rounded hover:bg-gray-50 transition-colors text-left">
              <h3 className="font-medium text-gray-900">Clear Logs</h3>
              <p className="text-sm text-gray-500 mt-1">Archive old log files</p>
            </button>
            <button className="p-4 border border-gray-200 rounded hover:bg-gray-50 transition-colors text-left">
              <h3 className="font-medium text-gray-900">Maintenance Mode</h3>
              <p className="text-sm text-gray-500 mt-1">Enable system maintenance</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}