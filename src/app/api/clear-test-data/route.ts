import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUser } from '@/lib/supabase/server'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Clearing all test data...')

    // Verify user is authenticated
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { tenantId } = body

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID is required'
      }, { status: 400 })
    }

    console.log('🎯 Clearing test data for tenant:', tenantId)

    // Count test data before deletion
    const [testRequests, testPlayers, testTrials] = await Promise.all([
      prisma.request.count({
        where: {
          tenantId,
          title: {
            startsWith: 'TEST:'
          }
        }
      }),
      prisma.player.count({
        where: {
          tenantId,
          firstName: {
            startsWith: 'TEST'
          }
        }
      }),
      prisma.trial.count({
        where: {
          tenantId,
          location: {
            startsWith: 'TEST:'
          }
        }
      })
    ])

    console.log(`📊 Found test data: ${testRequests} requests, ${testPlayers} players, ${testTrials} trials`)

    // Delete test data in correct order (due to foreign key constraints)
    // 1. Delete trials first (references players and requests)
    const deletedTrials = await prisma.trial.deleteMany({
      where: {
        tenantId,
        location: {
          startsWith: 'TEST:'
        }
      }
    })

    // 2. Delete requests
    const deletedRequests = await prisma.request.deleteMany({
      where: {
        tenantId,
        title: {
          startsWith: 'TEST:'
        }
      }
    })

    // 3. Delete players
    const deletedPlayers = await prisma.player.deleteMany({
      where: {
        tenantId,
        firstName: {
          startsWith: 'TEST'
        }
      }
    })

    console.log(`✅ Deleted: ${deletedTrials.count} trials, ${deletedRequests.count} requests, ${deletedPlayers.count} players`)

    return NextResponse.json({
      success: true,
      message: 'All test data cleared successfully',
      data: {
        deletedTrials: deletedTrials.count,
        deletedRequests: deletedRequests.count,
        deletedPlayers: deletedPlayers.count,
        totalDeleted: deletedTrials.count + deletedRequests.count + deletedPlayers.count
      }
    })

  } catch (error) {
    console.error('❌ Failed to clear test data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to clear test data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to check how much test data exists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID is required'
      }, { status: 400 })
    }

    const [testRequests, testPlayers, testTrials] = await Promise.all([
      prisma.request.count({
        where: {
          tenantId,
          title: {
            startsWith: 'TEST:'
          }
        }
      }),
      prisma.player.count({
        where: {
          tenantId,
          firstName: {
            startsWith: 'TEST'
          }
        }
      }),
      prisma.trial.count({
        where: {
          tenantId,
          location: {
            startsWith: 'TEST:'
          }
        }
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        testRequests,
        testPlayers,
        testTrials,
        totalTestData: testRequests + testPlayers + testTrials,
        hasTestData: (testRequests + testPlayers + testTrials) > 0
      }
    })

  } catch (error) {
    console.error('❌ Failed to check test data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check test data'
    }, { status: 500 })
  }
}