import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUser } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Create real tenant memberships for authenticated user
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('🔧 Setting up user data for:', user.id)

    // First, create tenants if they don't exist
    const tenants = [
      {
        id: 'test1-tenant-id',
        slug: 'test1',
        name: 'Test1',
        description: 'Test organization 1'
      },
      {
        id: 'elite-sports-id',
        slug: 'elite-sports-group',
        name: 'Elite Sports Group',
        description: 'Elite Sports Group scouting organization'
      }
    ]

    console.log('🏢 Creating tenants with slugs:', tenants.map(t => `${t.name} -> ${t.slug}`))

    for (const tenant of tenants) {
      // Upsert tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .upsert(tenant, { onConflict: 'id' })

      if (tenantError) {
        console.error('Error creating tenant:', tenant.name, tenantError)
      } else {
        console.log('✅ Tenant created/updated:', tenant.name)
      }
    }

    // Create user record if doesn't exist
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email || '',
        firstName: user.user_metadata?.firstName || user.user_metadata?.first_name || 'User',
        lastName: user.user_metadata?.lastName || user.user_metadata?.last_name || ''
      }, { onConflict: 'id' })

    if (userError) {
      console.error('Error creating user:', userError)
    } else {
      console.log('✅ User created/updated:', user.id)
    }

    // Create tenant memberships
    const memberships = tenants.map(tenant => ({
      id: `membership-${user.id}-${tenant.id}`,
      tenantId: tenant.id,
      userId: user.id,
      role: 'OWNER',
      joinedAt: new Date().toISOString()
    }))

    for (const membership of memberships) {
      const { error: membershipError } = await supabase
        .from('tenant_memberships')
        .upsert(membership, { onConflict: 'id' })

      if (membershipError) {
        console.error('Error creating membership:', membershipError)
      } else {
        console.log('✅ Membership created:', membership.tenantId)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User data setup complete',
      data: {
        userId: user.id,
        tenants: tenants.length,
        memberships: memberships.length
      }
    })

  } catch (error) {
    console.error('Error setting up user data:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to setup user data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}