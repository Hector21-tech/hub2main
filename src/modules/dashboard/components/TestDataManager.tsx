'use client'

import { useState, useEffect } from 'react'
import { Trash2, TestTube, AlertTriangle, Loader2, Plus, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useTenantSlug } from '@/lib/hooks/useTenantSlug'

interface TestDataStats {
  testRequests: number
  testPlayers: number
  testTrials: number
  totalTestData: number
  hasTestData: boolean
}

export function TestDataManager() {
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<TestDataStats | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const { userTenants } = useAuth()
  const { tenantId } = useTenantSlug()

  const checkTestData = async () => {
    if (!tenantId) return

    try {
      const { apiFetch } = await import('@/lib/api-config')
      const response = await apiFetch(`/api/clear-test-data?tenantId=${tenantId}`)
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Failed to check test data:', error)
    }
  }

  const createTestData = async () => {
    if (!tenantId) return

    setIsLoading(true)
    try {
      const { apiFetch } = await import('@/lib/api-config')
      const response = await apiFetch('/api/test-window-data', {
        method: 'POST',
        body: JSON.stringify({ tenantId })
      })
      const result = await response.json()

      if (result.success) {
        alert(`✅ Test data created! ${result.data.requestsCreated} requests, ${result.data.playersCreated} players, ${result.data.trialsCreated} trials`)
        await checkTestData()
        // Refresh the page to show new data
        window.location.reload()
      } else {
        alert('❌ Failed to create test data: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to create test data:', error)
      alert('❌ Failed to create test data')
    } finally {
      setIsLoading(false)
    }
  }

  const clearTestData = async () => {
    if (!tenantId) return

    setIsLoading(true)
    setShowConfirm(false)

    try {
      const { apiFetch } = await import('@/lib/api-config')
      const response = await apiFetch('/api/clear-test-data', {
        method: 'POST',
        body: JSON.stringify({ tenantId })
      })
      const result = await response.json()

      if (result.success) {
        alert(`✅ Test data cleared! Deleted ${result.data.totalDeleted} items`)
        await checkTestData()
        // Refresh the page to update dashboard
        window.location.reload()
      } else {
        alert('❌ Failed to clear test data: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to clear test data:', error)
      alert('❌ Failed to clear test data')
    } finally {
      setIsLoading(false)
    }
  }

  // Check test data on component mount
  useEffect(() => {
    if (tenantId) {
      checkTestData()
    }
  }, [tenantId]) // Only run when tenantId changes

  if (!stats) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
        <Loader2 className="w-4 h-4 animate-spin text-white/60" />
        <span className="text-sm text-white/60">Checking test data...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Test Data Info */}
      {stats.hasTestData && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 rounded-lg border border-yellow-400/20">
          <TestTube className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-yellow-300">
            {stats.totalTestData} test items active
          </span>
        </div>
      )}

      {/* Create Test Data Button */}
      {!stats.hasTestData && (
        <button
          onClick={createTestData}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors text-sm font-medium"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Create Test Data
        </button>
      )}

      {/* Clear Test Data Button */}
      {stats.hasTestData && !showConfirm && (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Clear Test Data
        </button>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-lg border border-red-400/20">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-300">Delete {stats.totalTestData} items?</span>
          <button
            onClick={clearTestData}
            disabled={isLoading}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
          >
            {isLoading ? 'Deleting...' : 'Yes'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}