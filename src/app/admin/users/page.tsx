'use client'

export default function UsersAdmin() {
  // Placeholder user data
  const placeholderUsers = [
    { id: '1', email: 'admin@elitesports.com', name: 'John Smith', tenant: 'Elite Sports', role: 'OWNER', lastActive: '--' },
    { id: '2', email: 'scout@premier.com', name: 'Sarah Johnson', tenant: 'Premier Scout', role: 'SCOUT', lastActive: '--' },
    { id: '3', email: 'manager@youth.com', name: 'Mike Wilson', tenant: 'Youth Development', role: 'MANAGER', lastActive: '--' }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage user accounts and permissions</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            Export Users
          </button>
          <button className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors">
            Invite User
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white border border-gray-200 rounded p-6">
          <p className="text-sm font-medium text-gray-600">Total Users</p>
          <p className="text-2xl font-mono font-medium text-gray-900 mt-1">--</p>
        </div>
        <div className="bg-white border border-gray-200 rounded p-6">
          <p className="text-sm font-medium text-gray-600">Active (30d)</p>
          <p className="text-2xl font-mono font-medium text-gray-900 mt-1">--</p>
        </div>
        <div className="bg-white border border-gray-200 rounded p-6">
          <p className="text-sm font-medium text-gray-600">Owners</p>
          <p className="text-2xl font-mono font-medium text-gray-900 mt-1">--</p>
        </div>
        <div className="bg-white border border-gray-200 rounded p-6">
          <p className="text-sm font-medium text-gray-600">Admins</p>
          <p className="text-2xl font-mono font-medium text-gray-900 mt-1">--</p>
        </div>
        <div className="bg-white border border-gray-200 rounded p-6">
          <p className="text-sm font-medium text-gray-600">Scouts</p>
          <p className="text-2xl font-mono font-medium text-gray-900 mt-1">--</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
            <input
              type="text"
              placeholder="Email or name..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tenant</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500">
              <option value="">All Tenants</option>
              <option value="elite">Elite Sports</option>
              <option value="premier">Premier Scout</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500">
              <option value="">All Roles</option>
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="SCOUT">Scout</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500">
              <option value="">All Users</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">All Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Primary Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {placeholderUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.tenant}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'OWNER'
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'ADMIN'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 font-mono">{user.lastActive}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-gray-600 hover:text-gray-900 mr-4">View</button>
                    <button className="text-gray-600 hover:text-gray-900 mr-4">Impersonate</button>
                    <button className="text-red-600 hover:text-red-700">Suspend</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">User data will be loaded from database in Phase 2</p>
        </div>
      </div>
    </div>
  )
}