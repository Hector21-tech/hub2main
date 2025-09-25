import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Use global Prisma instance in production to avoid connection issues
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting avatar migration...')

    // Find all players and filter for those with avatar tags
    // We need to get all players first since Prisma doesn't support startsWith on array elements
    const allPlayers = await prisma.player.findMany()

    // Filter to only include players that have avatar tags
    const playersToMigrate = allPlayers.filter(player =>
      player.tags.some(tag => tag.startsWith('avatar:'))
    )

    console.log(`📊 Found ${playersToMigrate.length} players with avatar tags`)

    let migratedCount = 0
    const migrationResults = []

    for (const player of playersToMigrate) {
      // Extract avatar URL from tags
      const avatarTag = player.tags.find(tag => tag.startsWith('avatar:'))

      if (avatarTag) {
        const avatarUrl = avatarTag.replace('avatar:', '')

        // Remove avatar tag from tags array
        const cleanedTags = player.tags.filter(tag => !tag.startsWith('avatar:'))

        // Update player with avatar URL in proper field and cleaned tags
        await prisma.player.update({
          where: { id: player.id },
          data: {
            avatarUrl: avatarUrl,
            tags: cleanedTags
          }
        })

        migrationResults.push({
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          avatarUrl: avatarUrl,
          tagsRemoved: player.tags.length - cleanedTags.length
        })

        migratedCount++
        console.log(`✅ Migrated ${player.firstName} ${player.lastName}: ${avatarUrl}`)
      }
    }

    console.log(`🎉 Migration completed! Migrated ${migratedCount} players`)

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${migratedCount} player avatars`,
      results: migrationResults,
      totalProcessed: playersToMigrate.length,
      migratedCount
    })

  } catch (error) {
    console.error('❌ Avatar migration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to migrate avatars',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}