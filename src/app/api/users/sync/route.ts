import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUser } from '@/lib/supabase/server'

const prisma = new PrismaClient()

// POST - Sync user from Supabase auth to our database
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user to verify they can sync themselves
    const authUser = await getUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, email, firstName, lastName, avatarUrl } = body

    // Only allow users to sync themselves
    if (authUser.id !== id) {
      return NextResponse.json(
        { success: false, error: 'Can only sync your own user data' },
        { status: 403 }
      )
    }

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { id },
      update: {
        email: email || '',
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        avatarUrl: avatarUrl?.trim() || null
      },
      create: {
        id,
        email: email || '',
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        avatarUrl: avatarUrl?.trim() || null
      }
    })

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User synced successfully'
    })

  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync user',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}