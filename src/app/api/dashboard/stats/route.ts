import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { validateSupabaseTenantAccess, createTenantSupabaseClient } from '@/lib/supabase/tenant-validation'
import { cache, CacheKeys, CacheTTL, withCache } from '@/lib/cache'
import { createSecureResponse, createSecureErrorResponse } from '@/lib/security-headers'

const prisma = new PrismaClient()

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Mock data helper function
function getMockDashboardStats() {
  return {
    overview: {
      totalPlayers: 24,
      totalRequests: 8,
      totalTrials: 15,
      successRate: 78
    },
    players: {
      total: 24,
      thisMonth: 6,
      growth: 33,
      byPosition: {
        'CF': 4,
        'LW': 3,
        'RW': 3,
        'CAM': 2,
        'CM': 4,
        'CDM': 2,
        'LB': 2,
        'RB': 2,
        'CB': 2
      },
      recent: []
    },
    requests: {
      total: 8,
      active: 5,
      byStatus: {
        'OPEN': 3,
        'IN_PROGRESS': 2,
        'COMPLETED': 2,
        'CANCELLED': 1
      },
      byCountry: {
        'Sweden': 3,
        'Norway': 2,
        'Denmark': 2,
        'Finland': 1
      },
      recent: []
    },
    trials: {
      total: 15,
      upcoming: 4,
      completed: 9,
      pendingEvaluations: 2,
      next7Days: 3,
      successRate: 78,
      recent: []
    },
    transferWindows: {
      active: 2,
      upcoming: 1,
      expiring: 1
    },
    alerts: [
      {
        type: 'info',
        message: '2 trials awaiting evaluation'
      },
      {
        type: 'warning',
        message: '1 transfer window closing in next 7 days'
      }
    ],
    lastUpdated: new Date().toISOString()
  }
}

