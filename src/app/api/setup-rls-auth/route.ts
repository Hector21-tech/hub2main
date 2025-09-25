import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST - Update RLS policies to use auth.uid()
export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Setting up authenticated RLS policies...')

    // Drop existing basic policies first
    const dropPolicies = [
      'DROP POLICY IF EXISTS "tenant_isolation_policy" ON tenants',
      'DROP POLICY IF EXISTS "tenant_isolation_policy" ON users',
      'DROP POLICY IF EXISTS "tenant_isolation_policy" ON tenant_memberships',
      'DROP POLICY IF EXISTS "tenant_isolation_policy" ON players',
      'DROP POLICY IF EXISTS "tenant_isolation_policy" ON requests',
      'DROP POLICY IF EXISTS "tenant_isolation_policy" ON trials',
      'DROP POLICY IF EXISTS "tenant_isolation_policy" ON calendar_events'
    ]

    for (const policy of dropPolicies) {
      try {
        await prisma.$executeRawUnsafe(policy)
        console.log(`✅ Dropped policy: ${policy}`)
      } catch (error) {
        console.log(`ℹ️ Policy might not exist: ${policy}`)
      }
    }

    // Create authenticated RLS policies
    const authPolicies = [
      // Tenants - users can see tenants they're members of
      `CREATE POLICY "authenticated_tenants_policy" ON tenants
       FOR ALL USING (
         auth.uid()::text IN (
           SELECT "userId" FROM tenant_memberships
           WHERE "tenantId" = tenants.id
         )
       )`,

      // Users - users can see themselves and other users in same tenants
      `CREATE POLICY "authenticated_users_policy" ON users
       FOR ALL USING (
         auth.uid()::text = id OR
         auth.uid()::text IN (
           SELECT tm1."userId" FROM tenant_memberships tm1
           JOIN tenant_memberships tm2 ON tm1."tenantId" = tm2."tenantId"
           WHERE tm2."userId" = users.id
         )
       )`,

      // Tenant memberships - users can see memberships for tenants they belong to
      `CREATE POLICY "authenticated_memberships_policy" ON tenant_memberships
       FOR ALL USING (
         auth.uid()::text = "userId" OR
         auth.uid()::text IN (
           SELECT "userId" FROM tenant_memberships tm
           WHERE tm."tenantId" = tenant_memberships."tenantId"
         )
       )`,

      // Players - users can see players in tenants they're members of
      `CREATE POLICY "authenticated_players_policy" ON players
       FOR ALL USING (
         auth.uid()::text IN (
           SELECT "userId" FROM tenant_memberships
           WHERE "tenantId" = players."tenantId"
         )
       )`,

      // Requests - users can see requests in tenants they're members of
      `CREATE POLICY "authenticated_requests_policy" ON requests
       FOR ALL USING (
         auth.uid()::text IN (
           SELECT "userId" FROM tenant_memberships
           WHERE "tenantId" = requests."tenantId"
         )
       )`,

      // Trials - users can see trials in tenants they're members of
      `CREATE POLICY "authenticated_trials_policy" ON trials
       FOR ALL USING (
         auth.uid()::text IN (
           SELECT "userId" FROM tenant_memberships
           WHERE "tenantId" = trials."tenantId"
         )
       )`,

      // Calendar events - users can see events in tenants they're members of
      `CREATE POLICY "authenticated_events_policy" ON calendar_events
       FOR ALL USING (
         auth.uid()::text IN (
           SELECT "userId" FROM tenant_memberships
           WHERE "tenantId" = calendar_events."tenantId"
         )
       )`
    ]

    for (const policy of authPolicies) {
      try {
        await prisma.$executeRawUnsafe(policy)
        console.log(`✅ Created auth policy: ${policy.split('ON')[1]?.split('FOR')[0]?.trim()}`)
      } catch (error) {
        console.error(`❌ Failed to create policy: ${error}`)
      }
    }

    console.log('🎉 Authenticated RLS policies setup complete!')

    return NextResponse.json({
      success: true,
      message: 'Authenticated RLS policies setup complete',
      details: {
        droppedPolicies: dropPolicies.length,
        createdPolicies: authPolicies.length
      }
    })

  } catch (error) {
    console.error('❌ Error setting up authenticated RLS policies:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to setup authenticated RLS policies',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}