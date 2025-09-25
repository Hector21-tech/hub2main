import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUser } from '@/lib/supabase/server'

const prisma = new PrismaClient()

// POST - Create new organization
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, slug, description } = body

    // Validation
    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Validate slug format
    const slugPattern = /^[a-z0-9-]+$/
    if (!slugPattern.test(slug)) {
      return NextResponse.json(
        { success: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    // Check if slug is already taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug }
    })

    if (existingTenant) {
      return NextResponse.json(
        { success: false, error: 'This URL slug is already taken' },
        { status: 400 }
      )
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug: slug.trim(),
        name: name.trim(),
        description: description?.trim() || null,
        settings: {}
      }
    })

    // Ensure user exists in our database
    const dbUser = await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        email: user.email || '',
        firstName: user.user_metadata?.firstName || null,
        lastName: user.user_metadata?.lastName || null,
        avatarUrl: user.user_metadata?.avatarUrl || null
      }
    })

    // Create membership for the creator as OWNER
    const membership = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: 'OWNER'
      }
    })

    console.log('✅ Created organization:', {
      tenant: tenant.name,
      owner: user.email,
      slug: tenant.slug
    })

    return NextResponse.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        description: tenant.description,
        role: 'OWNER'
      },
      message: 'Organization created successfully'
    })

  } catch (error) {
    console.error('Error creating organization:', error)

    // More specific error messages
    let errorMessage = 'Failed to create organization'
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        errorMessage = 'Organization with this slug already exists'
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}