// GET - Dashboard analytics and stats
export async function GET(request: NextRequest) {
  console.log('🔍 Dashboard Stats API: Incoming request')
  try {
    const tenantSlug = request.nextUrl.searchParams.get('tenant')
    console.log('🔍 Dashboard Stats API: tenant slug:', tenantSlug)

    if (!tenantSlug) {
      console.log('❌ Dashboard Stats API: Missing tenant parameter')
      return createSecureErrorResponse('tenant parameter is required', 400)
    }

    // 🎭 Feature Flag: Dashboard Mock Data
    const isDashboardMockEnabled = process.env.FEATURE_DASHBOARD_MOCK === '1'

    if (isDashboardMockEnabled) {
      console.warn('🎭 Dashboard Mock: Using mock data (FEATURE_DASHBOARD_MOCK=1)')

      // 🔄 Hybrid Feature: Live Players Count
      const isPlayersLive = process.env.FEATURE_DASHBOARD_PLAYERS_LIVE === '1'
      let playersCount = 24 // Mock fallback
      let dataSource = 'mock'

      if (isPlayersLive) {
        try {
          // Validate tenant access for live data
          const validation = await validateSupabaseTenantAccess(tenantSlug)
          if (validation.success) {
            console.log('🔄 Fetching live players count for tenant:', validation.tenantId)
            const supabase = createTenantSupabaseClient()
            const { count, error } = await supabase
              .from('players')
              .select('*', { count: 'exact', head: true })
              .eq('tenantId', validation.tenantId)

            if (error) throw error

            playersCount = count || 0
            dataSource = 'database'
            console.log('✅ Live players count:', playersCount)
          } else {
            console.warn('⚠️ Tenant validation failed for live data:', validation.reason)
            dataSource = 'mock-fallback'
          }
        } catch (error) {
          console.warn('⚠️ Players count fallback to mock:', error instanceof Error ? error.message : 'Unknown error')
          dataSource = 'mock-fallback'
        }
      }

      const mockStats = {
        ...getMockDashboardStats(),
        overview: {
          ...getMockDashboardStats().overview,
          totalPlayers: playersCount
        },
        players: {
          ...getMockDashboardStats().players,
          total: playersCount
        },
        meta: {
          source: dataSource,
          playersLive: isPlayersLive,
          hybrid: isPlayersLive,
          reason: dataSource === 'database' ? 'success' :
                  dataSource === 'mock-fallback' ? 'database_error' : 'disabled'
        }
      }

      // Return mock data with special headers
      const response = createSecureResponse({
        success: true,
        data: mockStats,
        mock: true
      })

      // Add mock data header
      response.headers.set('X-Mock-Data', 'dashboard-stats')

      return response
    }

    // Normal flow: Validate user has access to this tenant via Supabase RLS
    console.log('🔍 Dashboard Stats API: Validating tenant access...')
    const validation = await validateSupabaseTenantAccess(tenantSlug)

    if (!validation.success) {
      console.log('❌ Dashboard Stats API: Tenant access denied:', validation.reason, validation.message)
      // Return mock data with error reason instead of throwing 401
      return createSecureResponse({
        success: true,
        data: getMockDashboardStats(),
        mock: true,
        meta: {
          source: 'mock-fallback',
          reason: validation.reason,
          message: validation.message
        }
      })
    }

    const tenantId = validation.tenantId
    console.log('✅ Dashboard Stats API: Tenant access validated for:', tenantId)

    // Check cache first
    const cacheKey = CacheKeys.dashboardStats(tenantId)
    const cachedStats = cache.get(cacheKey)
    if (cachedStats) {
      console.log('✅ Dashboard Stats API: Returning cached data')
      return createSecureResponse({
        success: true,
        data: cachedStats,
        cached: true
      })
    }

    console.log('🔍 Dashboard Stats API: Fetching fresh data...')

    // Date ranges for calculations
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const next7Days = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))

    // Parallel database queries for performance
    const [
      // Players stats
      totalPlayers,
      playersThisMonth,
      playersLastMonth,
      playersByPosition,
      recentPlayers,

      // Requests stats
      totalRequests,
      activeRequests,
      requestsByStatus,
      requestsByCountry,
      recentRequests,

      // Trials stats
      totalTrials,
      upcomingTrials,
      completedTrials,
      pendingEvaluations,
      trialsNext7Days,
      recentTrials,

      // Transfer windows
      activeWindows,
      upcomingWindows
    ] = await Promise.all([
      // Players queries
      prisma.player.count({ where: { tenantId } }),
      prisma.player.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth }
        }
      }),
      prisma.player.count({
        where: {
          tenantId,
          createdAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth
          }
        }
      }),
      prisma.player.groupBy({
        by: ['position'],
        where: { tenantId },
        _count: { position: true }
      }),
      prisma.player.findMany({
        where: { tenantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          club: true,
          rating: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),

      // Requests queries
      prisma.request.count({ where: { tenantId } }),
      prisma.request.count({
        where: {
          tenantId,
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      }),
      prisma.request.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true }
      }),
      prisma.request.groupBy({
        by: ['country'],
        where: { tenantId },
        _count: { country: true }
      }),
      prisma.request.findMany({
        where: { tenantId },
        select: {
          id: true,
          title: true,
          club: true,
          country: true,
          status: true,
          priority: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),

      // Trials queries
      prisma.trial.count({ where: { tenantId } }),
      prisma.trial.count({
        where: {
          tenantId,
          status: 'SCHEDULED',
          scheduledAt: { gte: now }
        }
      }),
      prisma.trial.count({
        where: {
          tenantId,
          status: 'COMPLETED'
        }
      }),
      prisma.trial.count({
        where: {
          tenantId,
          status: 'COMPLETED',
          rating: null
        }
      }),
      prisma.trial.count({
        where: {
          tenantId,
          scheduledAt: {
            gte: now,
            lte: next7Days
          }
        }
      }),
      prisma.trial.findMany({
        where: { tenantId },
        select: {
          id: true,
          scheduledAt: true,
          location: true,
          status: true,
          rating: true,
          createdAt: true,
          player: {
            select: {
              firstName: true,
              lastName: true,
              position: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),

      // Transfer windows (requests with window data)
      prisma.request.count({
        where: {
          tenantId,
          windowOpenAt: { lte: now },
          windowCloseAt: { gte: now }
        }
      }),
      prisma.request.count({
        where: {
          tenantId,
          windowOpenAt: { gt: now }
        }
      })
    ])

    // Calculate trends
    const playersGrowth = playersLastMonth > 0
      ? Math.round(((playersThisMonth - playersLastMonth) / playersLastMonth) * 100)
      : playersThisMonth > 0 ? 100 : 0

    // Calculate success rate (completed trials with ratings)
    const trialsWithRatings = await prisma.trial.count({
      where: {
        tenantId,
        status: 'COMPLETED',
        rating: { gte: 7 } // Consider 7+ as successful
      }
    })

    const successRate = completedTrials > 0
      ? Math.round((trialsWithRatings / completedTrials) * 100)
      : 0

    // Calculate alerts
    const alerts = []

    // Expiring windows in next 7 days
    const expiringWindows = await prisma.request.count({
      where: {
        tenantId,
        windowCloseAt: {
          gte: now,
          lte: next7Days
        }
      }
    })

    if (expiringWindows > 0) {
      alerts.push({
        type: 'warning',
        message: `${expiringWindows} transfer window${expiringWindows > 1 ? 's' : ''} closing in next 7 days`
      })
    }

    if (pendingEvaluations > 0) {
      alerts.push({
        type: 'info',
        message: `${pendingEvaluations} trial${pendingEvaluations > 1 ? 's' : ''} awaiting evaluation`
      })
    }

    // Build response
    const stats = {
      overview: {
        totalPlayers,
        totalRequests,
        totalTrials,
        successRate
      },
      players: {
        total: totalPlayers,
        thisMonth: playersThisMonth,
        growth: playersGrowth,
        byPosition: playersByPosition.reduce((acc, item) => {
          acc[item.position || 'Unknown'] = item._count.position
          return acc
        }, {} as Record<string, number>),
        recent: recentPlayers
      },
      requests: {
        total: totalRequests,
        active: activeRequests,
        byStatus: requestsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status
          return acc
        }, {} as Record<string, number>),
        byCountry: requestsByCountry.reduce((acc, item) => {
          acc[item.country || 'Unknown'] = item._count.country
          return acc
        }, {} as Record<string, number>),
        recent: recentRequests
      },
      trials: {
        total: totalTrials,
        upcoming: upcomingTrials,
        completed: completedTrials,
        pendingEvaluations,
        next7Days: trialsNext7Days,
        successRate,
        recent: recentTrials
      },
      transferWindows: {
        active: activeWindows,
        upcoming: upcomingWindows,
        expiring: expiringWindows
      },
      alerts,
      lastUpdated: now.toISOString()
    }

    // Cache the results
    cache.set(cacheKey, stats, CacheTTL.DASHBOARD_STATS)
    console.log('✅ Dashboard Stats API: Data cached for 2 minutes')

    return createSecureResponse({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    console.log('🔄 Dashboard Stats API: Falling back to mock data')

    // Return mock data instead of error for demo purposes
    return createSecureResponse({
      success: true,
      data: getMockDashboardStats(),
      mock: true,
      meta: {
        source: 'mock-fallback',
        reason: 'db_error',
        message: 'Database error occurred, using fallback data'
      }
    })
  }
}