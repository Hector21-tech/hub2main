import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST - Create test user and tenant data for authentication testing
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Setting up test authentication data...')

    // Create test tenant
    const testTenant = await prisma.tenant.upsert({
      where: { slug: 'scout-hub-demo' },
      update: {},
      create: {
        id: 'test-tenant-demo',
        slug: 'scout-hub-demo',
        name: 'Scout Hub Demo',
        description: 'Demo organization for testing authentication',
        logoUrl: null,
        settings: {},
      }
    })

    console.log('✅ Created test tenant:', testTenant)

    // Create test user in Supabase auth (this would normally be done via signup)
    // For now, we'll assume a test user exists with ID 'test-user-auth-demo'

    // Create user record in our database
    const testUser = await prisma.user.upsert({
      where: { id: 'test-user-auth-demo' },
      update: {},
      create: {
        id: 'test-user-auth-demo',
        email: 'demo@scouthub.com',
        firstName: 'Demo',
        lastName: 'User',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      }
    })

    console.log('✅ Created test user:', testUser)

    // Create tenant membership
    const membership = await prisma.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: testTenant.id,
          userId: testUser.id
        }
      },
      update: {},
      create: {
        tenantId: testTenant.id,
        userId: testUser.id,
        role: 'ADMIN'
      }
    })

    console.log('✅ Created membership:', membership)

    // Create some sample data for the test tenant
    const samplePlayer = await prisma.player.upsert({
      where: { id: 'demo-player-1' },
      update: {},
      create: {
        id: 'demo-player-1',
        tenantId: testTenant.id,
        firstName: 'Marcus',
        lastName: 'Lindberg',
        dateOfBirth: new Date('1995-03-15'),
        nationality: 'Sweden',
        position: 'CAM, LW',
        club: 'IFK Göteborg',
        height: 178,
        rating: 8.2,
        notes: 'Mycket teknisk spelare med exceptionella avslut. Mycket farlig i en-mot-en-situationer. Har en god näsa för mål.',
        tags: ['Technical', 'Clinical Finisher'],
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      }
    })

    console.log('✅ Created sample player:', samplePlayer)

    const sampleRequest = await prisma.request.upsert({
      where: { id: 'demo-request-1' },
      update: {},
      create: {
        id: 'demo-request-1',
        tenantId: testTenant.id,
        ownerId: testUser.id,
        title: 'Central Midfielder - Premier League',
        description: 'Looking for a creative central midfielder for Premier League club',
        club: 'Arsenal FC',
        country: 'England',
        league: 'Premier League',
        position: 'CAM',
        priority: 'HIGH',
        status: 'OPEN'
      }
    })

    console.log('✅ Created sample request:', sampleRequest)

    console.log('🎉 Test authentication data setup complete!')

    return NextResponse.json({
      success: true,
      message: 'Test authentication data setup complete',
      data: {
        tenant: testTenant,
        user: testUser,
        membership: membership,
        sampleData: {
          player: samplePlayer,
          request: sampleRequest
        }
      }
    })

  } catch (error) {
    console.error('❌ Error setting up test auth data:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to setup test authentication data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}