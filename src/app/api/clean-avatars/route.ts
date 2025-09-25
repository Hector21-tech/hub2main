import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Clean up invalid avatar paths from database
export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting avatar path cleanup...')

    // Find all players with non-null avatarPath
    const playersWithAvatars = await prisma.player.findMany({
      where: {
        avatarPath: {
          not: null
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarPath: true,
        tenantId: true
      }
    })

    console.log(`Found ${playersWithAvatars.length} players with avatar paths`)

    let cleanedCount = 0

    for (const player of playersWithAvatars) {
      if (!player.avatarPath) continue

      console.log(`Checking player: ${player.firstName} ${player.lastName} - Path: ${player.avatarPath}`)

      // Check if file exists in Supabase Storage
      try {
        const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/player-avatars/${player.avatarPath}`, {
          method: 'HEAD',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          }
        })

        if (checkResponse.status === 404) {
          // File doesn't exist, clean up the path
          await prisma.player.update({
            where: { id: player.id },
            data: { avatarPath: null }
          })

          console.log(`❌ Cleaned invalid path for ${player.firstName} ${player.lastName}: ${player.avatarPath}`)
          cleanedCount++
        } else if (checkResponse.ok) {
          console.log(`✅ Valid path for ${player.firstName} ${player.lastName}: ${player.avatarPath}`)
        } else {
          console.log(`⚠️ Unknown status ${checkResponse.status} for ${player.firstName} ${player.lastName}: ${player.avatarPath}`)
        }
      } catch (error) {
        console.error(`Error checking file for ${player.firstName} ${player.lastName}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Cleaned ${cleanedCount} invalid avatar paths.`,
      totalChecked: playersWithAvatars.length,
      cleaned: cleanedCount
    })

  } catch (error) {
    console.error('Avatar cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup avatar paths' },
      { status: 500 }
    )
  }
}