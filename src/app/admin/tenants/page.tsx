'use client'

export default function TenantsAdmin() {
  // Placeholder tenant data
  const placeholderTenants = [
    { id: '1', name: 'Elite Sports Academy', slug: 'elite-sports', users: '--', players: '--', status: 'Active' },
    { id: '2', name: 'Premier Scout Network', slug: 'premier-scout', users: '--', players: '--', status: 'Active' },
    { id: '3', name: 'Youth Development FC', slug: 'youth-dev', users: '--', players: '--', status: 'Trial' }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Tenant Management</h1>
          <p className="text-gray-600 mt-1">Manage organizations and their settings</p>
        </div>
        <button className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors">
          Create Tenant
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded p-6">
          <p className="text-sm font-medium text-gray-600">Total Tenants</p>
          <p className="text-2xl font-mono font-medium text-gray-900 mt-1">--</p>
        </div>
        <div className="bg-white border border-gray-200 rounded p-6">
          <p className="text-sm font-medium text-gray-600">Active Tenants</p>
          <p className="text-2xl font-mono font-medium text-gray-900 mt-1">--</p>
        </div>
        <div className="bg-white border border-gray-200 rounded p-6">
          <p className="text-sm font-medium text-gray-600">Trial Accounts</p>
          <p className="text-2xl font-mono font-medium text-gray-900 mt-1">--</p>
        </div>
        <div className="bg-white border border-gray-200 rounded p-6">
          <p className="text-sm font-medium text-gray-600">Suspended</p>
          <p className="text-2xl font-mono font-medium text-gray-900 mt-1">--</p>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">All Tenants</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Players
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {placeholderTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{tenant.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 font-mono">{tenant.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">{tenant.users}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">{tenant.players}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      tenant.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-gray-600 hover:text-gray-900 mr-4">View</button>
                    <button className="text-gray-600 hover:text-gray-900 mr-4">Edit</button>
                    <button className="text-red-600 hover:text-red-700">Suspend</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">Tenant data will be loaded from database in Phase 2</p>
        </div>
      </div>
    </div>
  )
}