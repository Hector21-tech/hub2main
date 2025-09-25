'use client'

export default function SupportAdmin() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-medium text-gray-900">Support Tools</h1>
        <p className="text-gray-600 mt-1">Debug issues and assist users</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="font-medium text-gray-900 mb-2">Tenant Impersonation</h3>
          <p className="text-sm text-gray-600 mb-4">Log in as any tenant for debugging</p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter tenant slug..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            <button className="w-full px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors">
              Impersonate
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="font-medium text-gray-900 mb-2">User Lookup</h3>
          <p className="text-sm text-gray-600 mb-4">Find user by email or ID</p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            <button className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
              Search User
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="font-medium text-gray-900 mb-2">Database Queries</h3>
          <p className="text-sm text-gray-600 mb-4">Run safe read-only queries</p>
          <div className="space-y-3">
            <select className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500">
              <option value="">Select query...</option>
              <option value="tenant-stats">Tenant Statistics</option>
              <option value="user-activity">User Activity</option>
              <option value="system-health">System Health</option>
            </select>
            <button className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
              Execute Query
            </button>
          </div>
        </div>
      </div>

      {/* Recent Support Cases */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Support Cases</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Support Cases</h3>
            <p className="text-gray-600">Support ticket integration will be added in Phase 2</p>
          </div>
        </div>
      </div>

      {/* System Logs */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">System Logs</h2>
          <div className="flex space-x-2">
            <select className="px-3 py-1 border border-gray-300 rounded text-sm">
              <option value="all">All Logs</option>
              <option value="error">Errors</option>
              <option value="auth">Authentication</option>
              <option value="api">API Calls</option>
            </select>
            <button className="px-3 py-1 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 transition-colors">
              Refresh
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-gray-50 rounded p-4 font-mono text-sm">
            <div className="space-y-2">
              <div className="text-gray-600">[2024-01-15 10:30:15] INFO: System startup complete</div>
              <div className="text-gray-600">[2024-01-15 10:30:16] INFO: Database connection established</div>
              <div className="text-gray-600">[2024-01-15 10:30:17] INFO: Authentication service ready</div>
              <div className="text-gray-600">[2024-01-15 10:30:18] INFO: Real-time logging will be implemented in Phase 2</div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Tools */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Debug Tools</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 border border-gray-200 rounded hover:bg-gray-50 transition-colors text-left">
              <h3 className="font-medium text-gray-900">Clear Cache</h3>
              <p className="text-sm text-gray-500 mt-1">Reset application cache</p>
            </button>
            <button className="p-4 border border-gray-200 rounded hover:bg-gray-50 transition-colors text-left">
              <h3 className="font-medium text-gray-900">Verify RLS Policies</h3>
              <p className="text-sm text-gray-500 mt-1">Check database security</p>
            </button>
            <button className="p-4 border border-gray-200 rounded hover:bg-gray-50 transition-colors text-left">
              <h3 className="font-medium text-gray-900">Test API Endpoints</h3>
              <p className="text-sm text-gray-500 mt-1">Validate API responses</p>
            </button>
            <button className="p-4 border border-gray-200 rounded hover:bg-gray-50 transition-colors text-left">
              <h3 className="font-medium text-gray-900">Export Debug Data</h3>
              <p className="text-sm text-gray-500 mt-1">Download system diagnostics</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}